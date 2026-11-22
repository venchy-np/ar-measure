package com.venchy.armeasure

import android.app.Activity
import android.hardware.display.DisplayManager
import android.opengl.GLES11Ext
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.Matrix
import android.view.Surface
import android.view.WindowManager
import com.google.ar.core.Anchor
import com.google.ar.core.Coordinates2d
import com.google.ar.core.DepthPoint
import com.google.ar.core.Frame
import com.google.ar.core.HitResult
import com.google.ar.core.InstantPlacementPoint
import com.google.ar.core.Plane
import com.google.ar.core.Point
import com.google.ar.core.Session
import com.google.ar.core.TrackingFailureReason
import com.google.ar.core.TrackingState
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.abs
import kotlin.math.sqrt

data class ScreenPoint(
    val x: Float,
    val y: Float,
    val visible: Boolean = true,
    val worldPoint: WorldPoint? = null,
    val hitType: String? = null,
    val planeType: String? = null
)
data class WorldPoint(val x: Float, val y: Float, val z: Float)

/**
 * OpenGL ES 2.0 renderer driving the native ARCore camera background texture
 * behind Capacitor's transparent WebView, performing ARCore ray-plane hit-tests
 * against detected Planes (with DepthPoint, Feature Point, and InstantPlacementPoint fallback),
 * managing a multi-point chain of 3D Anchors, computing consecutive segment distances in
 * metres, and projecting all anchor coordinates back into normalized screen space.
 */
