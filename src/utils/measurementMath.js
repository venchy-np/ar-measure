/**
 * Pure measurement unit conversions and coordinate utilities.
 *
 * Underlying measurements are always stored in metres and converted
 * purely for display. Browser screen coordinates are never converted
 * into fake real-world distances.
 */

export const MEASUREMENT_UNITS = [
  { id: 'm', label: 'm', name: 'Metres', factorFromMeters: 1, decimals: 2 },
  { id: 'cm', label: 'cm', name: 'Centimetres', factorFromMeters: 100, decimals: 1 },
  { id: 'mm', label: 'mm', name: 'Millimetres', factorFromMeters: 1000, decimals: 0 },
  { id: 'in', label: 'in', name: 'Inches', factorFromMeters: 39.37007874015748, decimals: 1 },
  { id: 'ft', label: 'ft', name: 'Feet', factorFromMeters: 3.280839895013123, decimals: 2 },
];

export const UI_MEASUREMENT_UNITS = [
  MEASUREMENT_UNITS.find((u) => u.id === 'cm'),
  MEASUREMENT_UNITS.find((u) => u.id === 'ft'),
  MEASUREMENT_UNITS.find((u) => u.id === 'm'),
];

export const DEFAULT_UNIT = 'cm';

/**
 * Checks whether a unit ID is supported.
 * @param {string} unit
 * @returns {boolean}
 */
export function isValidUnit(unit) {
  return MEASUREMENT_UNITS.some((item) => item.id === unit);
}

/**
 * Looks up metadata for a measurement unit.
 * @param {string} unit
 */
export function getUnitConfig(unit) {
  return (
    MEASUREMENT_UNITS.find((item) => item.id === unit) ??
    MEASUREMENT_UNITS.find((item) => item.id === DEFAULT_UNIT)
  );
}

/**
 * Converts a distance in metres to the target display unit.
 * Returns null if distanceMeters is null, undefined, NaN, or negative.
 * @param {number | null | undefined} distanceMeters
 * @param {string} unit
 * @returns {number | null}
 */
export function convertMetersToUnit(distanceMeters, unit) {
  if (
    typeof distanceMeters !== 'number' ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters < 0
  ) {
    return null;
  }
  const config = getUnitConfig(unit);
  return distanceMeters * config.factorFromMeters;
}

/**
 * Formats an underlying distance in metres into the selected unit string.
 * When no native distance is available (null), returns "-- <unit>".
 * @param {number | null | undefined} distanceMeters
 * @param {string} unit
 * @returns {string}
 */
export function formatDistance(distanceMeters, unit) {
  const config = getUnitConfig(unit);
  const converted = convertMetersToUnit(distanceMeters, config.id);
  if (converted === null) {
    return `-- ${config.label}`;
  }
  return `${converted.toFixed(config.decimals)} ${config.label}`;
}

/**
 * Clamps a normalized viewport coordinate point ({ x, y } in 0..1) for web preview taps.
 * @param {{ x: number, y: number } | null | undefined} point
 * @param {number} [margin=0.08]
 * @returns {{ x: number, y: number, visible: boolean } | null}
 */
export function normalizeViewportPoint(point, margin = 0.08) {
  if (
    !point ||
    typeof point.x !== 'number' ||
    typeof point.y !== 'number' ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    return null;
  }
  const clamp = (val) => Math.min(1 - margin, Math.max(margin, val));
  return {
    x: Number(clamp(point.x).toFixed(4)),
    y: Number(clamp(point.y).toFixed(4)),
    visible: point.visible !== false,
  };
}

/**
 * Parses a projected screen coordinate from native ARCore without clamping
 * off-screen coordinates, preserving perspective geometry and behind-camera visibility.
 * @param {{ x: number, y: number, visible?: boolean } | null | undefined} point
 * @returns {{ x: number, y: number, visible: boolean } | null}
 */
export function parseProjectedPoint(point) {
  if (
    !point ||
    typeof point.x !== 'number' ||
    typeof point.y !== 'number' ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    return null;
  }
  return {
    x: Number(point.x.toFixed(4)),
    y: Number(point.y.toFixed(4)),
    visible: point.visible !== false,
  };
}

/**
 * Converts client pixel coordinates (e.g. pointer tap) into normalized full-window
 * coordinates (0..1) matching the underlying full-screen native ARCore GLSurfaceView.
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} windowWidth
 * @param {number} windowHeight
 * @returns {{ x: number, y: number } | null}
 */
