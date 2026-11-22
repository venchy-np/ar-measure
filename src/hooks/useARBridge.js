import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  getEnvironmentCapabilities,
  getTrackingStatus as queryNativeTrackingStatus,
  initializeAR as initializeNativeAR,
  placeMeasurementPoint as placeNativeMeasurementPoint,
  resetNativeMeasurement,
  stopAR as stopNativeAR,
  subscribeToARCoreUpdates,
} from '../services/arBridge.js';
import {
  arBridgeReducer,
  createInitialARBridgeState,
} from '../utils/arBridgeState.js';
import { getRectCenterWindowNormalized } from '../utils/measurementMath.js';
import { TRACKING_STATUSES } from '../utils/measurementState.js';

/**
 * Custom React hook abstracting communication with the native Capacitor `ARMeasurePlugin`.
 *
 * Provides reactive state for:
 * - `trackingStatus` ('scanning' | 'tracking' | 'tracking_lost' | 'invalid_point')
 * - `trackingFailureReason`
 * - `anchors` (`first`, `second` projected screen coords & `firstWorld`, `secondWorld` 3D poses)
 * - `firstPoint`, `secondPoint` (convenience aliases for projected screen coordinates)
 * - `distanceMeters` (real-world 3D Euclidean distance in metres)
 * - `isNativeAR`, `isInitialized`, `isSessionActive`, `capabilities`, `error`
 *
 * Exposes native action dispatchers:
 * - `initializeAR()`
 * - `refreshTrackingStatus()`
 * - `placeMeasurementPoint(screenPoint?)`
 * - `resetMeasurement()`
 * - `stopAR()`
 *
 * @param {object} [options]
 * @param {boolean} [options.autoInitialize=true] Automatically start/stop ARCore on mount/unmount when native plugin is present.
 * @param {(payload: object) => void} [options.onNativeUpdate] Optional listener invoked for every normalized ARCore bridge event.
 */
export function useARBridge({ autoInitialize = true, onNativeUpdate } = {}) {
  const [state, dispatch] = useReducer(arBridgeReducer, null, () =>
    createInitialARBridgeState(getEnvironmentCapabilities())
  );

  const onNativeUpdateRef = useRef(onNativeUpdate);
  onNativeUpdateRef.current = onNativeUpdate;

  const trackingStatusRef = useRef(state.trackingStatus);
  trackingStatusRef.current = state.trackingStatus;

  const isNativeAR = state.isNativeAR;

  const initializeAR = useCallback(async () => {
    if (!isNativeAR) {
      return {
        dispatchedToNative: false,
        initialized: false,
        trackingStatus: trackingStatusRef.current,
      };
    }

    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('native-ar-active');
    }

    try {
      const result = await initializeNativeAR();
      if (result?.dispatchedToNative) {
        dispatch({
          type: 'SESSION_INITIALIZED',
          payload: { trackingStatus: result.trackingStatus },
        });
        if (result.trackingStatus) {
          onNativeUpdateRef.current?.({ trackingStatus: result.trackingStatus });
        }
      }
      return result;
    } catch (err) {
      const errorInfo = {
        code: 'ar_init_failed',
        message: err?.message ?? 'Failed to initialize ARCore.',
      };
      dispatch({
        type: 'SET_ERROR',
        trackingStatus: TRACKING_STATUSES.TRACKING_LOST,
        error: errorInfo,
      });
      onNativeUpdateRef.current?.({
        trackingStatus: TRACKING_STATUSES.TRACKING_LOST,
        error: errorInfo,
      });
      return { dispatchedToNative: true, initialized: false, error: errorInfo };
    }
  }, [isNativeAR]);

  const refreshTrackingStatus = useCallback(async () => {
    const result = await queryNativeTrackingStatus();
    if (result?.dispatchedToNative) {
      const payload = {
        trackingStatus: result.trackingStatus,
        trackingFailureReason: result.trackingFailureReason ?? null,
        isSessionActive: Boolean(result.isSessionActive),
      };
      dispatch({ type: 'NATIVE_EVENT', payload });
      onNativeUpdateRef.current?.(payload);
    }
    return result;
  }, []);

  const placeMeasurementPoint = useCallback(
    async (screenPoint) => {
      if (!isNativeAR) {
        return { dispatchedToNative: false, result: null };
      }

      let targetCoords = screenPoint;
      if (!targetCoords) {
        const reticleRect =
          typeof document !== 'undefined'
            ? document.querySelector('[data-testid="aiming-reticle"]')?.getBoundingClientRect() ?? null
            : null;
        targetCoords = getRectCenterWindowNormalized(
          reticleRect,
          typeof window !== 'undefined' ? window.innerWidth : 0,
          typeof window !== 'undefined' ? window.innerHeight : 0
        );
      }

      try {
        const response = await placeNativeMeasurementPoint(targetCoords);
        if (response?.result?.placed === false) {
          const errorInfo = {
            code: 'invalid_point',
            message: response.result.reason ?? 'Unable to detect a valid measurement point.',
          };
          dispatch({
            type: 'SET_ERROR',
            trackingStatus: TRACKING_STATUSES.INVALID_POINT,
            error: errorInfo,
          });
          onNativeUpdateRef.current?.({
            trackingStatus: TRACKING_STATUSES.INVALID_POINT,
            error: errorInfo,
          });
        }
        return response;
      } catch (err) {
        const errorInfo = {
          code: 'invalid_point',
          message: err?.message ?? 'Unable to detect a valid measurement point.',
        };
        dispatch({
          type: 'SET_ERROR',
          trackingStatus: TRACKING_STATUSES.INVALID_POINT,
          error: errorInfo,
        });
        onNativeUpdateRef.current?.({
          trackingStatus: TRACKING_STATUSES.INVALID_POINT,
          error: errorInfo,
        });
        return { dispatchedToNative: true, result: { placed: false, reason: errorInfo.message } };
      }
    },
    [isNativeAR]
  );

  const resetMeasurement = useCallback(async () => {
    dispatch({ type: 'RESET_ANCHORS' });
    try {
      return await resetNativeMeasurement();
    } catch {
      return { dispatchedToNative: false };
    }
  }, []);

  const stopAR = useCallback(async () => {
    dispatch({ type: 'SESSION_STOPPED' });
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('native-ar-active');
    }
    if (!isNativeAR) {
      return { dispatchedToNative: false };
    }
    try {
      return await stopNativeAR();
    } catch {
      return { dispatchedToNative: false };
    }
  }, [isNativeAR]);

  useEffect(() => {
    const unsubscribe = subscribeToARCoreUpdates((payload) => {
      if (!payload || Object.keys(payload).length === 0) return;
      dispatch({ type: 'NATIVE_EVENT', payload });
      onNativeUpdateRef.current?.(payload);
    });

    if (autoInitialize && isNativeAR) {
      initializeAR();
    }

    return () => {
      unsubscribe();
      if (autoInitialize && isNativeAR) {
        stopAR();
      }
    };
  }, [autoInitialize, isNativeAR, initializeAR, stopAR]);

  return {
    capabilities: state.capabilities,
    isNativeAR: state.isNativeAR,
    isInitialized: state.isInitialized,
    isSessionActive: state.isSessionActive,
    trackingStatus: state.trackingStatus,
    trackingFailureReason: state.trackingFailureReason,
    error: state.error,
    anchors: state.anchors,
    firstPoint: state.anchors.first,
    secondPoint: state.anchors.second,
    distanceMeters: state.distanceMeters,
    initializeAR,
    refreshTrackingStatus,
    placeMeasurementPoint,
    resetMeasurement,
    stopAR,
  };
}
