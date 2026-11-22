import {
  DEFAULT_UNIT,
<<<<<<< HEAD
  isValidUnit,
  normalizeViewportPoint,
  parseProjectedPoint,
=======
  hitTestDetectedPlanes,
  isValidUnit,
  normalizeViewportPoint,
  parseProjectedPoint,
  parseWorldPoint,
>>>>>>> 879211a (Update AR Measure app)
} from './measurementMath.js';

/**
 * Measurement workflow phases & AR tracking states.
 */
export const MEASUREMENT_PHASES = {
  INITIAL: 'initial',
  CHAIN: 'chain',
  COMPLETED: 'completed',
};

export const TRACKING_STATUSES = {
  SCANNING: 'scanning',
  TRACKING: 'tracking',
  TRACKING_LOST: 'tracking_lost',
  INVALID_POINT: 'invalid_point',
};

export const INSTRUCTIONS = {
  INITIAL: 'Move your device slowly to scan the environment.',
  INITIAL_READY: 'Tap + to place the initial mark.',
  CHAIN_SINGLE: 'Tap + to place point 2. Continue adding points.',
  CHAIN_MULTIPLE: 'Tap + to add next point or press Done.',
  COMPLETED_NATIVE: 'Measurement complete.',
  COMPLETED_PREVIEW: 'Points placed · Distance requires native ARCore.',
  TRACKING_LOST: 'Tracking lost. Move your device slowly.',
  INVALID_POINT: 'Unable to detect a valid measurement point.',
};

<<<<<<< HEAD
export const PREVIEW_DEFAULT_FIRST_POINT = { x: 0.3, y: 0.5 };
=======
>>>>>>> 879211a (Update AR Measure app)
export const RETICLE_CENTER_POINT = { x: 0.5, y: 0.5 };

/**
 * Creates the initial measurement state object supporting multi-point chain measurements.
 * @param {string} [preferredUnit]
 * @param {object} [capabilities]
 */
export function createInitialMeasurementState(
  preferredUnit = DEFAULT_UNIT,
<<<<<<< HEAD
  capabilities = { hasARCorePlugin: false, isCapacitorNative: false, platform: 'web', pluginName: 'ARMeasurePlugin' }
=======
  capabilities = {
    hasARCorePlugin: false,
    isCapacitorNative: false,
    platform: 'web',
    pluginName: 'ARMeasurePlugin',
  }
>>>>>>> 879211a (Update AR Measure app)
) {
  return {
    unit: isValidUnit(preferredUnit) ? preferredUnit : DEFAULT_UNIT,
    phase: MEASUREMENT_PHASES.INITIAL,
    trackingStatus: capabilities.hasARCorePlugin
      ? TRACKING_STATUSES.TRACKING
      : TRACKING_STATUSES.SCANNING,
<<<<<<< HEAD
    points: [], // Array of { x, y, visible }
    segments: [], // Array of distance numbers in metres
    distanceMeters: null,
    liveDistanceMeters: null,
    cameraResolution: '1920x1080 (1080p HD)',
    qualityMode: 'High Quality (1080p)',
    zoom: '1x',
=======
    /** @type {Array<{ x: number, y: number, visible: boolean, worldPoint?: { x: number, y: number, z: number }, hitType?: string, planeType?: string }>} */
    points: [],
    /** @type {Array<number | null>} */
    segments: [],
    /** @type {number | null} */
    distanceMeters: null,
    /** @type {number | null} */
    liveDistanceMeters: null,
    detectedPlanesCount: 0,
    /** @type {string | null} */
    reticleHitType: null,
    /** @type {string | null} */
    reticlePlaneType: null,
    /** @type {{ x: number, y: number, z: number } | null} */
    reticleWorldPoint: null,
    cameraResolution: 'Detecting camera...',
    qualityMode: '1080p Full HD',
    availableQualities: ['1080p Full HD'],
    zoom: '1x',
    availableZooms: ['1x'],
>>>>>>> 879211a (Update AR Measure app)
    resetCount: 0,
    lastEventAt: 0,
    capabilities,
  };
}

