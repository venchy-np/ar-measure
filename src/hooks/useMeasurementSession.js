import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  getEnvironmentCapabilities,
  loadPreferredUnit,
  savePreferredUnit,
} from '../services/arBridge.js';
import { useARBridge } from './useARBridge.js';
import {
  DEFAULT_WEB_DETECTED_PLANES,
  formatDistance,
  hitTestDetectedPlanes,
} from '../utils/measurementMath.js';
import {
  RETICLE_CENTER_POINT,
  createInitialMeasurementState,
  getContextualInstruction,
  getMeasurementStatusSummary,
  measurementReducer,
} from '../utils/measurementState.js';

function getBrowserReticleViewportTarget() {
  if (typeof document === 'undefined') {
    return { point: { ...RETICLE_CENTER_POINT, visible: true }, aspectRatio: 9 / 16 };
  }

  const viewportEl = document.querySelector('[data-testid="ar-viewport"]');
  const reticleEl = document.querySelector('[data-testid="aiming-reticle"]');
  const viewportRect = viewportEl?.getBoundingClientRect();
  const reticleRect = reticleEl?.getBoundingClientRect();

  if (
    !viewportRect ||
    viewportRect.width <= 0 ||
    viewportRect.height <= 0
  ) {
    return { point: { ...RETICLE_CENTER_POINT, visible: true }, aspectRatio: 9 / 16 };
  }

  const aspectRatio = viewportRect.width / viewportRect.height;

  if (!reticleRect || reticleRect.width <= 0 || reticleRect.height <= 0) {
    return { point: { ...RETICLE_CENTER_POINT, visible: true }, aspectRatio };
  }

  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const cx = reticleRect.left + reticleRect.width / 2;
  const cy = reticleRect.top + reticleRect.height / 2;
  return {
    point: {
      x: Number(clamp01((cx - viewportRect.left) / viewportRect.width).toFixed(4)),
      y: Number(clamp01((cy - viewportRect.top) / viewportRect.height).toFixed(4)),
      visible: true,
    },
    aspectRatio,
  };
}

/**
 * Dedicated React hook managing the multi-point chain measurement workflow,
 * unit conversion from underlying metres, and native ARCore bridge delegation via useARBridge.
 */
