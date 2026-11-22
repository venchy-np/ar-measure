import {
  DEFAULT_UNIT,
  isValidUnit,
  normalizeViewportPoint,
  parseProjectedPoint,
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

export const PREVIEW_DEFAULT_FIRST_POINT = { x: 0.3, y: 0.5 };
export const RETICLE_CENTER_POINT = { x: 0.5, y: 0.5 };

/**
 * Creates the initial measurement state object supporting multi-point chain measurements.
 * @param {string} [preferredUnit]
 * @param {object} [capabilities]
 */
export function createInitialMeasurementState(
  preferredUnit = DEFAULT_UNIT,
  capabilities = { hasARCorePlugin: false, isCapacitorNative: false, platform: 'web', pluginName: 'ARMeasurePlugin' }
) {
  return {
    unit: isValidUnit(preferredUnit) ? preferredUnit : DEFAULT_UNIT,
    phase: MEASUREMENT_PHASES.INITIAL,
    trackingStatus: capabilities.hasARCorePlugin
      ? TRACKING_STATUSES.TRACKING
      : TRACKING_STATUSES.SCANNING,
    points: [], // Array of { x, y, visible }
    segments: [], // Array of distance numbers in metres
    distanceMeters: null,
    liveDistanceMeters: null,
    cameraResolution: '1920x1080 (1080p HD)',
    qualityMode: 'High Quality (1080p)',
    zoom: '1x',
    resetCount: 0,
    lastEventAt: 0,
    capabilities,
  };
}

/**
 * Resolves the contextual user instruction based on tracking status and phase.
 * @param {{ phase: string, trackingStatus: string, points: Array, capabilities?: { hasARCorePlugin?: boolean } }} state
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
    return { headerLabel, measurementLabel: `${state.points.length} Points Complete`, tone: 'ready' };
  }
  return {
    headerLabel,
    measurementLabel: isNative ? 'Good tracking' : 'Ready',
    tone: isNative ? 'ready' : 'neutral',
  };
}

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
        qualityMode: action.qualityMode,
        cameraResolution: action.cameraResolution ?? action.qualityMode,
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

      const nextPoints = [...state.points, point];
      const nextSegments = [...state.segments];

      if (nextPoints.length >= 2) {
        const pPrev = nextPoints[nextPoints.length - 2];
        const pCurr = nextPoints[nextPoints.length - 1];
        const segDist =
          typeof action.segmentDistanceMeters === 'number' && Number.isFinite(action.segmentDistanceMeters)
            ? action.segmentDistanceMeters
            : Math.sqrt(Math.pow(pCurr.x - pPrev.x, 2) + Math.pow(pCurr.y - pPrev.y, 2)) * 2.2;
        nextSegments.push(segDist);
      }

      const activeDist = nextSegments.length > 0 ? nextSegments[nextSegments.length - 1] : null;

      return {
        ...state,
        phase: MEASUREMENT_PHASES.CHAIN,
        trackingStatus: TRACKING_STATUSES.TRACKING,
        points: nextPoints,
        segments: nextSegments,
        liveDistanceMeters: null,
        distanceMeters: activeDist,
      };
    }

    case 'COMPLETE_MEASUREMENT': {
      if (state.points.length < 2) return state;
      const totalDist = state.segments.reduce((acc, val) => acc + (val ?? 0), 0);
      return {
        ...state,
        phase: MEASUREMENT_PHASES.COMPLETED,
        liveDistanceMeters: null,
        distanceMeters: totalDist > 0 ? totalDist : state.distanceMeters,
      };
    }

    case 'RECEIVE_NATIVE_UPDATE': {
      const payload = action.payload ?? {};
      const nextTracking = Object.values(TRACKING_STATUSES).includes(payload.trackingStatus)
        ? payload.trackingStatus
        : state.trackingStatus;

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
      } else if (nextPoints.length > 0 && nextPhase === MEASUREMENT_PHASES.INITIAL) {
        nextPhase = MEASUREMENT_PHASES.CHAIN;
      }

      const totalDist = nextSegments.reduce((acc, val) => acc + (val ?? 0), 0);
      const activeDist = nextSegments.length > 0 ? nextSegments[nextSegments.length - 1] : state.distanceMeters;

      const nextCameraResolution =
        typeof payload.cameraResolution === 'string' && payload.cameraResolution.length > 0
          ? payload.cameraResolution
          : state.cameraResolution;
      const nextQualityMode =
        typeof payload.qualityMode === 'string' && payload.qualityMode.length > 0
          ? payload.qualityMode
          : state.qualityMode;

      return {
        ...state,
        trackingStatus: nextTracking,
        points: nextPoints,
        segments: nextSegments,
        liveDistanceMeters: nextLiveDistance,
        distanceMeters: totalDist > 0 ? totalDist : activeDist,
        phase: nextPhase,
        cameraResolution: nextCameraResolution,
        qualityMode: nextQualityMode,
      };
    }

    default:
      return state;
  }
}
