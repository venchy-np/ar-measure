/**
 * Browser Camera Stream Service (WebRTC MediaDevices)
 *
 * Manages real camera constraints, fallback resolution across desktop webcams
 * and mobile rear cameras, error classification, and clean track teardown.
 */

export const CAMERA_STATUSES = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  ACTIVE: 'active',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
  IN_USE: 'in_use',
  UNSUPPORTED: 'unsupported',
  ERROR: 'error',
};

/**
 * Builds MediaStreamConstraints preferring the requested facing mode or deviceId.
 * @param {{ facingMode?: 'environment' | 'user', deviceId?: string | null }} [options]
 */
export function buildVideoConstraints(options = {}) {
  const { facingMode = 'environment', deviceId = null } = options;

  if (deviceId) {
    return {
      audio: false,
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    };
  }

  return {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };
}

/**
 * Maps browser MediaDevices DOMExceptions into clear UI error descriptors.
 * @param {any} error
 */
export function classifyCameraError(error) {
  const name = error?.name ?? '';
  const code = error?.code ?? '';

  if (code === 'unsupported' || name === 'NotSupportedError') {
    return {
      status: CAMERA_STATUSES.UNSUPPORTED,
      title: 'Camera API unavailable',
      detail: 'Browser camera requires HTTPS or localhost with MediaDevices support.',
    };
  }

  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    name === 'SecurityError'
  ) {
    return {
      status: CAMERA_STATUSES.DENIED,
      title: 'Camera permission required',
      detail: 'Allow camera access in your browser permissions and tap Retry Camera.',
    };
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      status: CAMERA_STATUSES.UNAVAILABLE,
      title: 'No camera detected',
      detail: 'Connect a webcam or open AR Measure on a device with a camera.',
    };
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      status: CAMERA_STATUSES.IN_USE,
      title: 'Camera is currently in use',
      detail: 'Close other applications using the camera, then tap Retry Camera.',
    };
  }

  return {
    status: CAMERA_STATUSES.ERROR,
    title: 'Unable to start camera',
    detail: error?.message || 'Check camera permissions and tap Retry Camera.',
  };
}

/**
 * Requests a live video MediaStream with graceful constraint fallback for desktop webcams.
 * @param {{ facingMode?: 'environment' | 'user', deviceId?: string | null }} [options]
 * @param {MediaDevices | null} [mediaDevicesArg]
 */
export async function requestCameraStream(options = {}, mediaDevicesArg) {
  const mediaDevices =
    mediaDevicesArg !== undefined
      ? mediaDevicesArg
      : typeof navigator !== 'undefined'
        ? navigator.mediaDevices
        : null;

  if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') {
    const err = new Error('Camera API is unavailable in this browser context.');
    err.name = 'NotSupportedError';
    throw err;
  }

  const primaryConstraints = buildVideoConstraints(options);

  try {
    return await mediaDevices.getUserMedia(primaryConstraints);
  } catch (primaryError) {
    const isConstraintError =
      primaryError?.name === 'OverconstrainedError' ||
      primaryError?.name === 'ConstraintNotSatisfiedError' ||
      (primaryError?.name === 'NotFoundError' && (options.facingMode || options.deviceId));

    if (!isConstraintError) {
      throw primaryError;
    }

    // Fallback to generic video stream (common on desktop/laptop webcams)
    return await mediaDevices.getUserMedia({ audio: false, video: true });
  }
}

/**
 * Enumerates available video input devices safely.
 * @param {MediaDevices | null} [mediaDevicesArg]
 * @returns {Promise<Array<{ deviceId: string, label: string }>>}
 */
export async function listVideoInputDevices(mediaDevicesArg) {
  const mediaDevices =
    mediaDevicesArg !== undefined
      ? mediaDevicesArg
      : typeof navigator !== 'undefined'
        ? navigator.mediaDevices
        : null;

  if (!mediaDevices || typeof mediaDevices.enumerateDevices !== 'function') {
    return [];
  }

  try {
    const devices = await mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
      }));
  } catch {
    return [];
  }
}

/**
 * Stops all active tracks on a MediaStream cleanly.
 * @param {MediaStream | null | undefined} stream
 */
export function stopMediaStream(stream) {
  if (!stream || typeof stream.getTracks !== 'function') return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Ignore already-stopped tracks
    }
  }
}
