import test from 'node:test';
import assert from 'node:assert/strict';
import {
<<<<<<< HEAD
=======
  DEFAULT_WEB_DETECTED_PLANES,
>>>>>>> 879211a (Update AR Measure app)
  UI_MEASUREMENT_UNITS,
  clientPointToWindowNormalized,
  convertMetersToUnit,
  formatDistance,
  getLineMidpoint,
  getRectCenterWindowNormalized,
  getSmartDistanceLabelLayout,
<<<<<<< HEAD
  isValidUnit,
  normalizeViewportPoint,
  parseProjectedPoint,
=======
  hitTestDetectedPlanes,
  intersectRayWithPlane,
  isValidUnit,
  normalizeViewportPoint,
  parseProjectedPoint,
  screenToRay,
>>>>>>> 879211a (Update AR Measure app)
  windowNormalizedToViewport,
} from './measurementMath.js';
import {
  INSTRUCTIONS,
  MEASUREMENT_PHASES,
<<<<<<< HEAD
  PREVIEW_DEFAULT_FIRST_POINT,
=======
  RETICLE_CENTER_POINT,
>>>>>>> 879211a (Update AR Measure app)
  TRACKING_STATUSES,
  createInitialMeasurementState,
  getContextualInstruction,
  getMeasurementStatusSummary,
  measurementReducer,
} from './measurementState.js';

test('supports all five required measurement units and exposes cm, ft, m UI tabs', () => {
  for (const unit of ['m', 'cm', 'mm', 'in', 'ft']) {
    assert.equal(isValidUnit(unit), true);
  }
  assert.equal(isValidUnit('yd'), false);
  assert.deepEqual(
    UI_MEASUREMENT_UNITS.map((item) => item?.id),
    ['cm', 'ft', 'm']
  );
});

test('converts underlying metres accurately to all display units without mutating metres', () => {
  const meters = 1.5;
  assert.equal(convertMetersToUnit(meters, 'm'), 1.5);
  assert.equal(convertMetersToUnit(meters, 'cm'), 150);
  assert.equal(convertMetersToUnit(meters, 'mm'), 1500);
  assert.ok(Math.abs((convertMetersToUnit(meters, 'in') ?? 0) - 59.055118) < 0.001);
  assert.ok(Math.abs((convertMetersToUnit(meters, 'ft') ?? 0) - 4.921259) < 0.001);

  assert.equal(formatDistance(meters, 'm'), '1.50 m');
  assert.equal(formatDistance(meters, 'cm'), '150.0 cm');
  assert.equal(formatDistance(meters, 'mm'), '1500 mm');
  assert.equal(formatDistance(meters, 'in'), '59.1 in');
  assert.equal(formatDistance(meters, 'ft'), '4.92 ft');
});

test('formatDistance handles null distance honestly without inventing values', () => {
  assert.equal(formatDistance(null, 'cm'), '-- cm');
  assert.equal(formatDistance(undefined, 'mm'), '-- mm');
  assert.equal(formatDistance(-1, 'm'), '-- m');
});

test('normalizeViewportPoint clamps coordinates and computes midpoint', () => {
  const p1 = normalizeViewportPoint({ x: -0.2, y: 0.5 });
  const p2 = normalizeViewportPoint({ x: 1.4, y: 0.9 });
  assert.deepEqual(p1, { x: 0.08, y: 0.5, visible: true });
  assert.deepEqual(p2, { x: 0.92, y: 0.9, visible: true });
  assert.deepEqual(getLineMidpoint(p1, p2), { x: 0.5, y: 0.7 });
});

test('parseProjectedPoint preserves off-screen native coordinates and behind-camera visibility', () => {
  assert.deepEqual(parseProjectedPoint({ x: -0.15, y: 1.12, visible: true }), {
    x: -0.15,
    y: 1.12,
    visible: true,
  });
  assert.deepEqual(parseProjectedPoint({ x: 0.5, y: 0.5, visible: false }), {
    x: 0.5,
    y: 0.5,
    visible: false,
  });
  assert.equal(parseProjectedPoint({ x: Number.NaN, y: 0.5 }), null);
});

