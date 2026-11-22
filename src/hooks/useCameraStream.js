import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CAMERA_STATUSES,
  classifyCameraError,
  listVideoInputDevices,
  requestCameraStream,
  stopMediaStream,
} from '../services/cameraService.js';

/**
 * React hook managing the real browser camera MediaStream lifecycle.
 * Automatically starts the camera when native ARCore is not controlling it,
 * supports switching cameras / facing modes, and cleans up tracks on unmount.
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

  const attachStreamToVideo = useCallback((stream) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    videoEl.srcObject = stream;
    const playPromise = videoEl.play?.();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        // Ignore autoplay promise rejections when user interaction is pending
      });
    }
  }, []);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    stopMediaStream(activeStreamRef.current);
    activeStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus(CAMERA_STATUSES.IDLE);
  }, []);

  const startCamera = useCallback(
    async (overrides = {}) => {
      const targetFacing = overrides.facingMode ?? facingMode;
      const targetDeviceId =
        'deviceId' in overrides ? overrides.deviceId : activeDeviceId;

      const currentReqId = ++requestIdRef.current;
      setStatus(CAMERA_STATUSES.INITIALIZING);
      setErrorInfo(null);

      // Stop previous stream before requesting a new track
      stopMediaStream(activeStreamRef.current);
      activeStreamRef.current = null;

      try {
        const stream = await requestCameraStream({
          facingMode: targetFacing,
          deviceId: targetDeviceId,
        });

        if (currentReqId !== requestIdRef.current) {
          stopMediaStream(stream);
          return false;
        }

        activeStreamRef.current = stream;
        attachStreamToVideo(stream);
        setStatus(CAMERA_STATUSES.ACTIVE);

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
        return false;
      }
    },
    [facingMode, activeDeviceId, attachStreamToVideo]
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

  // Re-attach stream if video element mounts after stream became active
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
    canSwitchCamera: videoDevices.length > 1 || status === CAMERA_STATUSES.ACTIVE,
    startCamera,
    stopCamera,
    switchCamera,
  };
}
