/**
 * Browser Camera Stream Service (WebRTC MediaDevices)
 *
 * Manages real camera constraints, fallback resolution across desktop webcams
 * and mobile rear cameras, hardware capability inspection (zoom/resolution),
 * error classification, and clean track teardown.
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

export const QUALITY_PRESETS = [
  { id: '480p SD', width: 640, height: 480 },
  { id: '720p HD', width: 1280, height: 720 },
  { id: '1080p Full HD', width: 1920, height: 1080 },
  { id: '4K Ultra HD', width: 3840, height: 2160 },
];

export const ZOOM_CANDIDATES = ['0.5x', '1x', '2x', '4x'];

/**
 * Formats actual pixel dimensions from MediaTrackSettings into a readable label.
 * @param {number | undefined} width
 * @param {number | undefined} height
 * @returns {string}
 */
export function formatResolutionLabel(width, height) {
  if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
    const tier =
      width >= 3840 || height >= 2160
        ? '4K UHD'
        : width >= 1920 || height >= 1080
          ? '1080p HD'
          : width >= 1280 || height >= 720
            ? '720p HD'
            : `${height}p`;
    return `${width}x${height} (${tier})`;
  }
  return 'Auto (Device Default)';
}

/**
 * Inspects a live MediaStreamTrack to derive ONLY device-supported zoom steps
 * and quality tiers without ever inventing or forcing unsupported hardware modes.
 * @param {MediaStreamTrack | null | undefined} track
 */
export function extractCameraTrackCapabilities(track) {
  const settings =
    track && typeof track.getSettings === 'function' ? track.getSettings() ?? {} : {};
  const caps =
    track && typeof track.getCapabilities === 'function' ? track.getCapabilities() ?? {} : {};

  // 1. Zoom capabilities: strictly filter to values inside hardware [min, max]
  let availableZooms = ['1x'];
  let activeZoom = '1x';
  if (
    caps.zoom &&
    typeof caps.zoom.min === 'number' &&
    typeof caps.zoom.max === 'number' &&
    caps.zoom.max > caps.zoom.min
  ) {
    const supported = ZOOM_CANDIDATES.filter((z) => {
      const val = parseFloat(z);
      return val >= caps.zoom.min && val <= caps.zoom.max;
    });
    if (supported.length > 0) {
      availableZooms = supported;
    }
    if (typeof settings.zoom === 'number') {
      const matched = availableZooms.find((z) => Math.abs(parseFloat(z) - settings.zoom) < 0.05);
      if (matched) activeZoom = matched;
    }
  }

  // 2. Quality capabilities: inspect max width/height reported by device camera
  const maxWidth =
    typeof caps.width?.max === 'number'
      ? caps.width.max
      : typeof settings.width === 'number'
        ? settings.width
        : null;
  const maxHeight =
    typeof caps.height?.max === 'number'
      ? caps.height.max
      : typeof settings.height === 'number'
        ? settings.height
        : null;

  let availableQualities = [];
  if (maxWidth !== null && maxHeight !== null) {
    for (const preset of QUALITY_PRESETS) {
      if (maxWidth >= preset.width && maxHeight >= preset.height) {
        availableQualities.push(preset.id);
      }
    }
    if (availableQualities.length === 0) {
      availableQualities = [`${maxWidth}x${maxHeight}`];
    }
  } else {
    availableQualities = ['720p HD', '1080p Full HD'];
  }

  const activeResolution = formatResolutionLabel(settings.width, settings.height);
  const activeQuality =
    typeof settings.width === 'number'
      ? settings.width >= 3840
        ? '4K Ultra HD'
        : settings.width >= 1920
          ? '1080p Full HD'
          : settings.width >= 1280
            ? '720p HD'
            : availableQualities[availableQualities.length - 1]
      : availableQualities[availableQualities.length - 1];

  return {
    availableZooms,
    activeZoom,
    supportsHardwareZoom: availableZooms.length > 1,
    availableQualities,
    activeQuality,
    activeResolution,
  };
}

/**
 * Builds MediaStreamConstraints preferring the requested facing mode, deviceId, and quality tier.
 * @param {{ facingMode?: 'environment' | 'user', deviceId?: string | null, quality?: string }} [options]
 */
export function buildVideoConstraints(options = {}) {
  const { facingMode = 'environment', deviceId = null, quality = '1080p Full HD' } = options;

  let widthIdeal = 1920;
  let heightIdeal = 1080;
  if (quality.includes('480')) {
    widthIdeal = 640;
    heightIdeal = 480;
  } else if (quality.includes('720')) {
    widthIdeal = 1280;
    heightIdeal = 720;
  } else if (quality.includes('4K') || quality.includes('3840')) {
    widthIdeal = 3840;
    heightIdeal = 2160;
  }

  if (deviceId) {
    return {
      audio: false,
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: widthIdeal },
        height: { ideal: heightIdeal },
      },
    };
  }

  return {
    audio: false,
    video: {
      facingMode: { ideal: facingMode },
      width: { ideal: widthIdeal },
      height: { ideal: heightIdeal },
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
 * @param {{ facingMode?: 'environment' | 'user', deviceId?: string | null, quality?: string }} [options]
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