test('converts between full-window native coordinates and inset ARViewport bounds', () => {
  // Simulate a 400x800 screen with a 60px header and 140px bottom dock (viewport top=60, height=600)
  const windowSize = { width: 400, height: 800 };
  const viewportRect = { left: 10, top: 60, width: 380, height: 600 };

  // Reticle centered in ARViewport (center pixel = 200, 360)
  const reticleRect = { left: 160, top: 320, width: 80, height: 80 };
  const windowReticle = getRectCenterWindowNormalized(reticleRect, windowSize.width, windowSize.height);
  assert.deepEqual(windowReticle, { x: 0.5, y: 0.45 });

  // Client tap at (200, 360) maps to same full-window normalized coordinate
  assert.deepEqual(clientPointToWindowNormalized(200, 360, 400, 800), { x: 0.5, y: 0.45 });

  // Native projection back at window (0.5, 0.45) maps to ARViewport center (0.5, 0.5)
  const localPoint = windowNormalizedToViewport(
    { x: 0.5, y: 0.45, visible: true },
    viewportRect,
    windowSize
  );
  assert.deepEqual(localPoint, { x: 0.5, y: 0.5, visible: true });
});

test('getSmartDistanceLabelLayout flips below near top edge and clamps inside viewport', () => {
  // Normal center line places badge above
  assert.deepEqual(
    getSmartDistanceLabelLayout({ x: 0.3, y: 0.5, visible: true }, { x: 0.7, y: 0.5, visible: true }),
    { x: 0.5, y: 0.5, placement: 'above' }
  );

  // Near top edge flips badge below and clamps x
  assert.deepEqual(
    getSmartDistanceLabelLayout({ x: 0.02, y: 0.1, visible: true }, { x: 0.1, y: 0.12, visible: true }),
    { x: 0.14, y: 0.14, placement: 'below' }
  );

  // Behind camera returns null
  assert.equal(
    getSmartDistanceLabelLayout({ x: 0.3, y: 0.5, visible: false }, { x: 0.7, y: 0.5, visible: true }),
    null
  );
});

test('multi-point chain measurement state machine progresses through initial, chain, completed, and reset', () => {
  let state = createInitialMeasurementState('m');
  assert.equal(state.phase, MEASUREMENT_PHASES.INITIAL);
  assert.equal(getContextualInstruction(state), INSTRUCTIONS.INITIAL);

<<<<<<< HEAD
  // Place first point
  state = measurementReducer(state, { type: 'PLACE_POINT' });
  assert.equal(state.phase, MEASUREMENT_PHASES.CHAIN);
  assert.equal(state.points.length, 1);
=======
  // Place first point without explicit coordinates -> locks at exact center crosshair
  state = measurementReducer(state, { type: 'PLACE_POINT' });
  assert.equal(state.phase, MEASUREMENT_PHASES.CHAIN);
  assert.equal(state.points.length, 1);
  assert.equal(state.points[0].x, RETICLE_CENTER_POINT.x);
  assert.equal(state.points[0].y, RETICLE_CENTER_POINT.y);
>>>>>>> 879211a (Update AR Measure app)
  assert.equal(state.segments.length, 0);
  assert.equal(state.distanceMeters, null);
  assert.equal(getContextualInstruction(state), INSTRUCTIONS.CHAIN_SINGLE);

<<<<<<< HEAD
  // Place second point in web preview (adds segment and second point)
  state = measurementReducer(state, { type: 'PLACE_POINT' });
  assert.equal(state.phase, MEASUREMENT_PHASES.CHAIN);
  assert.equal(state.points.length, 2);
=======
  // Place second point without explicit coordinates -> also targets exact center crosshair
  state = measurementReducer(state, { type: 'PLACE_POINT' });
  assert.equal(state.phase, MEASUREMENT_PHASES.CHAIN);
  assert.equal(state.points.length, 2);
  assert.equal(state.points[1].x, RETICLE_CENTER_POINT.x);
  assert.equal(state.points[1].y, RETICLE_CENTER_POINT.y);
>>>>>>> 879211a (Update AR Measure app)
  assert.equal(state.segments.length, 1);
  assert.equal(getContextualInstruction(state), INSTRUCTIONS.CHAIN_MULTIPLE);

  // Complete measurement
  state = measurementReducer(state, { type: 'COMPLETE_MEASUREMENT' });
  assert.equal(state.phase, MEASUREMENT_PHASES.COMPLETED);
  assert.equal(getContextualInstruction(state), INSTRUCTIONS.COMPLETED_PREVIEW);

  // Reset returns to initial state
  state = measurementReducer(state, { type: 'RESET' });
  assert.equal(state.phase, MEASUREMENT_PHASES.INITIAL);
  assert.equal(state.points.length, 0);
  assert.equal(state.segments.length, 0);
  assert.equal(state.distanceMeters, null);
  assert.equal(state.resetCount, 1);
  assert.equal(getContextualInstruction(state), INSTRUCTIONS.INITIAL);
});

