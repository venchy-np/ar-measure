import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCORE_UPDATE_EVENT,
  DEFAULT_UNIT,
  MEASUREMENT_UNITS,
  PLUGIN_NAME,
  getEnvironmentCapabilities,
  getTrackingStatus,
  initializeAR,
  isValidUnit,
  loadPreferredUnit,
  placeMeasurementPoint,
  resetNativeMeasurement,
  savePreferredUnit,
  stopAR,
  subscribeToARCoreUpdates,
<<<<<<< HEAD
=======
  undoNativeMeasurement,
>>>>>>> 879211a (Update AR Measure app)
} from './arBridge.js';

test('unit validation accepts all 5 supported units and rejects unknown units', () => {
  assert.equal(MEASUREMENT_UNITS.length, 5);
  for (const unit of ['m', 'cm', 'mm', 'in', 'ft']) {
    assert.equal(isValidUnit(unit), true);
  }
  assert.equal(isValidUnit('km'), false);
  assert.equal(isValidUnit(''), false);
});

test('preferred unit loads and saves safely via storage', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key) ?? null : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  } as unknown as Storage;

  assert.equal(loadPreferredUnit(mockStorage), DEFAULT_UNIT);
  assert.equal(savePreferredUnit('mm', mockStorage), true);
  assert.equal(loadPreferredUnit(mockStorage), 'mm');
  assert.equal(savePreferredUnit('invalid', mockStorage), false);
  assert.equal(loadPreferredUnit(mockStorage), 'mm');

  store.set('ar_measure_preferred_unit', 'bogus');
  assert.equal(loadPreferredUnit(mockStorage), DEFAULT_UNIT);
});

test('environment detection defaults to web-preview when Capacitor is absent', () => {
  const caps = getEnvironmentCapabilities({});
  assert.equal(caps.platform, 'web');
  assert.equal(caps.isCapacitorNative, false);
  assert.equal(caps.hasARCorePlugin, false);
  assert.equal(caps.mode, 'web-preview');
  assert.equal(caps.pluginName, PLUGIN_NAME);
  assert.equal(caps.appId, 'com.venchy.armeasure');
});

test('environment detection recognizes Capacitor native shell and ARMeasurePlugin', () => {
  const mockHost = {
    Capacitor: {
      isNativePlatform: () => true,
      getPlatform: () => 'android',
      Plugins: {
        ARMeasurePlugin: {
          initializeAR: async () => ({ initialized: true }),
        },
      },
    },
  };

  const caps = getEnvironmentCapabilities(mockHost);
  assert.equal(caps.platform, 'android');
  assert.equal(caps.isCapacitorNative, true);
  assert.equal(caps.hasARCorePlugin, true);
  assert.equal(caps.mode, 'native-arcore');
});

test('native bridge methods dispatch to ARMeasurePlugin when present and resolve cleanly in web', async () => {
  const webInit = await initializeAR({});
  assert.equal(webInit.dispatchedToNative, false);

  const webStatus = await getTrackingStatus({});
  assert.equal(webStatus.dispatchedToNative, false);

  const webPlace = await placeMeasurementPoint({ x: 0.4, y: 0.6 }, {});
  assert.equal(webPlace.dispatchedToNative, false);

<<<<<<< HEAD
=======
  const webUndo = await undoNativeMeasurement({});
  assert.equal(webUndo.dispatchedToNative, false);

>>>>>>> 879211a (Update AR Measure app)
  const webReset = await resetNativeMeasurement({});
  assert.equal(webReset.dispatchedToNative, false);

  const webStop = await stopAR({});
  assert.equal(webStop.dispatchedToNative, false);

  const calls: string[] = [];
  let placedTap: { x: number; y: number } | null = null;
  const nativeHost = {
    Capacitor: {
      Plugins: {
        ARMeasurePlugin: {
          initializeAR: async () => {
            calls.push('initializeAR');
            return { initialized: true, trackingStatus: 'scanning' };
          },
          getTrackingStatus: async () => {
            calls.push('getTrackingStatus');
            return { trackingStatus: 'tracking', isSessionActive: true };
          },
          placeMeasurementPoint: async (point: { x: number; y: number }) => {
            calls.push('placeMeasurementPoint');
            placedTap = point;
            return { placed: true };
          },
<<<<<<< HEAD
=======
          undoMeasurement: async () => {
            calls.push('undoMeasurement');
            return { undone: true };
          },
>>>>>>> 879211a (Update AR Measure app)
          resetMeasurement: async () => {
            calls.push('resetMeasurement');
            return { reset: true };
          },
          stopAR: async () => {
            calls.push('stopAR');
            return { stopped: true };
          },
        },
      },
    },
  };

  assert.equal((await initializeAR(nativeHost)).dispatchedToNative, true);
  assert.equal((await getTrackingStatus(nativeHost)).trackingStatus, 'tracking');
  assert.equal((await placeMeasurementPoint({ x: 0.3, y: 0.7 }, nativeHost)).dispatchedToNative, true);
  assert.deepEqual(placedTap, { x: 0.3, y: 0.7 });
<<<<<<< HEAD
=======
  assert.equal((await undoNativeMeasurement(nativeHost)).dispatchedToNative, true);
>>>>>>> 879211a (Update AR Measure app)
  assert.equal((await resetNativeMeasurement(nativeHost)).dispatchedToNative, true);
  assert.equal((await stopAR(nativeHost)).dispatchedToNative, true);
  assert.deepEqual(calls, [
    'initializeAR',
    'getTrackingStatus',
    'placeMeasurementPoint',
<<<<<<< HEAD
=======
    'undoMeasurement',
>>>>>>> 879211a (Update AR Measure app)
    'resetMeasurement',
    'stopAR',
  ]);
});

