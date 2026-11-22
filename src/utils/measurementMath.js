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

<<<<<<< HEAD
/**
 * Clamps a normalized viewport coordinate point ({ x, y } in 0..1) for web preview taps.
 * @param {{ x: number, y: number } | null | undefined} point
 * @param {number} [margin=0.08]
 * @returns {{ x: number, y: number, visible: boolean } | null}
=======
export function parseWorldPoint(worldPoint) {
  if (
    !worldPoint ||
    typeof worldPoint.x !== 'number' ||
    typeof worldPoint.y !== 'number' ||
    typeof worldPoint.z !== 'number' ||
    !Number.isFinite(worldPoint.x) ||
    !Number.isFinite(worldPoint.y) ||
    !Number.isFinite(worldPoint.z)
  ) {
    return null;
  }
  return {
    x: Number(worldPoint.x.toFixed(4)),
    y: Number(worldPoint.y.toFixed(4)),
    z: Number(worldPoint.z.toFixed(4)),
  };
}

/**
 * Clamps a normalized viewport coordinate point ({ x, y } in 0..1) for web preview taps.
 * Preserves optional 3D hit metadata (`worldPoint`, `hitType`, `planeType`) when provided.
 * @param {{ x: number, y: number, visible?: boolean, worldPoint?: { x: number, y: number, z: number }, hitType?: string, planeType?: string } | null | undefined} point
 * @param {number} [margin=0.08]
 * @returns {{ x: number, y: number, visible: boolean, worldPoint?: { x: number, y: number, z: number }, hitType?: string, planeType?: string } | null}
>>>>>>> 879211a (Update AR Measure app)
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
<<<<<<< HEAD
  return {
=======
  const result = {
>>>>>>> 879211a (Update AR Measure app)
    x: Number(clamp(point.x).toFixed(4)),
    y: Number(clamp(point.y).toFixed(4)),
    visible: point.visible !== false,
  };
<<<<<<< HEAD
=======
  const parsedWorld = parseWorldPoint(point.worldPoint);
  if (parsedWorld) result.worldPoint = parsedWorld;
  if (typeof point.hitType === 'string' && point.hitType.length > 0) {
    result.hitType = point.hitType;
  }
  if (typeof point.planeType === 'string' && point.planeType.length > 0) {
    result.planeType = point.planeType;
  }
  return result;
>>>>>>> 879211a (Update AR Measure app)
}

/**
 * Parses a projected screen coordinate from native ARCore without clamping
<<<<<<< HEAD
 * off-screen coordinates, preserving perspective geometry and behind-camera visibility.
 * @param {{ x: number, y: number, visible?: boolean } | null | undefined} point
 * @returns {{ x: number, y: number, visible: boolean } | null}
=======
 * off-screen coordinates, preserving perspective geometry, behind-camera visibility,
 * and optional 3D world-space hit metadata when present.
 * @param {{ x: number, y: number, visible?: boolean, worldPoint?: { x: number, y: number, z: number }, hitType?: string, planeType?: string } | null | undefined} point
 * @returns {{ x: number, y: number, visible: boolean, worldPoint?: { x: number, y: number, z: number }, hitType?: string, planeType?: string } | null}
>>>>>>> 879211a (Update AR Measure app)
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
<<<<<<< HEAD
  return {
=======
  const result = {
>>>>>>> 879211a (Update AR Measure app)
    x: Number(point.x.toFixed(4)),
    y: Number(point.y.toFixed(4)),
    visible: point.visible !== false,
  };
<<<<<<< HEAD
=======
  const parsedWorld = parseWorldPoint(point.worldPoint);
  if (parsedWorld) result.worldPoint = parsedWorld;
  if (typeof point.hitType === 'string' && point.hitType.length > 0) {
    result.hitType = point.hitType;
  }
  if (typeof point.planeType === 'string' && point.planeType.length > 0) {
    result.planeType = point.planeType;
  }
  return result;
}

export const DEFAULT_WEB_DETECTED_PLANES = [
  {
    id: 'detected-floor-plane',
    point: { x: 0, y: -1.15, z: -1.5 },
    normal: { x: 0, y: 1, z: 0 },
    planeType: 'horizontal',
    maxDistance: 12,
  },
  {
    id: 'detected-wall-plane',
    point: { x: 0, y: 0, z: -3.8 },
    normal: { x: 0, y: 0, z: 1 },
    planeType: 'vertical',
    maxDistance: 12,
  },
];

/**
 * Converts normalized screen coordinates (0..1, top-left origin) into a unit 3D ray
 * in camera space looking down -Z.
 * @param {{ x: number, y: number }} normalizedPoint
 * @param {{ verticalFovDeg?: number, aspectRatio?: number, cameraPosition?: { x: number, y: number, z: number } }} [options]
 */