test('receives native ARCore tracking status, multi-points, and distance in metres', () => {
  let state = createInitialMeasurementState('cm');

  // Native ARCore sends completed measurement frame with multiple points & segments
  state = measurementReducer(state, {
    type: 'RECEIVE_NATIVE_UPDATE',
    payload: {
      trackingStatus: TRACKING_STATUSES.TRACKING,
      points: [
        { x: 0.2, y: 0.3 },
        { x: 0.5, y: 0.5 },
        { x: 0.8, y: 0.7 },
      ],
      segments: [1.2, 1.15],
      phase: MEASUREMENT_PHASES.COMPLETED,
    },
  });

  assert.equal(state.phase, MEASUREMENT_PHASES.COMPLETED);
  assert.equal(state.distanceMeters, 2.35);
  assert.equal(formatDistance(state.distanceMeters, state.unit), '235.0 cm');
  assert.equal(getContextualInstruction(state), INSTRUCTIONS.COMPLETED_NATIVE);

  // Switching unit converts display without modifying stored distanceMeters
  state = measurementReducer(state, { type: 'SET_UNIT', unit: 'mm' });
  assert.equal(state.distanceMeters, 2.35);
  assert.equal(formatDistance(state.distanceMeters, state.unit), '2350 mm');

  // Tracking lost state overrides instruction and blocks point placement
  state = measurementReducer(state, {
    type: 'RECEIVE_NATIVE_UPDATE',
    payload: { trackingStatus: TRACKING_STATUSES.TRACKING_LOST },
  });
  assert.equal(getContextualInstruction(state), INSTRUCTIONS.TRACKING_LOST);
  assert.equal(getMeasurementStatusSummary(state).measurementLabel, 'Tracking Lost');

  // Invalid point state displays exact error instruction
  state = measurementReducer(state, {
    type: 'RECEIVE_NATIVE_UPDATE',
    payload: { trackingStatus: TRACKING_STATUSES.INVALID_POINT },
  });
  assert.equal(getContextualInstruction(state), INSTRUCTIONS.INVALID_POINT);
  assert.equal(getMeasurementStatusSummary(state).measurementLabel, 'Invalid Point');
});

test('tracks liveDistanceMeters while aiming from last point and clears on complete/reset', () => {
  let state = createInitialMeasurementState('m');

  state = measurementReducer(state, {
    type: 'RECEIVE_NATIVE_UPDATE',
    payload: {
      trackingStatus: TRACKING_STATUSES.TRACKING,
      points: [{ x: 0.3, y: 0.45, visible: true }],
      liveDistanceMeters: 0.84,
      phase: MEASUREMENT_PHASES.CHAIN,
    },
  });

  assert.equal(state.phase, MEASUREMENT_PHASES.CHAIN);
  assert.equal(state.liveDistanceMeters, 0.84);
  assert.equal(formatDistance(state.liveDistanceMeters, state.unit), '0.84 m');

  state = measurementReducer(state, {
    type: 'RECEIVE_NATIVE_UPDATE',
    payload: {
      trackingStatus: TRACKING_STATUSES.TRACKING,
      points: [
        { x: 0.3, y: 0.45, visible: true },
        { x: 0.65, y: 0.55, visible: true },
      ],
      segments: [1.24],
      phase: MEASUREMENT_PHASES.COMPLETED,
    },
  });

  assert.equal(state.phase, MEASUREMENT_PHASES.COMPLETED);
  assert.equal(state.liveDistanceMeters, null);
  assert.equal(state.distanceMeters, 1.24);

  state = measurementReducer(state, { type: 'RESET' });
  assert.equal(state.phase, MEASUREMENT_PHASES.INITIAL);
  assert.equal(state.liveDistanceMeters, null);
  assert.equal(state.distanceMeters, null);
});