/**
 * Resolves the contextual user instruction based on tracking status and phase.
<<<<<<< HEAD
 * @param {{ phase: string, trackingStatus: string, points: Array, capabilities?: { hasARCorePlugin?: boolean } }} state
=======
 * @param {{ phase: string, trackingStatus: string, points: Array, distanceMeters?: number | null, capabilities?: { hasARCorePlugin?: boolean } }} state
>>>>>>> 879211a (Update AR Measure app)
 * @returns {string}
 */
export function getContextualInstruction(state) {
  if (state.trackingStatus === TRACKING_STATUSES.TRACKING_LOST) {
    return INSTRUCTIONS.TRACKING_LOST;
  }
  if (state.trackingStatus === TRACKING_STATUSES.INVALID_POINT) {
    return INSTRUCTIONS.INVALID_POINT;
  }
  if (state.phase === MEASUREMENT_PHASES.COMPLETED) {
    return typeof state.distanceMeters === 'number'
      ? INSTRUCTIONS.COMPLETED_NATIVE
      : INSTRUCTIONS.COMPLETED_PREVIEW;
  }
  if (state.phase === MEASUREMENT_PHASES.CHAIN) {
    return state.points.length === 1 ? INSTRUCTIONS.CHAIN_SINGLE : INSTRUCTIONS.CHAIN_MULTIPLE;
  }
  if (
    state.capabilities?.hasARCorePlugin &&
    state.trackingStatus === TRACKING_STATUSES.TRACKING
  ) {
    return INSTRUCTIONS.INITIAL_READY;
  }
  return INSTRUCTIONS.INITIAL;
}

/**
 * Resolves header and status labels from current state.
 * @param {{ phase: string, trackingStatus: string, points: Array, capabilities?: { hasARCorePlugin?: boolean } }} state
 */
export function getMeasurementStatusSummary(state) {
  const isNative = Boolean(state.capabilities?.hasARCorePlugin);
  const headerLabel = isNative
    ? state.trackingStatus === TRACKING_STATUSES.TRACKING
      ? 'Good tracking'
      : state.trackingStatus === TRACKING_STATUSES.TRACKING_LOST
        ? 'Tracking lost'
        : state.trackingStatus === TRACKING_STATUSES.INVALID_POINT
          ? 'Invalid point'
          : 'Scanning'
    : 'AR Preview';

  if (state.trackingStatus === TRACKING_STATUSES.TRACKING_LOST) {
    return { headerLabel, measurementLabel: 'Tracking Lost', tone: 'danger' };
  }
  if (state.trackingStatus === TRACKING_STATUSES.INVALID_POINT) {
    return { headerLabel, measurementLabel: 'Invalid Point', tone: 'warning' };
  }
  if (state.phase === MEASUREMENT_PHASES.CHAIN) {
    return { headerLabel, measurementLabel: `Point ${state.points.length} Set`, tone: 'accent' };
  }
  if (state.phase === MEASUREMENT_PHASES.COMPLETED) {
<<<<<<< HEAD
    return { headerLabel, measurementLabel: `${state.points.length} Points Complete`, tone: 'ready' };
=======
    return {
      headerLabel,
      measurementLabel: `${state.points.length} Points Complete`,
      tone: 'ready',
    };
>>>>>>> 879211a (Update AR Measure app)
  }
  return {
    headerLabel,
    measurementLabel: isNative ? 'Good tracking' : 'Ready',
    tone: isNative ? 'ready' : 'neutral',
  };
}

<<<<<<< HEAD
=======
function roundMeters(val) {
  return Number(val.toFixed(6));
}

function sumValidSegments(segments) {
  let hasNumeric = false;
  let sum = 0;
  for (const val of segments) {
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      hasNumeric = true;
      sum += val;
    }
  }
  return hasNumeric ? roundMeters(sum) : null;
}

>>>>>>> 879211a (Update AR Measure app)
/**
 * Pure reducer managing multi-point chain measurement transitions and native updates.
 */
