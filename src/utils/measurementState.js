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
  FIRST_POINT: 'first_point',
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
  FIRST_POINT: 'Tap + to place the end point.',
  COMPLETED_NATIVE: 'Measurement complete.',
  COMPLETED_PREVIEW: 'Marks placed · Distance requires native ARCore.',
  TRACKING_LOST: 'Tracking lost. Move your device slowly.',
  INVALID_POINT: 'Unable to detect a valid measurement point.',
};

export const PREVIEW_DEFAULT_FIRST_POINT = { x: 0.34, y: 0.46 };
export const PREVIEW_DEFAULT_SECOND_POINT = { x: 0.66, y: 0.54 };
export const RETICLE_CENTER_POINT = { x: 0.5, y: 0.5 };

/**
 * Creates the initial measurement state object.
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
    firstPoint: null,
    secondPoint: null,
    distanceMeters: null,
    liveDistanceMeters: null,
    resetCount: 0,
    lastEventAt: 0,
    capabilities,
  };
}

/**
 * Resolves the contextual user instruction based on tracking status and phase.
 * Tracking lost and invalid point take precedence over normal phase instructions.
 * @param {{ phase: string, trackingStatus: string, distanceMeters: number | null, capabilities?: { hasARCorePlugin?: boolean } }} state
 * @returns {string}
 */