<<<<<<< HEAD
=======
test('screenToRay, intersectRayWithPlane, and hitTestDetectedPlanes project screen taps into 3D world space', () => {
  const centerRay = screenToRay({ x: 0.5, y: 0.5 }, { verticalFovDeg: 60, aspectRatio: 9 / 16 });
  assert.deepEqual(centerRay, {
    origin: { x: 0, y: 0, z: 0 },
    direction: { x: 0, y: 0, z: -1 },
  });

  // Lower screen tap intersects horizontal floor plane (y = -1.15) closer than vertical wall (z = -2.4)
  const floorHit = hitTestDetectedPlanes(
    { x: 0.6, y: 0.85 },
    DEFAULT_WEB_DETECTED_PLANES,
    { verticalFovDeg: 60, aspectRatio: 9 / 16 }
  );
  assert.ok(floorHit);
  assert.equal(floorHit.hitType, 'plane');
  assert.equal(floorHit.planeType, 'horizontal');
  assert.equal(floorHit.worldPoint.y, -1.15);
  assert.ok(floorHit.worldPoint.x > 0);
  assert.ok(floorHit.worldPoint.z < 0);

  // Upper/center tap hits vertical wall plane (z = -3.8)
  const wallHit = hitTestDetectedPlanes(
    { x: 0.5, y: 0.4 },
    DEFAULT_WEB_DETECTED_PLANES,
    { verticalFovDeg: 60, aspectRatio: 9 / 16 }
  );
  assert.ok(wallHit);
  assert.equal(wallHit.hitType, 'plane');
  assert.equal(wallHit.planeType, 'vertical');
  assert.equal(wallHit.worldPoint.z, -3.8);

  // Parallel ray and behind-camera plane return null
  assert.equal(
    intersectRayWithPlane(centerRay, {
      point: { x: 0, y: -1, z: -1 },
      normal: { x: 0, y: 1, z: 0 },
    }),
    null
  );
  assert.equal(
    intersectRayWithPlane(centerRay, {
      point: { x: 0, y: 0, z: 2 },
      normal: { x: 0, y: 0, z: 1 },
    }),
    null
  );

  // Bounded plane radius rejects hits outside the detected polygon radius
  assert.equal(
    intersectRayWithPlane(
      screenToRay({ x: 0.9, y: 0.5 }, { verticalFovDeg: 60, aspectRatio: 1 }),
      {
        point: { x: 0, y: 0, z: -2 },
        normal: { x: 0, y: 0, z: 1 },
        radius: 0.25,
      }
    ),
    null
  );
});

test('preserves 3D worldPoint metadata on native updates and plane detection telemetry', () => {
  let state = createInitialMeasurementState('m');
  state = measurementReducer(state, {
    type: 'RECEIVE_NATIVE_UPDATE',
    payload: {
      trackingStatus: TRACKING_STATUSES.TRACKING,
      detectedPlanesCount: 2,
      reticleHitType: 'plane',
      reticlePlaneType: 'horizontal',
      reticleWorldPoint: { x: 0.12, y: -0.95, z: -1.42 },
      points: [
        {
          x: 0.35,
          y: 0.55,
          visible: true,
          worldPoint: { x: -0.1, y: -0.95, z: -1.4 },
          hitType: 'plane',
          planeType: 'horizontal',
        },
      ],
      phase: MEASUREMENT_PHASES.CHAIN,
    },
  });

  assert.equal(state.detectedPlanesCount, 2);
  assert.equal(state.reticleHitType, 'plane');
  assert.equal(state.reticlePlaneType, 'horizontal');
  assert.deepEqual(state.reticleWorldPoint, { x: 0.12, y: -0.95, z: -1.42 });
  assert.deepEqual(state.points[0].worldPoint, { x: -0.1, y: -0.95, z: -1.4 });
  assert.equal(state.points[0].hitType, 'plane');
  assert.equal(state.points[0].planeType, 'horizontal');
});

test('UNDO_POINT removes the latest point, recomputes segments, and reverts to previous point', () => {
  let state = createInitialMeasurementState('m');

  // Undoing with 0 points is a no-op
  assert.equal(measurementReducer(state, { type: 'UNDO_POINT' }), state);

  state = measurementReducer(state, {
    type: 'RECEIVE_NATIVE_UPDATE',
    payload: {
      trackingStatus: TRACKING_STATUSES.TRACKING,
      points: [
        { x: 0.2, y: 0.3, visible: true },
        { x: 0.5, y: 0.5, visible: true },
        { x: 0.8, y: 0.7, visible: true },
      ],
      segments: [1.2, 0.8],
      phase: MEASUREMENT_PHASES.COMPLETED,
    },
  });

  // Undo 3rd point from completed measurement -> reverts to active 2-point chain
  state = measurementReducer(state, { type: 'UNDO_POINT' });
  assert.equal(state.phase, MEASUREMENT_PHASES.CHAIN);
  assert.equal(state.points.length, 2);
  assert.deepEqual(state.segments, [1.2]);
  assert.equal(state.distanceMeters, 1.2);

  // Undo 2nd point -> reverts to 1-point chain
  state = measurementReducer(state, { type: 'UNDO_POINT' });
  assert.equal(state.phase, MEASUREMENT_PHASES.CHAIN);
  assert.equal(state.points.length, 1);
  assert.deepEqual(state.segments, []);
  assert.equal(state.distanceMeters, null);

  // Undo 1st point -> returns to initial state
  state = measurementReducer(state, { type: 'UNDO_POINT' });
  assert.equal(state.phase, MEASUREMENT_PHASES.INITIAL);
  assert.equal(state.points.length, 0);
  assert.deepEqual(state.segments, []);
  assert.equal(state.distanceMeters, null);
});


>>>>>>> 879211a (Update AR Measure app)