export function useMeasurementSession() {
  const [state, dispatch] = useReducer(measurementReducer, null, () => {
    const capabilities = getEnvironmentCapabilities();
    const savedUnit = loadPreferredUnit();
    return createInitialMeasurementState(savedUnit, capabilities);
  });

  const [isResetting, setIsResetting] = useState(false);
  const resetTimerRef = useRef(null);

  const handleNativeUpdate = useCallback((payload) => {
    if (payload && Object.keys(payload).length > 0) {
      dispatch({ type: 'RECEIVE_NATIVE_UPDATE', payload });
    }
  }, []);

  const arBridge = useARBridge({
    autoInitialize: true,
    onNativeUpdate: handleNativeUpdate,
  });

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const {
    isNativeAR: bridgeIsNativeAR,
    placeMeasurementPoint: bridgePlaceMeasurementPoint,
    completeMeasurement: bridgeCompleteMeasurement,
    setCameraQuality: bridgeSetCameraQuality,
    undoMeasurement: bridgeUndoMeasurement,
    resetMeasurement: bridgeResetMeasurement,
  } = arBridge;

  const setUnit = useCallback((nextUnit) => {
    savePreferredUnit(nextUnit);
    dispatch({ type: 'SET_UNIT', unit: nextUnit });
  }, []);

  const setZoom = useCallback((zoom) => {
    dispatch({ type: 'SET_ZOOM', zoom });
  }, []);

  const setQuality = useCallback(
    async (qualityMode, cameraResolution) => {
      dispatch({ type: 'SET_QUALITY', qualityMode, cameraResolution });
      if (bridgeIsNativeAR) {
        await bridgeSetCameraQuality(qualityMode);
      }
    },
    [bridgeIsNativeAR, bridgeSetCameraQuality]
  );

  const startNewMeasurement = useCallback(async () => {
    if (bridgeIsNativeAR) {
      await bridgeResetMeasurement();
    }
    dispatch({ type: 'START_NEW_MEASUREMENT' });
  }, [bridgeIsNativeAR, bridgeResetMeasurement]);

  const placePoint = useCallback(
    async (screenPoint) => {
      if (bridgeIsNativeAR) {
        const res = await bridgePlaceMeasurementPoint(screenPoint);
        return res?.result?.placed !== false;
      }

      let resolvedPoint = screenPoint;
      if (!resolvedPoint) {
        const { point, aspectRatio } = getBrowserReticleViewportTarget();
        const planeHit = hitTestDetectedPlanes(point, DEFAULT_WEB_DETECTED_PLANES, {
          aspectRatio,
        });
        resolvedPoint = {
          ...point,
          ...(planeHit
            ? {
                worldPoint: planeHit.worldPoint,
                hitType: planeHit.hitType,
                planeType: planeHit.planeType,
              }
            : {}),
        };
      }

      dispatch({
        type: 'PLACE_POINT',
        point: resolvedPoint,
      });
      return true;
    },
    [bridgeIsNativeAR, bridgePlaceMeasurementPoint]
  );

  const completeMeasurement = useCallback(async () => {
    if (bridgeIsNativeAR) {
      await bridgeCompleteMeasurement();
    }
    dispatch({ type: 'COMPLETE_MEASUREMENT' });
  }, [bridgeIsNativeAR, bridgeCompleteMeasurement]);

  const undoPoint = useCallback(async () => {
    dispatch({ type: 'UNDO_POINT' });
    if (bridgeIsNativeAR) {
      await bridgeUndoMeasurement();
    }
  }, [bridgeIsNativeAR, bridgeUndoMeasurement]);

  const resetMeasurement = useCallback(async () => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }
    setIsResetting(true);
    dispatch({ type: 'RESET' });

    await bridgeResetMeasurement();

    resetTimerRef.current = setTimeout(() => {
      setIsResetting(false);
    }, 320);
  }, [bridgeResetMeasurement]);

  const receiveNativeUpdate = useCallback((payload) => {
    dispatch({ type: 'RECEIVE_NATIVE_UPDATE', payload });
  }, []);

  const instruction = getContextualInstruction(state);
  const statusSummary = getMeasurementStatusSummary(state);
  const formattedDistance = formatDistance(state.distanceMeters, state.unit);
  const formattedLiveDistance =
    typeof state.liveDistanceMeters === 'number'
      ? formatDistance(state.liveDistanceMeters, state.unit)
      : null;

  const formattedSegments = state.segments.map((seg) => formatDistance(seg, state.unit));

  return {
    unit: state.unit,
    phase: state.phase,
    trackingStatus: state.trackingStatus,
    points: state.points,
    segments: state.segments,
    firstPoint: state.points[0] ?? null,
    secondPoint:
      state.points[state.points.length - 1] && state.points.length >= 2
        ? state.points[state.points.length - 1]
        : null,
    distanceMeters: state.distanceMeters,
    liveDistanceMeters: state.liveDistanceMeters,
    detectedPlanesCount: state.detectedPlanesCount,
    reticleHitType: state.reticleHitType,
    reticlePlaneType: state.reticlePlaneType,
    reticleWorldPoint: state.reticleWorldPoint,
    formattedDistance,
    formattedLiveDistance,
    formattedSegments,
    resetCount: state.resetCount,
    capabilities: state.capabilities,
    cameraResolution: state.cameraResolution,
    qualityMode: state.qualityMode,
    availableQualities: state.availableQualities,
    zoom: state.zoom,
    availableZooms: state.availableZooms,
    arBridge,
    instruction,
    statusSummary,
    isResetting,
    setUnit,
    setZoom,
    setQuality,
    startNewMeasurement,
    placePoint,
    completeMeasurement,
    undoPoint,
    resetMeasurement,
    receiveNativeUpdate,
  };
}