export function clientPointToWindowNormalized(clientX, clientY, windowWidth, windowHeight) {
  if (
    typeof clientX !== 'number' ||
    typeof clientY !== 'number' ||
    typeof windowWidth !== 'number' ||
    typeof windowHeight !== 'number' ||
    !Number.isFinite(clientX) ||
    !Number.isFinite(clientY) ||
    windowWidth <= 0 ||
    windowHeight <= 0
  ) {
    return null;
  }
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  return {
    x: Number(clamp01(clientX / windowWidth).toFixed(4)),
    y: Number(clamp01(clientY / windowHeight).toFixed(4)),
  };
}

/**
 * Computes the normalized full-window center of a DOMRect (e.g. aiming reticle).
 * Falls back to { x: 0.5, y: 0.5 } if dimensions are unavailable.
 * @param {{ left: number, top: number, width: number, height: number } | null | undefined} rect
 * @param {number} windowWidth
 * @param {number} windowHeight
 * @returns {{ x: number, y: number }}
 */
export function getRectCenterWindowNormalized(rect, windowWidth, windowHeight) {
  if (!rect || rect.width <= 0 || rect.height <= 0 || windowWidth <= 0 || windowHeight <= 0) {
    return { x: 0.5, y: 0.5 };
  }
  const center = clientPointToWindowNormalized(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
    windowWidth,
    windowHeight
  );
  return center ?? { x: 0.5, y: 0.5 };
}

/**
 * Maps a full-window normalized point from the native ARCore GLSurfaceView into
 * ARViewport-local normalized coordinates so markers align with the inset viewport.
 * @param {{ x: number, y: number, visible?: boolean } | null | undefined} point
 * @param {{ left: number, top: number, width: number, height: number } | null | undefined} viewportRect
 * @param {{ width: number, height: number } | null | undefined} windowSize
 * @returns {{ x: number, y: number, visible: boolean } | null}
 */
export function windowNormalizedToViewport(point, viewportRect, windowSize) {
  const parsed = parseProjectedPoint(point);
  if (!parsed) return null;
  if (
    !viewportRect ||
    !windowSize ||
    viewportRect.width <= 0 ||
    viewportRect.height <= 0 ||
    windowSize.width <= 0 ||
    windowSize.height <= 0
  ) {
    return parsed;
  }

  const pixelX = parsed.x * windowSize.width;
  const pixelY = parsed.y * windowSize.height;

  return {
    x: Number(((pixelX - viewportRect.left) / viewportRect.width).toFixed(4)),
    y: Number(((pixelY - viewportRect.top) / viewportRect.height).toFixed(4)),
    visible: parsed.visible,
  };
}

/**
 * Computes the normalized midpoint between two projected screen points.
 * @param {{ x: number, y: number } | null} firstPoint
 * @param {{ x: number, y: number } | null} secondPoint
 * @returns {{ x: number, y: number } | null}
 */
export function getLineMidpoint(firstPoint, secondPoint) {
  if (!firstPoint || !secondPoint) return null;
  return {
    x: (firstPoint.x + secondPoint.x) / 2,
    y: (firstPoint.y + secondPoint.y) / 2,
  };
}

/**
 * Computes edge-safe coordinates and vertical placement ('above' | 'below') for the
 * floating distance badge so it never clips outside the viewport or collides with top UI.
 * @param {{ x: number, y: number, visible?: boolean } | null} firstPoint
 * @param {{ x: number, y: number, visible?: boolean } | null} secondPoint
 * @returns {{ x: number, y: number, placement: 'above' | 'below' } | null}
 */
export function getSmartDistanceLabelLayout(firstPoint, secondPoint) {
  if (
    !firstPoint ||
    !secondPoint ||
    firstPoint.visible === false ||
    secondPoint.visible === false
  ) {
    return null;
  }
  const midpoint = getLineMidpoint(firstPoint, secondPoint);
  if (!midpoint) return null;

  const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
  const clampedX = Number(clamp(midpoint.x, 0.14, 0.86).toFixed(4));
  const clampedY = Number(clamp(midpoint.y, 0.14, 0.86).toFixed(4));
  const placement = clampedY < 0.24 ? 'below' : 'above';

  return {
    x: clampedX,
    y: clampedY,
    placement,
  };
}
