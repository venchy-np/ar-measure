import React from 'react';
import { getSmartDistanceLabelLayout } from '../utils/measurementMath.js';

/**
 * Floating distance pill centered along the active measurement line.
 * Renders both live distance (while aiming from Point 1 to middle crosshair)
 * and final distance (when Point 2 is placed).
 */
export default function DistanceLabel({
  firstPoint,
  secondPoint,
  formattedDistance,
  hasNativeDistance,
}) {
  const layout = getSmartDistanceLabelLayout(firstPoint, secondPoint);
  if (!layout) {
    return null;
  }

  return (
    <div
      data-testid="floating-distance-label"
      data-placement={layout.placement}
      role="status"
      aria-live="polite"
      aria-label={
        hasNativeDistance ? formattedDistance : `${formattedDistance} (native ARCore required)`
      }
      style={{
        left: `${layout.x * 100}%`,
        top: `${layout.y * 100}%`,
      }}
      className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-1/2"
    >
      <div className="ar-distance-badge rounded-full border border-[#38BDF8]/80 bg-[#0F141C] px-3.5 py-1 shadow-xl shadow-black/80">
        <span className="font-mono-tabular text-xs sm:text-sm font-semibold tracking-tight text-white whitespace-nowrap">
          {formattedDistance}
        </span>
      </div>
    </div>
  );
}