test('subscribeToARCoreUpdates maps all 4 ARMeasurePlugin events and window events', async () => {
  const pluginListeners = new Map<string, (data: unknown) => void>();
  const windowListeners = new Map<string, (e: unknown) => void>();
  let removedListeners = 0;

  const mockHost = {
    Capacitor: {
      Plugins: {
        ARMeasurePlugin: {
          addListener: async (name: string, fn: (data: unknown) => void) => {
            pluginListeners.set(name, fn);
            return {
              remove: () => {
                removedListeners += 1;
              },
            };
          },
        },
      },
    },
    addEventListener: (name: string, fn: (e: unknown) => void) => windowListeners.set(name, fn),
    removeEventListener: (name: string) => windowListeners.delete(name),
  };

  const received: unknown[] = [];
  const unsub = subscribeToARCoreUpdates((payload) => {
    received.push(payload);
  }, mockHost);

  pluginListeners.get('trackingStatusChanged')?.({ trackingStatus: 'tracking' });
  pluginListeners.get('measurementPointPlaced')?.({
    pointIndex: 1,
    screenPoint: { x: 0.3, y: 0.4 },
  });
  pluginListeners.get('measurementCompleted')?.({
    firstPoint: { x: 0.3, y: 0.4 },
    secondPoint: { x: 0.7, y: 0.6 },
    distanceMeters: 1.85,
  });
  pluginListeners.get('trackingError')?.({ code: 'invalid_point' });

  const windowListener = windowListeners.get(ARCORE_UPDATE_EVENT);
  assert.ok(windowListener);
  windowListener({ detail: { trackingStatus: 'tracking', distanceMeters: 0.9 } });

  assert.equal(received.length, 5);
  assert.deepEqual(received[0], { trackingStatus: 'tracking' });
  assert.deepEqual(received[1], {
    trackingStatus: 'tracking',
    firstPoint: { x: 0.3, y: 0.4 },
  });
  assert.deepEqual(received[2], {
    trackingStatus: 'tracking',
    firstPoint: { x: 0.3, y: 0.4 },
    secondPoint: { x: 0.7, y: 0.6 },
    distanceMeters: 1.85,
  });
  assert.deepEqual(received[3], { trackingStatus: 'invalid_point' });
  assert.deepEqual(received[4], { trackingStatus: 'tracking', distanceMeters: 0.9 });

<<<<<<< HEAD
  await Promise.resolve();
  unsub();
  assert.equal(windowListeners.has(ARCORE_UPDATE_EVENT), false);
  assert.equal(removedListeners, 4);
=======
  pluginListeners.get('chainUpdated')?.({
    points: [
      { x: 0.2, y: 0.3, visible: true },
      { x: 0.5, y: 0.5, visible: true },
    ],
    segments: [0.95],
    liveDistanceMeters: 0.42,
    phase: 'chain',
  });
  assert.equal(received.length, 6);
  assert.deepEqual(received[5], {
    trackingStatus: 'tracking',
    points: [
      { x: 0.2, y: 0.3, visible: true },
      { x: 0.5, y: 0.5, visible: true },
    ],
    segments: [0.95],
    liveDistanceMeters: 0.42,
    phase: 'chain',
  });

  pluginListeners.get('planeDetectionUpdated')?.({
    detectedPlanesCount: 3,
    reticleHitType: 'plane',
    reticlePlaneType: 'horizontal',
    reticleWorldPoint: { x: 0.05, y: -1.1, z: -1.6 },
  });
  assert.equal(received.length, 7);
  assert.deepEqual(received[6], {
    detectedPlanesCount: 3,
    reticleHitType: 'plane',
    reticlePlaneType: 'horizontal',
    reticleWorldPoint: { x: 0.05, y: -1.1, z: -1.6 },
  });

  await Promise.resolve();
  unsub();
  assert.equal(windowListeners.has(ARCORE_UPDATE_EVENT), false);
  assert.equal(removedListeners, 6);
>>>>>>> 879211a (Update AR Measure app)
});
