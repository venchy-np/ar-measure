/**
 * Capacitor / Native ARCore Bridge Abstraction (ARMeasurePlugin)
 *
 * Connects the React UI and measurement state hook to the custom Kotlin
 * `ARMeasurePlugin` on Android via Capacitor 8 (`@capacitor/core`).
 *
 * Methods exposed to native ARCore:
 * - initializeAR()
 * - getTrackingStatus()
 * - placeMeasurementPoint({ x, y })
 * - resetMeasurement()
 * - stopAR()
 *
 * Native events subscribed:
 * - trackingStatusChanged
 * - measurementPointPlaced
 * - measurementCompleted
 * - trackingError
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  DEFAULT_UNIT,
  MEASUREMENT_UNITS,
  isValidUnit,
} from '../utils/measurementMath.js';

export { DEFAULT_UNIT, MEASUREMENT_UNITS, isValidUnit };

export const ARCORE_UPDATE_EVENT = 'arcore:measurement';
export const PLUGIN_NAME = 'ARMeasurePlugin';
const STORAGE_KEY_UNIT = 'ar_measure_preferred_unit';

const NativeARMeasurePlugin = registerPlugin(PLUGIN_NAME);

/**
 * Reads persisted unit preference safely across SSR/browser/WebView contexts.
 * @param {Storage | null} [storage]
 * @returns {string}
 */
export function loadPreferredUnit(storage) {
  try {
    const targetStorage =
      storage !== undefined ? storage : typeof window !== 'undefined' ? window.localStorage : null;
    if (!targetStorage) return DEFAULT_UNIT;
    const saved = targetStorage.getItem(STORAGE_KEY_UNIT);
    return saved && isValidUnit(saved) ? saved : DEFAULT_UNIT;
  } catch {
    return DEFAULT_UNIT;
  }
}

/**
 * Persists unit preference safely.
 * @param {string} unit
 * @param {Storage | null} [storage]
 * @returns {boolean}
 */
export function savePreferredUnit(unit, storage) {
  if (!isValidUnit(unit)) return false;
  try {
    const targetStorage =
      storage !== undefined ? storage : typeof window !== 'undefined' ? window.localStorage : null;
    if (!targetStorage) return false;
    targetStorage.setItem(STORAGE_KEY_UNIT, unit);
    return true;
  } catch {
    return false;
  }
}

/**
 * Inspects runtime capabilities for Capacitor and ARMeasurePlugin.
 * Supports dependency injection via `globalObj` for deterministic Node unit testing.
 * @param {any} [globalObj]
 */
export function getEnvironmentCapabilities(globalObj) {
  if (globalObj !== undefined) {
    const capacitor = globalObj?.Capacitor ?? null;
    const isCapacitorNative = Boolean(
      capacitor &&
        (typeof capacitor.isNativePlatform === 'function'
          ? capacitor.isNativePlatform()
          : capacitor.isNative === true)
    );
    const platform =
      typeof capacitor?.getPlatform === 'function'
        ? capacitor.getPlatform()
        : isCapacitorNative
          ? 'android'
          : 'web';
    const hasARCorePlugin = Boolean(
      capacitor?.Plugins?.[PLUGIN_NAME] ??
        (typeof capacitor?.isPluginAvailable === 'function' &&
          capacitor.isPluginAvailable(PLUGIN_NAME))
    );

    return {
      platform,
      isCapacitorNative,
      hasARCorePlugin,
      mode: hasARCorePlugin ? 'native-arcore' : 'web-preview',
      pluginName: PLUGIN_NAME,
      appId: 'com.venchy.armeasure',
    };
  }

  const isCapacitorNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const hasARCorePlugin =
    isCapacitorNative && Capacitor.isPluginAvailable(PLUGIN_NAME);

  return {
    platform,
    isCapacitorNative,
    hasARCorePlugin,
    mode: hasARCorePlugin ? 'native-arcore' : 'web-preview',
    pluginName: PLUGIN_NAME,
    appId: 'com.venchy.armeasure',
  };
}

function resolvePluginInstance(globalObj) {
  if (globalObj !== undefined) {
    return globalObj?.Capacitor?.Plugins?.[PLUGIN_NAME] ?? null;
  }
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable(PLUGIN_NAME)) {
    return NativeARMeasurePlugin;
  }
  return null;
}

/**
 * Initializes the native ARCore session when running on Capacitor Android.
 * @param {any} [globalObj]
 */
export async function initializeAR(globalObj) {
  const plugin = resolvePluginInstance(globalObj);
  if (plugin && typeof plugin.initializeAR === 'function') {
    const result = await plugin.initializeAR();
    return { dispatchedToNative: true, ...result };
  }
  return { dispatchedToNative: false, initialized: false, trackingStatus: 'scanning' };
}

/**
 * Queries current ARCore tracking status from the native plugin.
 * @param {any} [globalObj]
 */
export async function getTrackingStatus(globalObj) {
  const plugin = resolvePluginInstance(globalObj);
  if (plugin && typeof plugin.getTrackingStatus === 'function') {
    const result = await plugin.getTrackingStatus();
    return { dispatchedToNative: true, ...result };
  }
  return { dispatchedToNative: false, trackingStatus: 'scanning', isSessionActive: false };
}

/**
 * Sends normalized tap/reticle coordinates { x, y } to the native ARCore plugin
 * to execute an ARCore hit-test and create a 3D anchor.
 * @param {{ x?: number, y?: number }} [point]
 * @param {any} [globalObj]
 */