export function getContextualInstruction(state) {
  if (state.trackingStatus === TRACKING_STATUSES.TRACKING_LOST) {
    return INSTRUCTIONS.TRACKING_LOST;
  }
  if (state.trackingStatus === TRACKING_STATUSES.INVALID_POINT) {
    return INSTRUCTIONS.INVALID_POINT;
  }
  if (state.phase === MEASUREMENT_PHASES.FIRST_POINT) {
    return INSTRUCTIONS.FIRST_POINT;
  }
  if (state.phase === MEASUREMENT_PHASES.COMPLETED) {
    return typeof state.distanceMeters === 'number'
      ? INSTRUCTIONS.COMPLETED_NATIVE
      : INSTRUCTIONS.COMPLETED_PREVIEW;
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
 * @param {{ phase: string, trackingStatus: string, capabilities?: { hasARCorePlugin?: boolean } }} state
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
  if (state.phase === MEASUREMENT_PHASES.FIRST_POINT) {
    return { headerLabel, measurementLabel: 'Point 1 Set', tone: 'accent' };
  }
  if (state.phase === MEASUREMENT_PHASES.COMPLETED) {
    return { headerLabel, measurementLabel: 'Complete', tone: 'ready' };
  }
  return {
    headerLabel,
    measurementLabel: isNative ? 'Good tracking' : 'Ready',
    tone: isNative ? 'ready' : 'neutral',
  };
}

/**
 * Pure reducer managing two-point measurement transitions and native ARCore updates.
 */
export function measurementReducer(state, action) {
  switch (action.type) {
    case 'SET_UNIT': {
      if (!isValidUnit(action.unit)) return state;
      return { ...state, unit: action.unit };
    }

    case 'START_NEW_MEASUREMENT': {
      return {
        ...state,
        phase: MEASUREMENT_PHASES.INITIAL,
        trackingStatus: state.capabilities?.hasARCorePlugin
          ? TRACKING_STATUSES.TRACKING
          : TRACKING_STATUSES.SCANNING,
        firstPoint: null,
        secondPoint: null,
        distanceMeters: null,
        liveDistanceMeters: null,
      };
    }

    case 'PLACE_POINT': {
      if (state.trackingStatus === TRACKING_STATUSES.TRACKING_LOST) {
        return state;
      }

      if (state.phase === MEASUREMENT_PHASES.INITIAL) {
        const point =
          normalizeViewportPoint(action.point) ?? PREVIEW_DEFAULT_FIRST_POINT;
        return {
          ...state,
          phase: MEASUREMENT_PHASES.FIRST_POINT,
          trackingStatus: TRACKING_STATUSES.TRACKING,
          firstPoint: point,
          secondPoint: null,
          distanceMeters: null,
          liveDistanceMeters: null,
        };
      }

      if (state.phase === MEASUREMENT_PHASES.FIRST_POINT) {
        const point =
          normalizeViewportPoint(action.point) ?? PREVIEW_DEFAULT_SECOND_POINT;
        return {
          ...state,
          phase: MEASUREMENT_PHASES.COMPLETED,
          trackingStatus: TRACKING_STATUSES.TRACKING,
          secondPoint: point,
          liveDistanceMeters: null,
          // Underlying distance remains null unless supplied by native ARCore
          distanceMeters:
            typeof action.distanceMeters === 'number' &&
            Number.isFinite(action.distanceMeters) &&
            action.distanceMeters >= 0
              ? action.distanceMeters
              : state.distanceMeters,
        };
      }

      // If already completed, starting a new placement resets and places point 1
      const point =
        normalizeViewportPoint(action.point) ?? PREVIEW_DEFAULT_FIRST_POINT;
      return {
        ...state,
        phase: MEASUREMENT_PHASES.FIRST_POINT,
        trackingStatus: TRACKING_STATUSES.TRACKING,
        firstPoint: point,
        secondPoint: null,
        distanceMeters: null,
        liveDistanceMeters: null,
      };
    }

    case 'RESET': {
      return {
        ...state,
        phase: MEASUREMENT_PHASES.INITIAL,
        trackingStatus: state.capabilities?.hasARCorePlugin
          ? TRACKING_STATUSES.TRACKING
          : TRACKING_STATUSES.SCANNING,
        firstPoint: null,
        secondPoint: null,
        distanceMeters: null,
        liveDistanceMeters: null,
        resetCount: state.resetCount + 1,
      };
    }

    case 'RECEIVE_NATIVE_UPDATE': {
      const payload = action.payload ?? {};
      const nextTracking = Object.values(TRACKING_STATUSES).includes(payload.trackingStatus)
        ? payload.trackingStatus
        : state.trackingStatus;

      const hasFirst = 'firstPoint' in payload;
      const hasSecond = 'secondPoint' in payload;
      const hasDistance = 'distanceMeters' in payload;
      const hasLiveDistance = 'liveDistanceMeters' in payload;

      const nextFirst = hasFirst
        ? parseProjectedPoint(payload.firstPoint)
        : state.firstPoint;
      const nextSecond = hasSecond
        ? parseProjectedPoint(payload.secondPoint)
        : state.secondPoint;
      const nextDistance = hasDistance
        ? typeof payload.distanceMeters === 'number' &&
          Number.isFinite(payload.distanceMeters) &&
          payload.distanceMeters >= 0
          ? payload.distanceMeters
          : null
        : state.distanceMeters;
      const nextLiveDistance = hasLiveDistance
        ? typeof payload.liveDistanceMeters === 'number' &&
          Number.isFinite(payload.liveDistanceMeters) &&
          payload.liveDistanceMeters >= 0
          ? payload.liveDistanceMeters
          : null
        : nextSecond
          ? null
          : state.liveDistanceMeters;

      let nextPhase = state.phase;
      if (nextFirst && nextSecond) {
        nextPhase = MEASUREMENT_PHASES.COMPLETED;
      } else if (nextFirst) {
        nextPhase = MEASUREMENT_PHASES.FIRST_POINT;
      } else if (hasFirst && nextFirst === null) {
        nextPhase = MEASUREMENT_PHASES.INITIAL;
      }

      return {
        ...state,
        trackingStatus: nextTracking,
        firstPoint: nextFirst,
        secondPoint: nextSecond,
        distanceMeters: nextDistance,
        liveDistanceMeters: nextLiveDistance,
        phase: nextPhase,
      };
    }

    default:
      return state;
  }
}