class ARCameraRenderer(
    private val activity: Activity,
    private val sessionLock: Any,
    private val listener: Listener
) : GLSurfaceView.Renderer {

    interface Listener {
        fun onTrackingChanged(status: String, failureReason: String?)
        fun onPlaneDetectionUpdate(
            detectedPlanesCount: Int,
            reticleHitType: String?,
            reticlePlaneType: String?,
            reticleWorldPoint: WorldPoint?
        )
        fun onPointPlaced(
            pointIndex: Int,
            screenPoint: ScreenPoint,
            worldPoint: WorldPoint,
            hitType: String,
            planeType: String?
        )
        fun onChainUpdate(
            points: List<ScreenPoint>,
            segments: List<Double>,
            liveDistanceMeters: Double?,
            phase: String,
            detectedPlanesCount: Int,
            reticleHitType: String?,
            reticlePlaneType: String?,
            reticleWorldPoint: WorldPoint?
        )
        fun onTrackingError(code: String, message: String)
    }

    private data class AnchorRecord(
        val anchor: Anchor,
        val hitType: String,
        val planeType: String?
    )

    private data class PlaneHitResult(
        val hitResult: HitResult,
        val hitType: String,
        val planeType: String?,
        val worldPoint: WorldPoint
    )

    private data class ChainSnapshot(
        val projectedPoints: List<ScreenPoint>,
        val segments: List<Double>,
        val liveDistanceMeters: Double?,
        val reticleHitType: String?,
        val reticlePlaneType: String?,
        val reticleWorldPoint: WorldPoint?
    )

    private data class PendingHitTest(
        val normalizedX: Float,
        val normalizedY: Float,
        val generation: Long,
        val callback: (Boolean, String?) -> Unit
    )

    @Volatile
    private var session: Session? = null

    @Volatile
    private var viewportWidth = 1

    @Volatile
    private var viewportHeight = 1

    @Volatile
    private var viewportChanged = true

    private var cameraTextureId = -1
    private var cameraTextureAssigned = false
    private var texCoordsInitialized = false

    private var shaderProgram = 0
    private var positionAttrib = 0
    private var texCoordAttrib = 0
    private var textureUniform = 0

    private val quadCoords: FloatBuffer = createFloatBuffer(
        floatArrayOf(
            -1.0f, -1.0f,
            +1.0f, -1.0f,
            -1.0f, +1.0f,
            +1.0f, +1.0f
        )
    )
    private val quadTexCoords: FloatBuffer = createFloatBuffer(FloatArray(8))
    private val viewMatrix = FloatArray(16)
    private val projectionMatrix = FloatArray(16)
    private val viewProjMatrix = FloatArray(16)

    private val anchors = mutableListOf<AnchorRecord>()
    private var isMeasurementCompleted = false
    private var lastTrackingStatus: String = "scanning"
    private var lastFailureReason: String? = null
    private var lastProjectedPoints: List<ScreenPoint> = emptyList()
    private var lastLiveDistanceMeters: Double? = null
    private var lastEmittedPhase: String = "initial"
    private var lastDetectedPlanesCount: Int = -1
    private var lastReticleHitType: String? = null
    private var lastReticlePlaneType: String? = null
    private var lastReticleWorldPoint: WorldPoint? = null
    private var cameraInterruptionReported = false

    private val pendingHitTests = ConcurrentLinkedQueue<PendingHitTest>()
    private val hitTestInFlight = AtomicBoolean(false)
    private val resetGeneration = AtomicLong(0L)

    @Volatile
    private var resetRequested = false

    @Volatile
    private var completeRequested = false

    @Volatile
    private var undoRequested = false

    fun attachSession(arSession: Session?) {
        synchronized(sessionLock) {
            session = arSession
            cameraTextureAssigned = false
            viewportChanged = true
            cameraInterruptionReported = false
        }
    }

    fun getCurrentTrackingStatus(): Pair<String, String?> {
        return Pair(lastTrackingStatus, lastFailureReason)
    }

    fun invalidateProjections() {
        lastProjectedPoints = emptyList()
        cameraInterruptionReported = false
    }

    fun enqueueHitTest(
        normalizedX: Float,
        normalizedY: Float,
        callback: (Boolean, String?) -> Unit
    ): Boolean {
        if (!hitTestInFlight.compareAndSet(false, true)) {
            return false
        }
        val currentGen = resetGeneration.get()
        pendingHitTests.add(PendingHitTest(normalizedX, normalizedY, currentGen, callback))
        return true
    }

    fun requestComplete() {
        completeRequested = true
    }

    fun requestUndo() {
        undoRequested = true
        completeRequested = false
    }

    fun requestReset() {
        resetGeneration.incrementAndGet()
        resetRequested = true
        completeRequested = false
        undoRequested = false
        drainPendingHitTests("Measurement reset before point placement completed.")
    }

    fun drainPendingHitTests(reason: String) {
        while (true) {
            val request = pendingHitTests.poll() ?: break
            try {
                request.callback(false, reason)
            } catch (_: Throwable) {
            }
        }
        hitTestInFlight.set(false)
    }

    fun clearAnchorsImmediate() {
        for (record in anchors) {
            try {
                record.anchor.detach()
            } catch (_: Throwable) {
            }
        }
        anchors.clear()
        isMeasurementCompleted = false
        lastProjectedPoints = emptyList()
        lastLiveDistanceMeters = null
        lastEmittedPhase = "initial"
    }

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES20.glClearColor(0.0f, 0.0f, 0.0f, 1.0f)

        val textures = IntArray(1)
        GLES20.glGenTextures(1, textures, 0)
        cameraTextureId = textures[0]
        cameraTextureAssigned = false
        texCoordsInitialized = false

        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, cameraTextureId)
        GLES20.glTexParameteri(
            GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
            GLES20.GL_TEXTURE_WRAP_S,
            GLES20.GL_CLAMP_TO_EDGE
        )
        GLES20.glTexParameteri(
            GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
            GLES20.GL_TEXTURE_WRAP_T,
            GLES20.GL_CLAMP_TO_EDGE
        )
        GLES20.glTexParameteri(
            GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
            GLES20.GL_TEXTURE_MIN_FILTER,
            GLES20.GL_LINEAR
        )
        GLES20.glTexParameteri(
            GLES11Ext.GL_TEXTURE_EXTERNAL_OES,
            GLES20.GL_TEXTURE_MAG_FILTER,
            GLES20.GL_LINEAR
        )

        shaderProgram = buildCameraShaderProgram()
        positionAttrib = GLES20.glGetAttribLocation(shaderProgram, "a_Position")
        texCoordAttrib = GLES20.glGetAttribLocation(shaderProgram, "a_TexCoord")
        textureUniform = GLES20.glGetUniformLocation(shaderProgram, "u_Texture")
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        viewportWidth = width.coerceAtLeast(1)
        viewportHeight = height.coerceAtLeast(1)
        viewportChanged = true
        texCoordsInitialized = false
        lastProjectedPoints = emptyList()
        GLES20.glViewport(0, 0, viewportWidth, viewportHeight)
    }

    override fun onDrawFrame(gl: GL10?) {
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)

        val frame: Frame = synchronized(sessionLock) {
            val activeSession = session ?: return
            if (cameraTextureId != -1 && !cameraTextureAssigned) {
                activeSession.setCameraTextureName(cameraTextureId)
                cameraTextureAssigned = true
            }

            if (viewportChanged) {
                val rotation = getDisplayRotation()
                activeSession.setDisplayGeometry(rotation, viewportWidth, viewportHeight)
                viewportChanged = false
            }

            if (resetRequested) {
                clearAnchorsImmediate()
                resetRequested = false
            }

            if (undoRequested) {
                undoRequested = false
                if (anchors.isNotEmpty()) {
                    val removed = anchors.removeAt(anchors.lastIndex)
                    try {
                        removed.anchor.detach()
                    } catch (_: Throwable) {
                    }
                    isMeasurementCompleted = false
                    lastProjectedPoints = emptyList()
                    lastLiveDistanceMeters = null
                    if (anchors.isEmpty()) {
                        lastEmittedPhase = "initial"
                        val trackedCount = countTrackedPlanes()
                        listener.onChainUpdate(
                            emptyList(),
                            emptyList(),
                            null,
                            "initial",
                            trackedCount,
                            lastReticleHitType,
                            lastReticlePlaneType,
                            lastReticleWorldPoint
                        )
                    }
                }
            }

            if (completeRequested) {
                if (anchors.size >= 2) {
                    isMeasurementCompleted = true
                }
                completeRequested = false
            }

            try {
                val updated = activeSession.update()
                cameraInterruptionReported = false
                updated
            } catch (e: com.google.ar.core.exceptions.CameraNotAvailableException) {
                if (!cameraInterruptionReported) {
                    cameraInterruptionReported = true
                    lastTrackingStatus = "tracking_lost"
                    lastFailureReason = "CAMERA_INTERRUPTED"
                    listener.onTrackingChanged("tracking_lost", "CAMERA_INTERRUPTED")
                    listener.onTrackingError(
                        "camera_unavailable",
                        "Camera interrupted. Return to AR Measure to resume."
                    )
                }
                drainPendingHitTests("Camera unavailable.")
                return
            } catch (_: Throwable) {
                return
            }
        }

        drawCameraBackground(frame)
        emitTrackingStateIfChanged(frame)
        val trackedPlanesCount = countTrackedPlanes()
        processPendingHitTests(frame, trackedPlanesCount)
        emitAnchorProjections(frame, trackedPlanesCount)
    }

    private fun emitTrackingStateIfChanged(frame: Frame) {
        val camera = frame.camera
        val (status, reason) = when (camera.trackingState) {
            TrackingState.TRACKING -> Pair("tracking", null)
            TrackingState.PAUSED -> {
                val failure = camera.trackingFailureReason
                if (failure == TrackingFailureReason.NONE) {
                    Pair("scanning", null)
                } else {
                    Pair("tracking_lost", failure.name)
                }
            }
            TrackingState.STOPPED -> Pair("tracking_lost", "STOPPED")
        }

        if (status != lastTrackingStatus || reason != lastFailureReason) {
            lastTrackingStatus = status
            lastFailureReason = reason
            listener.onTrackingChanged(status, reason)
            if (status == "tracking_lost") {
                listener.onTrackingError(
                    "tracking_lost",
                    "Tracking lost. Move your device slowly."
                )
            }
        }
    }

    private fun processPendingHitTests(frame: Frame, trackedPlanesCount: Int) {
        while (true) {
            val request = pendingHitTests.poll() ?: break
            try {
                if (request.generation != resetGeneration.get()) {
                    request.callback(false, "Measurement was reset.")
                    continue
                }

                if (frame.camera.trackingState != TrackingState.TRACKING) {
                    listener.onTrackingError(
                        "tracking_lost",
                        "Tracking lost. Move your device slowly."
                    )
                    request.callback(false, "Tracking lost. Move your device slowly.")
                    continue
                }

                val tapX = request.normalizedX.coerceIn(0.02f, 0.98f) * viewportWidth
                val tapY = request.normalizedY.coerceIn(0.02f, 0.98f) * viewportHeight

                val planeHit = hitTestAgainstDetectedPlanes(frame, tapX, tapY)
                if (planeHit == null) {
                    listener.onTrackingError(
                        "invalid_point",
                        "Unable to detect a valid measurement point."
                    )
                    request.callback(false, "Unable to detect a valid measurement point.")
                    continue
                }

                // If previous measurement was completed, start a fresh chain
                if (isMeasurementCompleted) {
                    clearAnchorsImmediate()
                }

                // Prevent placing duplicate anchors at near-identical 3D coordinates (< 2mm)
                val lastRecord = anchors.lastOrNull()
                if (lastRecord != null && lastRecord.anchor.trackingState == TrackingState.TRACKING) {
                    val poseA = lastRecord.anchor.pose
                    val poseB = planeHit.hitResult.hitPose
                    val dx = (poseB.tx() - poseA.tx()).toDouble()
                    val dy = (poseB.ty() - poseA.ty()).toDouble()
                    val dz = (poseB.tz() - poseA.tz()).toDouble()
                    if (sqrt(dx * dx + dy * dy + dz * dz) < 0.002) {
                        listener.onTrackingError(
                            "invalid_point",
                            "Move slightly to place a distinct next point."
                        )
                        request.callback(false, "Move slightly to place a distinct next point.")
                        continue
                    }
                }

                val newAnchor = planeHit.hitResult.createAnchor()
                anchors.add(AnchorRecord(newAnchor, planeHit.hitType, planeHit.planeType))

                updateViewProjectionMatrices(frame)
                val snapshot = buildChainSnapshot(frame)
                lastProjectedPoints = snapshot.projectedPoints
                lastLiveDistanceMeters = snapshot.liveDistanceMeters
                lastEmittedPhase = "chain"
                lastDetectedPlanesCount = trackedPlanesCount
                lastReticleHitType = snapshot.reticleHitType
                lastReticlePlaneType = snapshot.reticlePlaneType
                lastReticleWorldPoint = snapshot.reticleWorldPoint

                val placedIndex = anchors.size
                val placedScreen = snapshot.projectedPoints.last()
                val placedWorld = anchorToWorldPoint(newAnchor)

                listener.onPointPlaced(
                    placedIndex,
                    placedScreen,
                    placedWorld,
                    planeHit.hitType,
                    planeHit.planeType
                )
                listener.onChainUpdate(
                    snapshot.projectedPoints,
                    snapshot.segments,
                    snapshot.liveDistanceMeters,
                    "chain",
                    trackedPlanesCount,
                    snapshot.reticleHitType,
                    snapshot.reticlePlaneType,
                    snapshot.reticleWorldPoint
                )
                request.callback(true, null)
            } finally {
                hitTestInFlight.set(false)
            }
        }
    }

    private fun emitAnchorProjections(frame: Frame, trackedPlanesCount: Int) {
        if (resetRequested) return
        if (frame.camera.trackingState != TrackingState.TRACKING) return

        if (anchors.isEmpty()) {
            val centerHit = hitTestAgainstDetectedPlanes(frame, viewportWidth * 0.5f, viewportHeight * 0.5f)
            val reticleChanged = trackedPlanesCount != lastDetectedPlanesCount ||
                centerHit?.hitType != lastReticleHitType ||
                centerHit?.planeType != lastReticlePlaneType ||
                hasWorldPointMovedSignificantly(centerHit?.worldPoint, lastReticleWorldPoint)

            if (reticleChanged) {
                lastDetectedPlanesCount = trackedPlanesCount
                lastReticleHitType = centerHit?.hitType
                lastReticlePlaneType = centerHit?.planeType
                lastReticleWorldPoint = centerHit?.worldPoint
                listener.onPlaneDetectionUpdate(
                    trackedPlanesCount,
                    centerHit?.hitType,
                    centerHit?.planeType,
                    centerHit?.worldPoint
                )
            }
            return
        }

        updateViewProjectionMatrices(frame)
        val snapshot = buildChainSnapshot(frame)
        val phase = if (isMeasurementCompleted && anchors.size >= 2) "completed" else "chain"

        val liveDistanceChanged = if (phase == "chain") {
            hasDistanceChangedSignificantly(snapshot.liveDistanceMeters, lastLiveDistanceMeters)
        } else {
            false
        }

        val pointsChanged = havePointsChangedSignificantly(snapshot.projectedPoints, lastProjectedPoints)
        val phaseChanged = phase != lastEmittedPhase
        val planeTelemetryChanged = trackedPlanesCount != lastDetectedPlanesCount ||
            snapshot.reticleHitType != lastReticleHitType ||
            snapshot.reticlePlaneType != lastReticlePlaneType

        if (pointsChanged || liveDistanceChanged || phaseChanged || planeTelemetryChanged) {
            lastProjectedPoints = snapshot.projectedPoints
            lastLiveDistanceMeters = if (phase == "completed") null else snapshot.liveDistanceMeters
            lastEmittedPhase = phase
            lastDetectedPlanesCount = trackedPlanesCount
            lastReticleHitType = snapshot.reticleHitType
            lastReticlePlaneType = snapshot.reticlePlaneType
            lastReticleWorldPoint = snapshot.reticleWorldPoint

            listener.onChainUpdate(
                snapshot.projectedPoints,
                snapshot.segments,
                if (phase == "completed") null else snapshot.liveDistanceMeters,
                phase,
                trackedPlanesCount,
                snapshot.reticleHitType,
                snapshot.reticlePlaneType,
                snapshot.reticleWorldPoint
            )
        }
    }

    private fun buildChainSnapshot(frame: Frame): ChainSnapshot {
        val projectedPoints = ArrayList<ScreenPoint>(anchors.size)
        val worldPoints = ArrayList<WorldPoint>(anchors.size)

        for (record in anchors) {
            val worldPt = anchorToWorldPoint(record.anchor)
            worldPoints.add(worldPt)
            if (record.anchor.trackingState == TrackingState.TRACKING) {
                val baseScreen = projectAnchorToScreen(record.anchor)
                projectedPoints.add(
                    baseScreen.copy(
                        worldPoint = worldPt,
                        hitType = record.hitType,
                        planeType = record.planeType
                    )
                )
            } else {
                projectedPoints.add(
                    ScreenPoint(
                        x = 0.5f,
                        y = 0.5f,
                        visible = false,
                        worldPoint = worldPt,
                        hitType = record.hitType,
                        planeType = record.planeType
                    )
                )
            }
        }

        val segments = ArrayList<Double>((worldPoints.size - 1).coerceAtLeast(0))
        for (i in 0 until worldPoints.size - 1) {
            segments.add(computeDistanceMeters(worldPoints[i], worldPoints[i + 1]))
        }

        val centerHit = if (!isMeasurementCompleted) {
            hitTestAgainstDetectedPlanes(frame, viewportWidth * 0.5f, viewportHeight * 0.5f)
        } else {
            null
        }

        val liveDist: Double? = if (!isMeasurementCompleted && worldPoints.isNotEmpty()) {
            centerHit?.worldPoint?.let { targetWorld ->
                computeDistanceMeters(worldPoints.last(), targetWorld)
            }
        } else {
            null
        }

        return ChainSnapshot(
            projectedPoints = projectedPoints,
            segments = segments,
            liveDistanceMeters = liveDist,
            reticleHitType = centerHit?.hitType,
            reticlePlaneType = centerHit?.planeType,
            reticleWorldPoint = centerHit?.worldPoint
        )
    }

    private fun countTrackedPlanes(): Int {
        val activeSession = synchronized(sessionLock) { session } ?: return 0
        return try {
            activeSession.getAllTrackables(Plane::class.java).count { plane ->
                plane.trackingState == TrackingState.TRACKING && plane.subsumedBy == null
            }
        } catch (_: Throwable) {
            0
        }
    }

    /**
     * Projects normalized/pixel screen coordinates into 3D world space by prioritizing
     * closest tracked ARCore Plane intersections (sorted by ray distance), then DepthPoint,
     * oriented Feature Point, and InstantPlacementPoint fallback.
     */
    private fun hitTestAgainstDetectedPlanes(
        frame: Frame,
        tapX: Float,
        tapY: Float
    ): PlaneHitResult? {
        val hits = frame.hitTest(tapX, tapY)

        // 1. Prioritize closest tracked Plane where hit pose lies inside the detected polygon
        val planeHit = hits
            .filter { hit ->
                val trackable = hit.trackable
                trackable is Plane &&
                    trackable.trackingState == TrackingState.TRACKING &&
                    trackable.subsumedBy == null &&
                    trackable.isPoseInPolygon(hit.hitPose)
            }
            .minByOrNull { it.distance }

        if (planeHit != null) {
            val plane = planeHit.trackable as Plane
            val planeType = when (plane.type) {
                Plane.Type.HORIZONTAL_UPWARD_FACING -> "horizontal"
                Plane.Type.HORIZONTAL_DOWNWARD_FACING -> "ceiling"
                Plane.Type.VERTICAL -> "vertical"
            }
            val pose = planeHit.hitPose
            return PlaneHitResult(
                hitResult = planeHit,
                hitType = "plane",
                planeType = planeType,
                worldPoint = WorldPoint(pose.tx(), pose.ty(), pose.tz())
            )
        }

        // 2. DepthPoint fallback
        val depthHit = hits
            .filter { hit ->
                val trackable = hit.trackable
                trackable is DepthPoint && trackable.trackingState == TrackingState.TRACKING
            }
            .minByOrNull { it.distance }
        if (depthHit != null) {
            val pose = depthHit.hitPose
            return PlaneHitResult(
                hitResult = depthHit,
                hitType = "depth",
                planeType = null,
                worldPoint = WorldPoint(pose.tx(), pose.ty(), pose.tz())
            )
        }

        // 3. Oriented feature Point fallback, then any tracked Point
        val featurePointHit = hits
            .filter { hit ->
                val trackable = hit.trackable
                trackable is Point &&
                    trackable.trackingState == TrackingState.TRACKING &&
                    trackable.orientationMode == Point.OrientationMode.ESTIMATED_SURFACE_NORMAL
            }
            .minByOrNull { it.distance }
            ?: hits
                .filter { hit ->
                    val trackable = hit.trackable
                    trackable is Point && trackable.trackingState == TrackingState.TRACKING
                }
                .minByOrNull { it.distance }
        if (featurePointHit != null) {
            val pose = featurePointHit.hitPose
            return PlaneHitResult(
                hitResult = featurePointHit,
                hitType = "point",
                planeType = null,
                worldPoint = WorldPoint(pose.tx(), pose.ty(), pose.tz())
            )
        }

        // 4. InstantPlacementPoint fallback
        val instantHit = hits.firstOrNull { hit ->
            val trackable = hit.trackable
            trackable is InstantPlacementPoint && trackable.trackingState == TrackingState.TRACKING
        } ?: try {
            frame.hitTestInstantPlacement(tapX, tapY, 1.5f).firstOrNull()
        } catch (_: Throwable) {
            null
        }

        return instantHit?.let { hit ->
            val pose = hit.hitPose
            PlaneHitResult(
                hitResult = hit,
                hitType = "instant",
                planeType = null,
                worldPoint = WorldPoint(pose.tx(), pose.ty(), pose.tz())
            )
        }
    }

    private fun hasWorldPointMovedSignificantly(next: WorldPoint?, prev: WorldPoint?): Boolean {
        if (next == null && prev == null) return false
        if (next == null || prev == null) return true
        return computeDistanceMeters(next, prev) >= 0.015
    }

    private fun havePointsChangedSignificantly(
        next: List<ScreenPoint>,
        prev: List<ScreenPoint>
    ): Boolean {
        if (next.size != prev.size) return true
        for (i in next.indices) {
            if (hasMovedSignificantly(next[i], prev[i])) return true
        }
        return false
    }

    private fun hasDistanceChangedSignificantly(next: Double?, prev: Double?): Boolean {
        if (next == null && prev == null) return false
        if (next == null || prev == null) return true
        return abs(next - prev) >= 0.002
    }

    private fun updateViewProjectionMatrices(frame: Frame) {
        frame.camera.getViewMatrix(viewMatrix, 0)
        frame.camera.getProjectionMatrix(projectionMatrix, 0, 0.1f, 100.0f)
        Matrix.multiplyMM(viewProjMatrix, 0, projectionMatrix, 0, viewMatrix, 0)
    }

    private fun projectAnchorToScreen(anchor: Anchor): ScreenPoint {
        val pose = anchor.pose
        val worldVec = floatArrayOf(pose.tx(), pose.ty(), pose.tz(), 1.0f)
        val clipVec = FloatArray(4)
        Matrix.multiplyMV(clipVec, 0, viewProjMatrix, 0, worldVec, 0)

        val w = clipVec[3]
        if (w <= 0.0001f) {
            return ScreenPoint(0.5f, 0.5f, visible = false)
        }

        val ndcX = clipVec[0] / w
        val ndcY = clipVec[1] / w

        val normX = (ndcX + 1.0f) * 0.5f
        val normY = (1.0f - ndcY) * 0.5f
        return ScreenPoint(normX, normY, visible = true)
    }

    private fun anchorToWorldPoint(anchor: Anchor): WorldPoint {
        val pose = anchor.pose
        return WorldPoint(pose.tx(), pose.ty(), pose.tz())
    }

    private fun computeDistanceMeters(a: WorldPoint, b: WorldPoint): Double {
        val dx = (b.x - a.x).toDouble()
        val dy = (b.y - a.y).toDouble()
        val dz = (b.z - a.z).toDouble()
        return sqrt(dx * dx + dy * dy + dz * dz)
    }

    private fun hasMovedSignificantly(next: ScreenPoint?, prev: ScreenPoint?): Boolean {
        if (next == null && prev == null) return false
        if (next == null || prev == null) return true
        if (next.visible != prev.visible) return true
        return abs(next.x - prev.x) > 0.002f || abs(next.y - prev.y) > 0.002f
    }

    private fun drawCameraBackground(frame: Frame) {
        if (!texCoordsInitialized || frame.hasDisplayGeometryChanged()) {
            frame.transformCoordinates2d(
                Coordinates2d.OPENGL_NORMALIZED_DEVICE_COORDINATES,
                quadCoords,
                Coordinates2d.TEXTURE_NORMALIZED,
                quadTexCoords
            )
            texCoordsInitialized = true
        }

        GLES20.glDisable(GLES20.GL_DEPTH_TEST)
        GLES20.glDepthMask(false)

        GLES20.glUseProgram(shaderProgram)
        GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
        GLES20.glBindTexture(GLES11Ext.GL_TEXTURE_EXTERNAL_OES, cameraTextureId)
        GLES20.glUniform1i(textureUniform, 0)

        quadCoords.position(0)
        quadTexCoords.position(0)

        GLES20.glVertexAttribPointer(positionAttrib, 2, GLES20.GL_FLOAT, false, 0, quadCoords)
        GLES20.glVertexAttribPointer(texCoordAttrib, 2, GLES20.GL_FLOAT, false, 0, quadTexCoords)
        GLES20.glEnableVertexAttribArray(positionAttrib)
        GLES20.glEnableVertexAttribArray(texCoordAttrib)

        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)

        GLES20.glDisableVertexAttribArray(positionAttrib)
        GLES20.glDisableVertexAttribArray(texCoordAttrib)
        GLES20.glDepthMask(true)
        GLES20.glEnable(GLES20.GL_DEPTH_TEST)
    }

    private fun getDisplayRotation(): Int {
        val displayManager = activity.getSystemService(DisplayManager::class.java)
        val display = displayManager?.getDisplay(android.view.Display.DEFAULT_DISPLAY)
        return display?.rotation ?: @Suppress("DEPRECATION")
            (activity.getSystemService(WindowManager::class.java)?.defaultDisplay?.rotation
                ?: Surface.ROTATION_0)
    }

    private fun buildCameraShaderProgram(): Int {
        val vertexShaderCode = """
            attribute vec4 a_Position;
            attribute vec2 a_TexCoord;
            varying vec2 v_TexCoord;
            void main() {
                gl_Position = a_Position;
                v_TexCoord = a_TexCoord;
            }
        """.trimIndent()

        val fragmentShaderCode = """
            #extension GL_OES_EGL_image_external : require
            precision mediump float;
            varying vec2 v_TexCoord;
            uniform samplerExternalOES u_Texture;
            void main() {
                gl_FragColor = texture2D(u_Texture, v_TexCoord);
            }
        """.trimIndent()

        val vertexShader = compileShader(GLES20.GL_VERTEX_SHADER, vertexShaderCode)
        val fragmentShader = compileShader(GLES20.GL_FRAGMENT_SHADER, fragmentShaderCode)
        val program = GLES20.glCreateProgram()
        GLES20.glAttachShader(program, vertexShader)
        GLES20.glAttachShader(program, fragmentShader)
        GLES20.glLinkProgram(program)
        GLES20.glDeleteShader(vertexShader)
        GLES20.glDeleteShader(fragmentShader)
        return program
    }

    private fun compileShader(type: Int, source: String): Int {
        val shader = GLES20.glCreateShader(type)
        GLES20.glShaderSource(shader, source)
        GLES20.glCompileShader(shader)
        return shader
    }

    private fun createFloatBuffer(values: FloatArray): FloatBuffer {
        val buffer = ByteBuffer.allocateDirect(values.size * 4)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
        buffer.put(values)
        buffer.position(0)
        return buffer
    }
}