export async function placeMeasurementPoint(point = { x: 0.5, y: 0.5 }, globalObj) {
  const plugin = resolvePluginInstance(globalObj);
  if (plugin && typeof plugin.placeMeasurementPoint === 'function') {
    const result = await plugin.placeMeasurementPoint({
      x: typeof point?.x === 'number' ? point.x : 0.5,
      y: typeof point?.y === 'number' ? point.y : 0.5,
    });
    return { dispatchedToNative: true, result };
  }
  return { dispatchedToNative: false, result: null };
}

/**
 * Resets anchors and active measurement in the native ARCore plugin.
 * @param {any} [globalObj]
 */
export async function resetNativeMeasurement(globalObj) {
  const plugin = resolvePluginInstance(globalObj);
  if (plugin && typeof plugin.resetMeasurement === 'function') {
    await plugin.resetMeasurement();
    return { dispatchedToNative: true };
  }
  return { dispatchedToNative: false };
}

/**
 * Stops the native ARCore session and detaches the native camera surface.
 * @param {any} [globalObj]
 */
export async function stopAR(globalObj) {
  const plugin = resolvePluginInstance(globalObj);
  if (plugin && typeof plugin.stopAR === 'function') {
    await plugin.stopAR();
    return { dispatchedToNative: true };
  }
  return { dispatchedToNative: false };
}

/**
 * Subscribes to native ARMeasurePlugin events and window CustomEvents:
 * - trackingStatusChanged
 * - measurementPointPlaced
 * - measurementCompleted
 * - trackingError
 * @param {(payload: object) => void} onUpdate
 * @param {any} [globalObj]
 * @returns {() => void}
 */
export function subscribeToARCoreUpdates(onUpdate, globalObj) {
  const host = globalObj !== undefined ? globalObj : typeof window !== 'undefined' ? window : null;
  if (!host || typeof onUpdate !== 'function') {
    return () => {};
  }

  const pluginHandles = [];
  const plugin = resolvePluginInstance(globalObj);

  if (plugin && typeof plugin.addListener === 'function') {
    const registerNativeListener = (eventName, mapper) => {
      Promise.resolve(
        plugin.addListener(eventName, (eventPayload) => {
          onUpdate(mapper(eventPayload ?? {}));
        })
      )
        .then((handle) => {
          if (handle) pluginHandles.push(handle);
        })
        .catch(() => {});
    };

    registerNativeListener('trackingStatusChanged', (data) => {
      const update = { trackingStatus: data.trackingStatus };
      if (data.trackingFailureReason) {
        update.trackingFailureReason = data.trackingFailureReason;
      }
      return update;
    });

    registerNativeListener('measurementPointPlaced', (data) => {
      if (data.pointIndex === 2) {
        const update = {
          trackingStatus: 'tracking',
          secondPoint: data.screenPoint,
        };
        if (data.worldPoint) {
          update.secondWorldPoint = data.worldPoint;
        }
        return update;
      }
      const update = {
        trackingStatus: 'tracking',
        firstPoint: data.screenPoint,
      };
      if (data.worldPoint) {
        update.firstWorldPoint = data.worldPoint;
      }
      if (typeof data.liveDistanceMeters === 'number') {
        update.liveDistanceMeters = data.liveDistanceMeters;
      }
      return update;
    });

    registerNativeListener('measurementCompleted', (data) => {
      const update = {
        trackingStatus: data.trackingStatus ?? 'tracking',
        firstPoint: data.firstPoint,
        secondPoint: data.secondPoint,
        distanceMeters: data.distanceMeters,
      };
      if (data.firstWorldPoint) {
        update.firstWorldPoint = data.firstWorldPoint;
      }
      if (data.secondWorldPoint) {
        update.secondWorldPoint = data.secondWorldPoint;
      }
      return update;
    });

    registerNativeListener('trackingError', (data) => {
      const errorPayload =
        data.code && data.message ? { code: data.code, message: data.message } : null;

      if (data.code === 'invalid_point') {
        return errorPayload
          ? { trackingStatus: 'invalid_point', error: errorPayload }
          : { trackingStatus: 'invalid_point' };
      }
      if (
        data.code === 'tracking_lost' ||
        data.code === 'camera_permission_denied' ||
        data.code === 'camera_unavailable' ||
        data.code === 'arcore_unsupported' ||
        data.code === 'arcore_incompatible' ||
        data.code === 'arcore_install_declined' ||
        data.code === 'arcore_apk_too_old' ||
        data.code === 'arcore_sdk_too_old' ||
        data.code === 'ar_init_failed' ||
        data.code === 'session_inactive'
      ) {
        return errorPayload
          ? { trackingStatus: 'tracking_lost', error: errorPayload }
          : { trackingStatus: 'tracking_lost' };
      }
      return errorPayload ? { error: errorPayload } : {};
    });
  }

  const handleWindowEvent = (event) => {
    if (event?.detail && typeof event.detail === 'object') {
      onUpdate(event.detail);
    }
  };

  if (typeof host.addEventListener === 'function') {
    host.addEventListener(ARCORE_UPDATE_EVENT, handleWindowEvent);
  }

  return () => {
    for (const handle of pluginHandles) {
      if (handle && typeof handle.remove === 'function') {
        handle.remove();
      }
    }
    if (typeof host.removeEventListener === 'function') {
      host.removeEventListener(ARCORE_UPDATE_EVENT, handleWindowEvent);
    }
  };
}
