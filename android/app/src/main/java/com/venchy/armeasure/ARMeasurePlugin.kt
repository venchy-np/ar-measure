package com.venchy.armeasure

import android.Manifest
import android.graphics.Color
import android.opengl.GLSurfaceView
import android.view.View
import android.view.ViewGroup
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.google.ar.core.ArCoreApk
import com.google.ar.core.Config
import com.google.ar.core.Session
import com.google.ar.core.exceptions.CameraNotAvailableException
import com.google.ar.core.exceptions.UnavailableApkTooOldException
import com.google.ar.core.exceptions.UnavailableDeviceNotCompatibleException
import com.google.ar.core.exceptions.UnavailableSdkTooOldException
import com.google.ar.core.exceptions.UnavailableUserDeclinedInstallationException

/**
 * Custom Capacitor plugin connecting the React web UI to Google ARCore.
 *
 * Renders the ARCore rear camera stream on a GLSurfaceView placed behind the
 * transparent Capacitor WebView, performs 3D hit-tests on window-normalized tap/reticle
 * coordinates, creates ARCore Anchors, calculates real-world Euclidean distances in metres,
 * and emits projected screen coordinates and tracking events to React.
 */
@CapacitorPlugin(
    name = "ARMeasurePlugin",
    permissions = [
        Permission(
            alias = "camera",
            strings = [Manifest.permission.CAMERA]
        )
    ]
)
class ARMeasurePlugin : Plugin(), ARCameraRenderer.Listener {

    private val sessionLock = Any()
    private var arSession: Session? = null
    private var glSurfaceView: GLSurfaceView? = null
    private var renderer: ARCameraRenderer? = null
    private var userRequestedInstall = true
    private var awaitingInstallResume = false
    private var isSessionActive = false
    private var pendingInitializeCall: PluginCall? = null

    @PluginMethod
    fun initializeAR(call: PluginCall) {
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            pendingInitializeCall?.reject("Superseded by a newer AR initialization request.")
            pendingInitializeCall = call
            requestPermissionForAlias("camera", call, "cameraPermissionCallback")
            return
        }