export function measurementReducer(state, action) {
  switch (action.type) {
    case 'SET_UNIT': {
      if (!isValidUnit(action.unit)) return state;
      return { ...state, unit: action.unit };
    }

    case 'SET_ZOOM': {
      return { ...state, zoom: action.zoom };
    }

    case 'SET_QUALITY': {
      return {
        ...state,
<<<<<<< HEAD
        qualityMode: action.qualityMode,
        cameraResolution: action.cameraResolution ?? action.qualityMode,
=======
        qualityMode: action.qualityMode ?? state.qualityMode,
        cameraResolution: action.cameraResolution ?? state.cameraResolution,
>>>>>>> 879211a (Update AR Measure app)
      };
    }

    case 'START_NEW_MEASUREMENT':
    case 'RESET': {
      return {
        ...state,
        phase: MEASUREMENT_PHASES.INITIAL,
        trackingStatus: state.capabilities?.hasARCorePlugin
          ? TRACKING_STATUSES.TRACKING
          : TRACKING_STATUSES.SCANNING,
        points: [],
        segments: [],
        distanceMeters: null,
        liveDistanceMeters: null,
        resetCount: action.type === 'RESET' ? state.resetCount + 1 : state.resetCount,
      };
    }

    case 'PLACE_POINT': {
      if (state.trackingStatus === TRACKING_STATUSES.TRACKING_LOST) {
        return state;
      }

<<<<<<< HEAD
      const defaultPreviewPoints = [
        { x: 0.28, y: 0.58 },
        { x: 0.54, y: 0.42 },
        { x: 0.75, y: 0.64 },
        { x: 0.44, y: 0.72 },
        { x: 0.65, y: 0.28 },
      ];

      const nextIndex = state.points.length;
      const fallbackPoint = defaultPreviewPoints[nextIndex % defaultPreviewPoints.length];
      const point = normalizeViewportPoint(action.point) ?? fallbackPoint;
=======
      let point = normalizeViewportPoint(action.point) ?? {
        ...RETICLE_CENTER_POINT,
        visible: true,
      };
      if (!point.worldPoint) {
        const planeHit = hitTestDetectedPlanes(point);
        if (planeHit) {
          point = {
            ...point,
            worldPoint: planeHit.worldPoint,
            hitType: planeHit.hitType,
            planeType: planeHit.planeType,
          };
        }
      }
>>>>>>> 879211a (Update AR Measure app)

      const nextPoints = [...state.points, point];
      const nextSegments = [...state.segments];

      if (nextPoints.length >= 2) {
<<<<<<< HEAD
        const pPrev = nextPoints[nextPoints.length - 2];
        const pCurr = nextPoints[nextPoints.length - 1];
        const segDist =
          typeof action.segmentDistanceMeters === 'number' && Number.isFinite(action.segmentDistanceMeters)
            ? action.segmentDistanceMeters
            : Math.sqrt(Math.pow(pCurr.x - pPrev.x, 2) + Math.pow(pCurr.y - pPrev.y, 2)) * 2.2;
        nextSegments.push(segDist);
      }

      const activeDist = nextSegments.length > 0 ? nextSegments[nextSegments.length - 1] : null;
=======
        const segDist =
          typeof action.segmentDistanceMeters === 'number' &&
          Number.isFinite(action.segmentDistanceMeters) &&
          action.segmentDistanceMeters >= 0
            ? roundMeters(action.segmentDistanceMeters)
            : null;
        nextSegments.push(segDist);
      }

      const totalDist = sumValidSegments(nextSegments);
>>>>>>> 879211a (Update AR Measure app)

      return {
        ...state,
        phase: MEASUREMENT_PHASES.CHAIN,
        trackingStatus: TRACKING_STATUSES.TRACKING,
        points: nextPoints,
        segments: nextSegments,
        liveDistanceMeters: null,
<<<<<<< HEAD
        distanceMeters: activeDist,
=======
        distanceMeters: totalDist,
>>>>>>> 879211a (Update AR Measure app)
      };
    }

    case 'COMPLETE_MEASUREMENT': {
      if (state.points.length < 2) return state;
<<<<<<< HEAD
      const totalDist = state.segments.reduce((acc, val) => acc + (val ?? 0), 0);
=======
      const totalDist = sumValidSegments(state.segments);
>>>>>>> 879211a (Update AR Measure app)
      return {
        ...state,
        phase: MEASUREMENT_PHASES.COMPLETED,
        liveDistanceMeters: null,
<<<<<<< HEAD
        distanceMeters: totalDist > 0 ? totalDist : state.distanceMeters,
=======
        distanceMeters: totalDist ?? state.distanceMeters,
      };
    }

    case 'UNDO_POINT': {
      if (state.points.length === 0) return state;
      const nextPoints = state.points.slice(0, -1);

      if (nextPoints.length === 0) {
        return {
          ...state,
          phase: MEASUREMENT_PHASES.INITIAL,
          trackingStatus:
            state.trackingStatus === TRACKING_STATUSES.TRACKING_LOST
              ? TRACKING_STATUSES.TRACKING_LOST
              : state.capabilities?.hasARCorePlugin
                ? TRACKING_STATUSES.TRACKING
                : TRACKING_STATUSES.SCANNING,
          points: [],
          segments: [],
          distanceMeters: null,
          liveDistanceMeters: null,
        };
      }

      const nextSegments = state.segments.slice(0, Math.max(0, nextPoints.length - 1));
      const totalDist = sumValidSegments(nextSegments);

      return {
        ...state,
        phase: MEASUREMENT_PHASES.CHAIN,
        trackingStatus:
          state.trackingStatus === TRACKING_STATUSES.TRACKING_LOST
            ? TRACKING_STATUSES.TRACKING_LOST
            : TRACKING_STATUSES.TRACKING,
        points: nextPoints,
        segments: nextSegments,
        liveDistanceMeters: null,
        distanceMeters: nextPoints.length >= 2 ? totalDist : null,
>>>>>>> 879211a (Update AR Measure app)
      };
    }

    case 'RECEIVE_NATIVE_UPDATE': {
      const payload = action.payload ?? {};
      const nextTracking = Object.values(TRACKING_STATUSES).includes(payload.trackingStatus)
        ? payload.trackingStatus
        : state.trackingStatus;

<<<<<<< HEAD
      const hasPoints = Array.isArray(payload.points);
      const nextPoints = hasPoints
        ? payload.points.map((p) => parseProjectedPoint(p)).filter(Boolean)
        : state.points;

      const hasSegments = Array.isArray(payload.segments);
      const nextSegments = hasSegments
        ? payload.segments
        : state.segments;

      const hasLiveDistance = 'liveDistanceMeters' in payload;
      const nextLiveDistance = hasLiveDistance
        ? typeof payload.liveDistanceMeters === 'number' && Number.isFinite(payload.liveDistanceMeters)
          ? payload.liveDistanceMeters
          : null
        : nextPoints.length >= 2 && state.phase === MEASUREMENT_PHASES.COMPLETED
          ? null
          : state.liveDistanceMeters;

      let nextPhase = state.phase;
      if (payload.phase) {
        nextPhase = payload.phase;
=======
      let nextPoints = state.points;
      if (Array.isArray(payload.points)) {
        nextPoints = payload.points.map((p) => parseProjectedPoint(p)).filter(Boolean);
      } else if ('firstPoint' in payload || 'secondPoint' in payload) {
        const p1 = 'firstPoint' in payload ? parseProjectedPoint(payload.firstPoint) : state.points[0] ?? null;
        const p2 = 'secondPoint' in payload ? parseProjectedPoint(payload.secondPoint) : state.points[1] ?? null;
        nextPoints = [p1, p2].filter(Boolean);
      }

      let nextSegments = state.segments;
      if (Array.isArray(payload.segments)) {
        nextSegments = payload.segments.map((s) =>
          typeof s === 'number' && Number.isFinite(s) && s >= 0 ? roundMeters(s) : null
        );
      } else if (typeof payload.distanceMeters === 'number' && Number.isFinite(payload.distanceMeters) && payload.distanceMeters >= 0) {
        nextSegments = [roundMeters(payload.distanceMeters)];
      }

      let nextPhase = state.phase;
      if (Object.values(MEASUREMENT_PHASES).includes(payload.phase)) {
        nextPhase = payload.phase;
      } else if (nextPoints.length === 0) {
        nextPhase = MEASUREMENT_PHASES.INITIAL;
      } else if (
        !Array.isArray(payload.points) &&
        nextPoints.length >= 2 &&
        typeof payload.distanceMeters === 'number'
      ) {
        nextPhase = MEASUREMENT_PHASES.COMPLETED;
>>>>>>> 879211a (Update AR Measure app)
      } else if (nextPoints.length > 0 && nextPhase === MEASUREMENT_PHASES.INITIAL) {
        nextPhase = MEASUREMENT_PHASES.CHAIN;
      }

<<<<<<< HEAD
      const totalDist = nextSegments.reduce((acc, val) => acc + (val ?? 0), 0);
      const activeDist = nextSegments.length > 0 ? nextSegments[nextSegments.length - 1] : state.distanceMeters;
=======
      const hasLiveDistance = 'liveDistanceMeters' in payload;
      const nextLiveDistance =
        nextPhase === MEASUREMENT_PHASES.COMPLETED
          ? null
          : hasLiveDistance
            ? typeof payload.liveDistanceMeters === 'number' &&
              Number.isFinite(payload.liveDistanceMeters) &&
              payload.liveDistanceMeters >= 0
              ? roundMeters(payload.liveDistanceMeters)
              : null
            : state.liveDistanceMeters;

      const totalDist = sumValidSegments(nextSegments);
      const nextDistanceMeters =
        nextPoints.length >= 2
          ? totalDist ??
            (typeof payload.distanceMeters === 'number' &&
            Number.isFinite(payload.distanceMeters) &&
            payload.distanceMeters >= 0
              ? roundMeters(payload.distanceMeters)
              : null)
          : null;
>>>>>>> 879211a (Update AR Measure app)

      const nextCameraResolution =
        typeof payload.cameraResolution === 'string' && payload.cameraResolution.length > 0
          ? payload.cameraResolution
          : state.cameraResolution;
      const nextQualityMode =
        typeof payload.qualityMode === 'string' && payload.qualityMode.length > 0
          ? payload.qualityMode
          : state.qualityMode;
<<<<<<< HEAD
=======
      const nextAvailableQualities =
        Array.isArray(payload.availableQualities) && payload.availableQualities.length > 0
          ? payload.availableQualities
          : state.availableQualities;
      const nextAvailableZooms =
        Array.isArray(payload.availableZooms) && payload.availableZooms.length > 0
          ? payload.availableZooms
          : state.availableZooms;

      const nextDetectedPlanesCount =
        typeof payload.detectedPlanesCount === 'number' && Number.isFinite(payload.detectedPlanesCount)
          ? Math.max(0, Math.floor(payload.detectedPlanesCount))
          : state.detectedPlanesCount;
      const nextReticleHitType =
        'reticleHitType' in payload
          ? typeof payload.reticleHitType === 'string' && payload.reticleHitType.length > 0
            ? payload.reticleHitType
            : null
          : state.reticleHitType;
      const nextReticlePlaneType =
        'reticlePlaneType' in payload
          ? typeof payload.reticlePlaneType === 'string' && payload.reticlePlaneType.length > 0
            ? payload.reticlePlaneType
            : null
          : state.reticlePlaneType;
      const nextReticleWorldPoint =
        'reticleWorldPoint' in payload
          ? parseWorldPoint(payload.reticleWorldPoint)
          : state.reticleWorldPoint;
>>>>>>> 879211a (Update AR Measure app)

      return {
        ...state,
        trackingStatus: nextTracking,
        points: nextPoints,
        segments: nextSegments,
        liveDistanceMeters: nextLiveDistance,
<<<<<<< HEAD
        distanceMeters: totalDist > 0 ? totalDist : activeDist,
        phase: nextPhase,
        cameraResolution: nextCameraResolution,
        qualityMode: nextQualityMode,
=======
        distanceMeters: nextDistanceMeters,
        phase: nextPhase,
        detectedPlanesCount: nextDetectedPlanesCount,
        reticleHitType: nextReticleHitType,
        reticlePlaneType: nextReticlePlaneType,
        reticleWorldPoint: nextReticleWorldPoint,
        cameraResolution: nextCameraResolution,
        qualityMode: nextQualityMode,
        availableQualities: nextAvailableQualities,
        availableZooms: nextAvailableZooms,
>>>>>>> 879211a (Update AR Measure app)
      };
    }

    default:
      return state;
  }
}
