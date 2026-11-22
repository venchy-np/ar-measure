import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAMERA_STATUSES,
  classifyCameraError,
  extractCameraTrackCapabilities,
  listVideoInputDevices,
  requestCameraStream,
  stopMediaStream,
} from '../services/cameraService.js';

/**
 * React hook managing the real browser camera MediaStream lifecycle,
 * real device-supported zoom capabilities, and resolution quality presets.
 */
export function useCameraStream({ enabled = true } = {}) {
  const videoRef = useRef(null);
  const activeStreamRef = useRef(null);
  const requestIdRef = useRef(0);

  const [status, setStatus] = useState(
    enabled ? CAMERA_STATUSES.INITIALIZING : CAMERA_STATUSES.IDLE
  );
  const [errorInfo, setErrorInfo] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [videoDevices, setVideoDevices] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(null);

  const [activeZoom, setActiveZoom] = useState('1x');
  const [availableZooms, setAvailableZooms] = useState(['1x']);
  const [supportsHardwareZoom, setSupportsHardwareZoom] = useState(false);
  const [activeQuality, setActiveQuality] = useState('1080p Full HD');
  const [availableQualities, setAvailableQualities] = useState(['720p HD', '1080p Full HD']);
  const [activeResolution, setActiveResolution] = useState('Detecting camera...');

  const attachStreamToVideo = useCallback((stream) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.srcObject = stream;
    const playPromise = videoEl.play?.();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore autoplay promise rejections
      });
    }
  }, []);

  const syncTrackCapabilities = useCallback((stream, requestedQuality) => {
    const [track] = stream?.getVideoTracks?.() ?? [];
    const caps = extractCameraTrackCapabilities(track);
    setAvailableZooms(caps.availableZooms);
    setSupportsHardwareZoom(caps.supportsHardwareZoom);
    setActiveZoom((prev) =>
      caps.availableZooms.includes(prev) ? prev : caps.activeZoom
    );
    setAvailableQualities(caps.availableQualities);
    setActiveResolution(caps.activeResolution);
    setActiveQuality(
      requestedQuality && caps.availableQualities.includes(requestedQuality)
        ? requestedQuality
        : caps.activeQuality
    );
  }, []);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    stopMediaStream(activeStreamRef.current);
    activeStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus(CAMERA_STATUSES.IDLE);
    setActiveResolution('Camera off');
  }, []);

  const startCamera = useCallback(
    async (overrides = {}) => {
      const targetFacing = overrides.facingMode ?? facingMode;
      const targetDeviceId =
        'deviceId' in overrides ? overrides.deviceId : activeDeviceId;
      const targetQuality = overrides.quality ?? activeQuality;

      const currentReqId = ++requestIdRef.current;
      setStatus(CAMERA_STATUSES.INITIALIZING);
      setErrorInfo(null);
      setActiveResolution('Detecting camera...');

      stopMediaStream(activeStreamRef.current);
      activeStreamRef.current = null;

      try {
        const stream = await requestCameraStream({
          facingMode: targetFacing,
          deviceId: targetDeviceId,
          quality: targetQuality,
        });

        if (currentReqId !== requestIdRef.current) {
          stopMediaStream(stream);
          return false;
        }

        activeStreamRef.current = stream;
        attachStreamToVideo(stream);
        setStatus(CAMERA_STATUSES.ACTIVE);
        syncTrackCapabilities(stream, targetQuality);

        const devices = await listVideoInputDevices();
        if (currentReqId === requestIdRef.current) {
          setVideoDevices(devices);
        }
        return true;
      } catch (err) {
        if (currentReqId !== requestIdRef.current) {
          return false;
        }
        const classified = classifyCameraError(err);
        setStatus(classified.status);
        setErrorInfo(classified);
        setActiveResolution(classified.title || 'Camera unavailable');
        return false;
      }
    },
    [facingMode, activeDeviceId, activeQuality, attachStreamToVideo, syncTrackCapabilities]
  );

  const applyZoom = useCallback(
    async (zoomStr) => {
      if (!availableZooms.includes(zoomStr)) return false;
      const stream = activeStreamRef.current;
      if (!stream) return false;
      const [track] = stream.getVideoTracks();
      if (!track || typeof track.applyConstraints !== 'function') return false;

      const caps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : null;
      if (!caps?.zoom) return false;

      const numericZoom = parseFloat(zoomStr);
      if (!Number.isFinite(numericZoom)) return false;

      try {
        await track.applyConstraints({ advanced: [{ zoom: numericZoom }] });
        setActiveZoom(zoomStr);
        return true;
      } catch {
        return false;
      }
    },
    [availableZooms]
  );

  const setQualityPreference = useCallback(
    async (qualityStr) => {
      if (!availableQualities.includes(qualityStr)) return false;
      setActiveQuality(qualityStr);
      return await startCamera({ quality: qualityStr });
    },
    [availableQualities, startCamera]
  );

  const switchCamera = useCallback(async () => {
    if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex(
        (d) => d.deviceId === activeDeviceId
      );
      const nextDevice =
        videoDevices[(currentIndex + 1) % videoDevices.length];
      setActiveDeviceId(nextDevice.deviceId);
      await startCamera({ deviceId: nextDevice.deviceId });
      return;
    }

    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setActiveDeviceId(null);
    await startCamera({ facingMode: nextFacing, deviceId: null });
  }, [videoDevices, activeDeviceId, facingMode, startCamera]);

  const setVideoElementRef = useCallback(
    (node) => {
      videoRef.current = node;
      if (node && activeStreamRef.current && node.srcObject !== activeStreamRef.current) {
        attachStreamToVideo(activeStreamRef.current);
      }
    },
    [attachStreamToVideo]
  );

  useEffect(() => {
    if (!enabled) {
      stopCamera();
      return undefined;
    }

    startCamera();

    return () => {
      requestIdRef.current += 1;
      stopMediaStream(activeStreamRef.current);
      activeStreamRef.current = null;
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    videoRef: setVideoElementRef,
    status,
    errorInfo,
    facingMode,
    videoDevices,
    activeZoom,
    availableZooms,
    supportsHardwareZoom,
    activeQuality,
    availableQualities,
    activeResolution,
    applyZoom,
    setQualityPreference,
    canSwitchCamera: videoDevices.length > 1 || status === CAMERA_STATUSES.ACTIVE,
    startCamera,
    stopCamera,
    switchCamera,
  };
}
