import { parseProjectedPoint } from './measurementMath.js';
import { TRACKING_STATUSES } from './measurementState.js';

function parseWorldPoint(point) {
  if (
    !point ||
    typeof point.x !== 'number' ||
    typeof point.y !== 'number' ||
    typeof point.z !== 'number' ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(point.z)
  ) {
    return null;
  }
  return {
    x: point.x,
    y: point.y,
    z: point.z,
  };
}

/**
 * Creates the initial reactive state for `useARBridge`.
 * @param {object} capabilities
 */
export function createInitialARBridgeState(capabilities) {
  const isNativeAR = Boolean(capabilities?.hasARCorePlugin);
  return {
    capabilities,
    isNativeAR,
    isInitialized: false,
    isSessionActive: false,
    trackingStatus: TRACKING_STATUSES.SCANNING,
    trackingFailureReason: null,
    error: null,
    anchors: {
      first: null,
      second: null,
      firstWorld: null,
      secondWorld: null,
    },
    distanceMeters: null,
  };
}

/**
 * Pure reducer managing reactive native ARCore bridge state:
 * tracking status, projected & world anchor positions, distance in metres,
 * session lifecycle, and bridge errors.
 */
export function arBridgeReducer(state, action) {
  switch (action.type) {
    case 'SESSION_INITIALIZED': {
      const payload = action.payload ?? {};
      const nextTracking = Object.values(TRACKING_STATUSES).includes(payload.trackingStatus)
        ? payload.trackingStatus
        : TRACKING_STATUSES.SCANNING;
      return {
        ...state,
        isInitialized: true,
        isSessionActive: true,
        trackingStatus: nextTracking,
        trackingFailureReason: null,
        error: null,
      };
    }

    case 'SESSION_STOPPED': {
      return {
        ...state,
        isInitialized: false,
        isSessionActive: false,
        trackingStatus: TRACKING_STATUSES.SCANNING,
        trackingFailureReason: null,
        anchors: {
          first: null,
          second: null,
          firstWorld: null,
          secondWorld: null,
        },
        distanceMeters: null,
      };
    }

    case 'RESET_ANCHORS': {
      return {
        ...state,
        trackingStatus: state.isNativeAR
          ? TRACKING_STATUSES.TRACKING
          : TRACKING_STATUSES.SCANNING,
        trackingFailureReason: null,
        error: null,
        anchors: {
          first: null,
          second: null,
          firstWorld: null,
          secondWorld: null,
        },
        distanceMeters: null,
      };
    }

    case 'SET_ERROR': {
      const nextTracking = Object.values(TRACKING_STATUSES).includes(action.trackingStatus)
        ? action.trackingStatus
        : state.trackingStatus;
      return {
        ...state,
        trackingStatus: nextTracking,
        error: action.error ?? null,
      };
    }

    case 'NATIVE_EVENT': {
      const payload = action.payload ?? {};
      const nextTracking = Object.values(TRACKING_STATUSES).includes(payload.trackingStatus)
        ? payload.trackingStatus
        : state.trackingStatus;

      const nextFailureReason =
        'trackingFailureReason' in payload
          ? payload.trackingFailureReason ?? null
          : nextTracking === TRACKING_STATUSES.TRACKING
            ? null
            : state.trackingFailureReason;

      const hasFirst = 'firstPoint' in payload;
      const hasSecond = 'secondPoint' in payload;
      const hasFirstWorld = 'firstWorldPoint' in payload;
      const hasSecondWorld = 'secondWorldPoint' in payload;
      const hasDistance = 'distanceMeters' in payload;

      const nextFirst = hasFirst ? parseProjectedPoint(payload.firstPoint) : state.anchors.first;
      const nextSecond = hasSecond ? parseProjectedPoint(payload.secondPoint) : state.anchors.second;
      const nextFirstWorld = hasFirstWorld
        ? parseWorldPoint(payload.firstWorldPoint)
        : state.anchors.firstWorld;
      const nextSecondWorld = hasSecondWorld
        ? parseWorldPoint(payload.secondWorldPoint)
        : state.anchors.secondWorld;

      const nextDistance = hasDistance
        ? typeof payload.distanceMeters === 'number' &&
          Number.isFinite(payload.distanceMeters) &&
          payload.distanceMeters >= 0
          ? payload.distanceMeters
          : null
        : state.distanceMeters;

      const nextError =
        'error' in payload
          ? payload.error ?? null
          : nextTracking === TRACKING_STATUSES.TRACKING
            ? null
            : state.error;

      return {
        ...state,
        isSessionActive:
          typeof payload.isSessionActive === 'boolean'
            ? payload.isSessionActive
            : state.isSessionActive,
        trackingStatus: nextTracking,
        trackingFailureReason: nextFailureReason,
        error: nextError,
        anchors: {
          first: nextFirst,
          second: nextSecond,
          firstWorld: nextFirstWorld,
          secondWorld: nextSecondWorld,
        },
        distanceMeters: nextDistance,
      };
    }

    default:
      return state;
  }
}
