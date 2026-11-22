import test from 'node:test';
import assert from 'node:assert/strict';
import {
  arBridgeReducer,
  createInitialARBridgeState,
} from '../utils/arBridgeState.js';
import { TRACKING_STATUSES } from '../utils/measurementState.js';

const NATIVE_CAPABILITIES = {
  platform: 'android',
  isCapacitorNative: true,
  hasARCorePlugin: true,
  mode: 'native-arcore',
  pluginName: 'ARMeasurePlugin',
  appId: 'com.venchy.armeasure',
};

test('arBridgeState tracks session initialization, tracking status, anchors, distance, and reset', () => {
  let state = createInitialARBridgeState(NATIVE_CAPABILITIES);
  assert.equal(state.isNativeAR, true);
  assert.equal(state.isInitialized, false);
  assert.equal(state.trackingStatus, TRACKING_STATUSES.SCANNING);
  assert.equal(state.anchors.first, null);
  assert.equal(state.distanceMeters, null);

  state = arBridgeReducer(state, {
    type: 'SESSION_INITIALIZED',
    payload: { trackingStatus: TRACKING_STATUSES.SCANNING },
  });
  assert.equal(state.isInitialized, true);
  assert.equal(state.isSessionActive, true);

  state = arBridgeReducer(state, {
    type: 'NATIVE_EVENT',
    payload: {
      trackingStatus: TRACKING_STATUSES.TRACKING,
      firstPoint: { x: 0.35, y: 0.45, visible: true },
      firstWorldPoint: { x: 0.1, y: -0.2, z: -1.1 },
    },
  });
  assert.equal(state.trackingStatus, TRACKING_STATUSES.TRACKING);
  assert.deepEqual(state.anchors.first, { x: 0.35, y: 0.45, visible: true });
  assert.deepEqual(state.anchors.firstWorld, { x: 0.1, y: -0.2, z: -1.1 });

  state = arBridgeReducer(state, {
    type: 'NATIVE_EVENT',
    payload: {
      trackingStatus: TRACKING_STATUSES.TRACKING,
      firstPoint: { x: 0.34, y: 0.44, visible: true },
      secondPoint: { x: 0.66, y: 0.52, visible: true },
      firstWorldPoint: { x: 0.1, y: -0.2, z: -1.1 },
      secondWorldPoint: { x: 0.9, y: -0.2, z: -1.1 },
      distanceMeters: 0.8,
    },
  });
  assert.deepEqual(state.anchors.second, { x: 0.66, y: 0.52, visible: true });
  assert.deepEqual(state.anchors.secondWorld, { x: 0.9, y: -0.2, z: -1.1 });
  assert.equal(state.distanceMeters, 0.8);

  state = arBridgeReducer(state, { type: 'RESET_ANCHORS' });
  assert.equal(state.anchors.first, null);
  assert.equal(state.anchors.second, null);
  assert.equal(state.anchors.firstWorld, null);
  assert.equal(state.anchors.secondWorld, null);
  assert.equal(state.distanceMeters, null);

  state = arBridgeReducer(state, {
    type: 'SET_ERROR',
    trackingStatus: TRACKING_STATUSES.TRACKING_LOST,
    error: { code: 'camera_unavailable', message: 'Camera unavailable' },
  });
  assert.equal(state.trackingStatus, TRACKING_STATUSES.TRACKING_LOST);
  assert.deepEqual(state.error, { code: 'camera_unavailable', message: 'Camera unavailable' });

  state = arBridgeReducer(state, { type: 'SESSION_STOPPED' });
  assert.equal(state.isInitialized, false);
  assert.equal(state.isSessionActive, false);
});
