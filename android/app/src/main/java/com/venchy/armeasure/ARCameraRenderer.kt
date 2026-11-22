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

data class ScreenPoint(val x: Float, val y: Float, val visible: Boolean = true)
data class WorldPoint(val x: Float, val y: Float, val z: Float)

/**
 * OpenGL ES 2.0 renderer driving the native ARCore camera background texture
 * behind Capacitor's transparent WebView, performing ARCore hit-tests,
 * managing 3D Anchors, computing Euclidean 3D distance in metres,
 * and projecting anchor coordinates back into normalized window screen space (0..1).
 */
class ARCameraRenderer(
    private val activity: Activity,
    private val sessionLock: Any,
    private val listener: Listener
) : GLSurfaceView.Renderer {

    interface Listener {
        fun onTrackingChanged(status: String, failureReason: String?)
        fun onPointPlaced(pointIndex: Int, screenPoint: ScreenPoint, worldPoint: WorldPoint)
        fun onMeasurementCompleted(
            firstScreen: ScreenPoint,
            secondScreen: ScreenPoint,
            firstWorld: WorldPoint,
            secondWorld: WorldPoint,
            distanceMeters: Double
        )
        fun onProjectionUpdate(
            firstScreen: ScreenPoint?,
            secondScreen: ScreenPoint?,
            distanceMeters: Double?
        )
        fun onTrackingError(code: String, message: String)
    }

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

    private var firstAnchor: Anchor? = null
    private var secondAnchor: Anchor? = null
    private var lastTrackingStatus: String = "scanning"
    private var lastFailureReason: String? = null
    private var lastProjectedFirst: ScreenPoint? = null
    private var lastProjectedSecond: ScreenPoint? = null
    private var lastLiveDistanceMeters: Double? = null
    private var cameraInterruptionReported = false

    private val pendingHitTests = ConcurrentLinkedQueue<PendingHitTest>()
    private val hitTestInFlight = AtomicBoolean(false)
    private val resetGeneration = AtomicLong(0L)

    @Volatile
    private var resetRequested = false

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
        lastProjectedFirst = null
        lastProjectedSecond = null
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

    fun requestReset() {
        resetGeneration.incrementAndGet()
        resetRequested = true
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
        try {
            firstAnchor?.detach()
        } catch (_: Throwable) {
        }
        try {
            secondAnchor?.detach()
        } catch (_: Throwable) {
        }
        firstAnchor = null
        secondAnchor = null
        lastProjectedFirst = null
        lastProjectedSecond = null
        lastLiveDistanceMeters = null
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
        lastProjectedFirst = null
        lastProjectedSecond = null
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
        processPendingHitTests(frame)
        emitAnchorProjections(frame)
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

    private fun processPendingHitTests(frame: Frame) {
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

                val hitResult = frame.hitTest(tapX, tapY).firstOrNull { hit ->
                    val trackable = hit.trackable
                    when (trackable) {
                        is Plane -> {
                            trackable.trackingState == TrackingState.TRACKING &&
                                trackable.subsumedBy == null &&
                                trackable.isPoseInPolygon(hit.hitPose)
                        }
                        is Point -> {
                            trackable.trackingState == TrackingState.TRACKING &&
                                trackable.orientationMode == Point.OrientationMode.ESTIMATED_SURFACE_NORMAL
                        }
                        is DepthPoint -> trackable.trackingState == TrackingState.TRACKING
                        else -> false
                    }
                }

                if (hitResult == null) {
                    listener.onTrackingError(
                        "invalid_point",
                        "Unable to detect a valid measurement point."
                    )
                    request.callback(false, "Unable to detect a valid measurement point.")
                    continue
                }

                // Prevent placing duplicate anchors at near-identical 3D coordinates (< 2mm)
                val existingFirst = firstAnchor
                if (existingFirst != null && secondAnchor == null) {
                    val poseA = existingFirst.pose
                    val poseB = hitResult.hitPose
                    val dx = (poseB.tx() - poseA.tx()).toDouble()
                    val dy = (poseB.ty() - poseA.ty()).toDouble()
                    val dz = (poseB.tz() - poseA.tz()).toDouble()
                    if (sqrt(dx * dx + dy * dy + dz * dz) < 0.002) {
                        listener.onTrackingError(
                            "invalid_point",
                            "Move slightly to place a distinct second point."
                        )
                        request.callback(false, "Move slightly to place a distinct second point.")
                        continue
                    }
                }

                val newAnchor = hitResult.createAnchor()

                // If both points already existed, reset before placing point 1
                if (firstAnchor != null && secondAnchor != null) {
                    clearAnchorsImmediate()
                }

                updateViewProjectionMatrices(frame)

                if (firstAnchor == null) {
                    firstAnchor = newAnchor
                    val world = anchorToWorldPoint(newAnchor)
                    val screen = projectAnchorToScreen(newAnchor)
                    lastProjectedFirst = screen
                    listener.onPointPlaced(1, screen, world)
                    request.callback(true, null)
                } else {
                    secondAnchor = newAnchor
                    val anchor1 = firstAnchor!!
                    val world1 = anchorToWorldPoint(anchor1)
                    val world2 = anchorToWorldPoint(newAnchor)
                    val screen1 = projectAnchorToScreen(anchor1)
                    val screen2 = projectAnchorToScreen(newAnchor)
                    val distanceMeters = computeDistanceMeters(world1, world2)

                    lastProjectedFirst = screen1
                    lastProjectedSecond = screen2

                    listener.onPointPlaced(2, screen2, world2)
                    listener.onMeasurementCompleted(
                        screen1,
                        screen2,
                        world1,
                        world2,
                        distanceMeters
                    )
                    request.callback(true, null)
                }
            } finally {
                hitTestInFlight.set(false)
            }
        }
    }

    private fun emitAnchorProjections(frame: Frame) {
        val a1 = firstAnchor ?: return
        if (resetRequested) return
        if (frame.camera.trackingState != TrackingState.TRACKING) return
        if (a1.trackingState != TrackingState.TRACKING) return
        val a2 = secondAnchor
        if (a2 != null && a2.trackingState != TrackingState.TRACKING) return

        updateViewProjectionMatrices(frame)
        val p1 = projectAnchorToScreen(a1)
        val p2 = a2?.let { projectAnchorToScreen(it) }
        val world1 = anchorToWorldPoint(a1)

        val distanceMeters: Double? = if (a2 != null) {
            computeDistanceMeters(world1, anchorToWorldPoint(a2))
        } else {
            val centerHit = findValidHit(frame, viewportWidth * 0.5f, viewportHeight * 0.5f)
            centerHit?.hitPose?.let { pose ->
                computeDistanceMeters(world1, WorldPoint(pose.tx(), pose.ty(), pose.tz()))
            }
        }

        val distanceChanged = if (a2 == null) {
            hasDistanceChangedSignificantly(distanceMeters, lastLiveDistanceMeters)
        } else {
            false
        }

        if (hasMovedSignificantly(p1, lastProjectedFirst) ||
            hasMovedSignificantly(p2, lastProjectedSecond) ||
            distanceChanged
        ) {
            lastProjectedFirst = p1
            lastProjectedSecond = p2
            if (a2 == null) {
                lastLiveDistanceMeters = distanceMeters
            }
            listener.onProjectionUpdate(p1, p2, distanceMeters)
        }
    }

    private fun findValidHit(frame: Frame, tapX: Float, tapY: Float): com.google.ar.core.HitResult? {
        return frame.hitTest(tapX, tapY).firstOrNull { hit ->
            val trackable = hit.trackable
            when (trackable) {
                is Plane -> {
                    trackable.trackingState == TrackingState.TRACKING &&
                        trackable.subsumedBy == null &&
                        trackable.isPoseInPolygon(hit.hitPose)
                }
                is Point -> {
                    trackable.trackingState == TrackingState.TRACKING &&
                        trackable.orientationMode == Point.OrientationMode.ESTIMATED_SURFACE_NORMAL
                }
                is DepthPoint -> trackable.trackingState == TrackingState.TRACKING
                else -> false
            }
        }
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