export function screenToRay(normalizedPoint, options = {}) {
  if (
    !normalizedPoint ||
    typeof normalizedPoint.x !== 'number' ||
    typeof normalizedPoint.y !== 'number' ||
    !Number.isFinite(normalizedPoint.x) ||
    !Number.isFinite(normalizedPoint.y)
  ) {
    return null;
  }

  const verticalFovDeg =
    typeof options.verticalFovDeg === 'number' && options.verticalFovDeg > 0 && options.verticalFovDeg < 179
      ? options.verticalFovDeg
      : 60;
  const aspectRatio =
    typeof options.aspectRatio === 'number' && Number.isFinite(options.aspectRatio) && options.aspectRatio > 0
      ? options.aspectRatio
      : 9 / 16;
  const cam = options.cameraPosition ?? { x: 0, y: 0, z: 0 };

  const ndcX = normalizedPoint.x * 2 - 1;
  const ndcY = 1 - normalizedPoint.y * 2;
  const halfTanY = Math.tan((verticalFovDeg * Math.PI) / 360);
  const halfTanX = halfTanY * aspectRatio;

  const rawX = ndcX * halfTanX;
  const rawY = ndcY * halfTanY;
  const rawZ = -1;
  const len = Math.hypot(rawX, rawY, rawZ);

  return {
    origin: {
      x: Number(cam.x.toFixed(4)),
      y: Number(cam.y.toFixed(4)),
      z: Number(cam.z.toFixed(4)),
    },
    direction: {
      x: Number((rawX / len).toFixed(6)),
      y: Number((rawY / len).toFixed(6)),
      z: Number((rawZ / len).toFixed(6)),
    },
  };
}

/**
 * Intersects a 3D ray with a detected plane defined by a point and unit normal.
 * Rejects parallel rays, intersections behind the camera, and hits outside optional plane bounds/radius.
 * @param {{ origin: { x: number, y: number, z: number }, direction: { x: number, y: number, z: number } } | null} ray
 * @param {{ id?: string, point: { x: number, y: number, z: number }, normal: { x: number, y: number, z: number }, planeType?: string, maxDistance?: number, radius?: number }} plane
 */
export function intersectRayWithPlane(ray, plane) {
  if (!ray || !plane?.point || !plane?.normal) return null;

  const denom =
    ray.direction.x * plane.normal.x +
    ray.direction.y * plane.normal.y +
    ray.direction.z * plane.normal.z;

  if (Math.abs(denom) < 1e-6) return null;

  const diffX = plane.point.x - ray.origin.x;
  const diffY = plane.point.y - ray.origin.y;
  const diffZ = plane.point.z - ray.origin.z;

  const t =
    (diffX * plane.normal.x + diffY * plane.normal.y + diffZ * plane.normal.z) / denom;

  const maxDistance = typeof plane.maxDistance === 'number' && plane.maxDistance > 0 ? plane.maxDistance : 12;
  if (!Number.isFinite(t) || t <= 0.05 || t > maxDistance) {
    return null;
  }

  const worldPoint = {
    x: Number((ray.origin.x + ray.direction.x * t).toFixed(4)),
    y: Number((ray.origin.y + ray.direction.y * t).toFixed(4)),
    z: Number((ray.origin.z + ray.direction.z * t).toFixed(4)),
  };

  if (typeof plane.radius === 'number' && plane.radius > 0) {
    const distFromCenter = Math.hypot(
      worldPoint.x - plane.point.x,
      worldPoint.y - plane.point.y,
      worldPoint.z - plane.point.z
    );
    if (distFromCenter > plane.radius) {
      return null;
    }
  }

  return {
    worldPoint,
    distanceMeters: Number(t.toFixed(4)),
    hitType: 'plane',
    planeType: plane.planeType ?? 'horizontal',
    planeId: plane.id ?? null,
  };
}

/**
 * Projects normalized screen coordinates against detected 3D planes using ray-plane hit-testing,
 * selecting the closest valid intersection along the viewing ray.
 * @param {{ x: number, y: number }} normalizedPoint
 * @param {Array} [detectedPlanes]
 * @param {{ verticalFovDeg?: number, aspectRatio?: number, cameraPosition?: { x: number, y: number, z: number } }} [options]
 */
export function hitTestDetectedPlanes(
  normalizedPoint,
  detectedPlanes = DEFAULT_WEB_DETECTED_PLANES,
  options = {}
) {
  const ray = screenToRay(normalizedPoint, options);
  if (!ray || !Array.isArray(detectedPlanes) || detectedPlanes.length === 0) {
    return null;
  }

  let closestHit = null;
  for (const plane of detectedPlanes) {
    const hit = intersectRayWithPlane(ray, plane);
    if (hit && (!closestHit || hit.distanceMeters < closestHit.distanceMeters)) {
      closestHit = hit;
    }
  }
  return closestHit;
>>>>>>> 879211a (Update AR Measure app)
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
