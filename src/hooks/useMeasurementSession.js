import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  getEnvironmentCapabilities,
  loadPreferredUnit,
  savePreferredUnit,
} from '../services/arBridge.js';
import { useARBridge } from './useARBridge.js';
import { formatDistance } from '../utils/measurementMath.js';
import {
  RETICLE_CENTER_POINT,
  createInitialMeasurementState,
  getContextualInstruction,
  getMeasurementStatusSummary,
  measurementReducer,
} from '../utils/measurementState.js';

/**
 * Dedicated React hook managing the two-point measurement workflow,
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
    resetMeasurement: bridgeResetMeasurement,
  } = arBridge;

  const setUnit = useCallback((nextUnit) => {
    savePreferredUnit(nextUnit);
    dispatch({ type: 'SET_UNIT', unit: nextUnit });
  }, []);

  const startNewMeasurement = useCallback(async () => {
    if (bridgeIsNativeAR) {
      await bridgeResetMeasurement();
    }
    dispatch({ type: 'START_NEW_MEASUREMENT' });
  }, [bridgeIsNativeAR, bridgeResetMeasurement]);

  const placePoint = useCallback(
    async (screenPoint) => {
      if (bridgeIsNativeAR) {
        await bridgePlaceMeasurementPoint(screenPoint);
        return;
      }

      const targetCoords = screenPoint ?? RETICLE_CENTER_POINT;
      dispatch({
        type: 'PLACE_POINT',
        point: targetCoords,
      });
    },
    [bridgeIsNativeAR, bridgePlaceMeasurementPoint]
  );

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

  return {
    unit: state.unit,
    phase: state.phase,
    trackingStatus: state.trackingStatus,
    firstPoint: state.firstPoint,
    secondPoint: state.secondPoint,
    distanceMeters: state.distanceMeters,
    liveDistanceMeters: state.liveDistanceMeters,
    formattedDistance,
    formattedLiveDistance,
    resetCount: state.resetCount,
    capabilities: state.capabilities,
    arBridge,
    instruction,
    statusSummary,
    isResetting,
    setUnit,
    startNewMeasurement,
    placePoint,
    resetMeasurement,
    receiveNativeUpdate,
  };
}