        activity.runOnUiThread {
            startARSessionInternal(call)
        }
    }

    @PermissionCallback
    private fun cameraPermissionCallback(call: PluginCall) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            activity.runOnUiThread {
                startARSessionInternal(call)
            }
        } else {
            emitTrackingError(
                "camera_permission_denied",
                "Camera permission is required for ARCore measurement."
            )
            call.reject("Camera permission denied.")
        }
        pendingInitializeCall = null
    }

    @PluginMethod
    fun getTrackingStatus(call: PluginCall) {
        val current = renderer?.getCurrentTrackingStatus() ?: Pair("scanning", null)
        call.resolve(
            JSObject().apply {
                put("trackingStatus", current.first)
                put("trackingFailureReason", current.second)
                put("isSessionActive", isSessionActive)
            }
        )
    }

    @PluginMethod
    fun placeMeasurementPoint(call: PluginCall) {
        val activeRenderer = renderer
        if (!isSessionActive || activeRenderer == null) {
            val message = "ARCore session is not active."
            emitTrackingError("session_inactive", message)
            call.reject(message)
            return
        }

        val x = (call.getDouble("x") ?: 0.5).toFloat()
        val y = (call.getDouble("y") ?: 0.5).toFloat()

        val enqueued = activeRenderer.enqueueHitTest(x, y) { success, errorMessage ->
            if (success) {
                call.resolve(JSObject().apply { put("placed", true) })
            } else {
                call.resolve(
                    JSObject().apply {
                        put("placed", false)
                        put("reason", errorMessage ?: "Unable to detect a valid measurement point.")
                    }
                )
            }
        }
        if (!enqueued) {
            call.resolve(
                JSObject().apply {
                    put("placed", false)
                    put("reason", "Point placement already in progress.")
                }
            )
        }
    }

    @PluginMethod
    fun resetMeasurement(call: PluginCall) {
        renderer?.requestReset()
        call.resolve(JSObject().apply { put("reset", true) })
    }

    @PluginMethod
    fun stopAR(call: PluginCall) {
        activity.runOnUiThread {
            teardownARSession()
            call.resolve(JSObject().apply { put("stopped", true) })
        }
    }

    private fun startARSessionInternal(call: PluginCall?) {
        try {
            val availability = ArCoreApk.getInstance().checkAvailability(activity)
            if (availability.isUnsupported) {
                val msg = "ARCore is not supported on this device."
                emitTrackingError("arcore_unsupported", msg)
                call?.reject(msg)
                return
            }

            val installStatus = ArCoreApk.getInstance().requestInstall(activity, userRequestedInstall)
            if (installStatus == ArCoreApk.InstallStatus.INSTALL_REQUESTED) {
                userRequestedInstall = false
                awaitingInstallResume = true
                pendingInitializeCall = call
                return
            }

            awaitingInstallResume = false

            synchronized(sessionLock) {
                if (arSession == null) {
                    val createdSession = Session(activity)
                    val config = Config(createdSession).apply {
                        planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
                        updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
                        focusMode = Config.FocusMode.AUTO
                        if (createdSession.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
                            depthMode = Config.DepthMode.AUTOMATIC
                        }
                    }
                    createdSession.configure(config)
                    arSession = createdSession
                }
            }

            ensureSurfaceAttached()
            synchronized(sessionLock) {
                renderer?.attachSession(arSession)
                arSession?.resume()
            }
            glSurfaceView?.onResume()
            isSessionActive = true

            // Make Capacitor WebView transparent so the GLSurfaceView ARCore feed renders behind React UI
            bridge.webView.setBackgroundColor(Color.TRANSPARENT)
            bridge.webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

            emitTrackingStatus("scanning", null)
            call?.resolve(
                JSObject().apply {
                    put("initialized", true)
                    put("trackingStatus", "scanning")
                }
            )
            pendingInitializeCall = null
        } catch (e: UnavailableUserDeclinedInstallationException) {
            emitTrackingError("arcore_install_declined", "Google Play Services for AR installation was declined.")
            call?.reject("ARCore installation declined.", e)
            pendingInitializeCall = null
        } catch (e: UnavailableApkTooOldException) {
            emitTrackingError("arcore_apk_too_old", "Please update Google Play Services for AR.")
            call?.reject("ARCore APK too old.", e)
            pendingInitializeCall = null
        } catch (e: UnavailableSdkTooOldException) {
            emitTrackingError("arcore_sdk_too_old", "Please update this app to support ARCore.")
            call?.reject("ARCore SDK too old.", e)
            pendingInitializeCall = null
        } catch (e: UnavailableDeviceNotCompatibleException) {
            emitTrackingError("arcore_incompatible", "This device does not support ARCore.")
            call?.reject("Device incompatible with ARCore.", e)
            pendingInitializeCall = null
        } catch (e: CameraNotAvailableException) {
            emitTrackingError("camera_unavailable", "Camera not available. Please restart AR Measure.")
            call?.reject("Camera not available.", e)
            pendingInitializeCall = null
        } catch (t: Throwable) {
            emitTrackingError("ar_init_failed", t.message ?: "Failed to initialize ARCore.")
            call?.reject("Failed to initialize ARCore.", Exception(t))
            pendingInitializeCall = null
        }
    }

    private fun ensureSurfaceAttached() {
        if (glSurfaceView != null) return

        val parent = bridge.webView.parent as? ViewGroup ?: return
        val newRenderer = ARCameraRenderer(activity, sessionLock, this)
        val surface = GLSurfaceView(activity).apply {
            preserveEGLContextOnPause = true
            setEGLContextClientVersion(2)
            setEGLConfigChooser(8, 8, 8, 8, 16, 0)
            setRenderer(newRenderer)
            renderMode = GLSurfaceView.RENDERMODE_CONTINUOUSLY
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // Insert behind Capacitor WebView so HTML/React overlays float above ARCore camera feed
        parent.addView(surface, 0)
        renderer = newRenderer
        glSurfaceView = surface
    }

    private fun teardownARSession() {
        isSessionActive = false
        awaitingInstallResume = false
        pendingInitializeCall?.reject("ARCore session stopped.")
        pendingInitializeCall = null
        glSurfaceView?.onPause()

        synchronized(sessionLock) {
            try {
                renderer?.drainPendingHitTests("ARCore session stopped.")
                renderer?.attachSession(null)
                renderer?.clearAnchorsImmediate()
                arSession?.pause()
                arSession?.close()
            } catch (_: Throwable) {
            }
            arSession = null
        }

        glSurfaceView?.let { surface ->
            (surface.parent as? ViewGroup)?.removeView(surface)
        }
        glSurfaceView = null
        renderer = null

        bridge.webView.setBackgroundColor(Color.parseColor("#080A0D"))
    }

    override fun handleOnResume() {
        super.handleOnResume()
        if (awaitingInstallResume && getPermissionState("camera") == PermissionState.GRANTED) {
            activity.runOnUiThread {
                startARSessionInternal(pendingInitializeCall)
            }
            return
        }

        if (isSessionActive) {
            if (getPermissionState("camera") != PermissionState.GRANTED) {
                emitTrackingStatus("tracking_lost", "CAMERA_PERMISSION_REVOKED")
                emitTrackingError(
                    "camera_permission_denied",
                    "Camera permission is required for ARCore measurement."
                )
                return
            }
            synchronized(sessionLock) {
                try {
                    arSession?.resume()
                    renderer?.invalidateProjections()
                } catch (e: CameraNotAvailableException) {
                    emitTrackingStatus("tracking_lost", "CAMERA_UNAVAILABLE")
                    emitTrackingError("camera_unavailable", "Camera not available on resume.")
                    return
                } catch (e: SecurityException) {
                    emitTrackingStatus("tracking_lost", "CAMERA_PERMISSION_REVOKED")
                    emitTrackingError(
                        "camera_permission_denied",
                        "Camera permission is required for ARCore measurement."
                    )
                    return
                } catch (t: Throwable) {
                    emitTrackingStatus("tracking_lost", "RESUME_FAILED")
                    emitTrackingError("camera_unavailable", t.message ?: "Unable to resume ARCore.")
                    return
                }
            }
            glSurfaceView?.onResume()
        }
    }

    override fun handleOnPause() {
        super.handleOnPause()
        if (isSessionActive) {
            glSurfaceView?.onPause()
            synchronized(sessionLock) {
                try {
                    arSession?.pause()
                } catch (_: Throwable) {
                }
            }
        }
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        teardownARSession()
    }

    // --- ARCameraRenderer.Listener callbacks ---

    override fun onTrackingChanged(status: String, failureReason: String?) {
        emitTrackingStatus(status, failureReason)
    }

    override fun onPointPlaced(pointIndex: Int, screenPoint: ScreenPoint, worldPoint: WorldPoint) {
        val payload = JSObject().apply {
            put("pointIndex", pointIndex)
            put("screenPoint", screenPointToJS(screenPoint))
            put("worldPoint", worldPointToJS(worldPoint))
        }
        notifyListeners("measurementPointPlaced", payload)
    }

    override fun onMeasurementCompleted(
        firstScreen: ScreenPoint,
        secondScreen: ScreenPoint,
        firstWorld: WorldPoint,
        secondWorld: WorldPoint,
        distanceMeters: Double
    ) {
        val payload = JSObject().apply {
            put("trackingStatus", "tracking")
            put("firstPoint", screenPointToJS(firstScreen))
            put("secondPoint", screenPointToJS(secondScreen))
            put("firstWorldPoint", worldPointToJS(firstWorld))
            put("secondWorldPoint", worldPointToJS(secondWorld))
            put("distanceMeters", distanceMeters)
        }
        notifyListeners("measurementCompleted", payload)
    }

    override fun onProjectionUpdate(
        firstScreen: ScreenPoint?,
        secondScreen: ScreenPoint?,
        distanceMeters: Double?
    ) {
        if (firstScreen != null && secondScreen != null && distanceMeters != null) {
            notifyListeners(
                "measurementCompleted",
                JSObject().apply {
                    put("trackingStatus", "tracking")
                    put("firstPoint", screenPointToJS(firstScreen))
                    put("secondPoint", screenPointToJS(secondScreen))
                    put("distanceMeters", distanceMeters)
                }
            )
        } else if (firstScreen != null) {
            notifyListeners(
                "measurementPointPlaced",
                JSObject().apply {
                    put("pointIndex", 1)
                    put("screenPoint", screenPointToJS(firstScreen))
                    if (distanceMeters != null) {
                        put("liveDistanceMeters", distanceMeters)
                    }
                }
            )
        }
    }

    override fun onTrackingError(code: String, message: String) {
        emitTrackingError(code, message)
    }

    private fun emitTrackingStatus(status: String, failureReason: String?) {
        notifyListeners(
            "trackingStatusChanged",
            JSObject().apply {
                put("trackingStatus", status)
                put("trackingFailureReason", failureReason)
            }
        )
    }

    private fun emitTrackingError(code: String, message: String) {
        notifyListeners(
            "trackingError",
            JSObject().apply {
                put("code", code)
                put("message", message)
            }
        )
    }

    private fun screenPointToJS(point: ScreenPoint): JSObject {
        return JSObject().apply {
            put("x", point.x.toDouble())
            put("y", point.y.toDouble())
            put("visible", point.visible)
        }
    }

    private fun worldPointToJS(point: WorldPoint): JSObject {
        return JSObject().apply {
            put("x", point.x.toDouble())
            put("y", point.y.toDouble())
            put("z", point.z.toDouble())
        }
    }
}
