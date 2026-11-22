import React from 'react';
import { getSmartDistanceLabelLayout } from '../utils/measurementMath.js';

/**
<<<<<<< HEAD
 * Floating distance pill centered along the active measurement line.
 * Renders both live distance (while aiming from Point 1 to middle crosshair)
 * and final distance (when Point 2 is placed).
=======
 * Clean iOS-style solid white distance pill centered along a measurement segment.
>>>>>>> 879211a (Update AR Measure app)
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
<<<<<<< HEAD
      <div className="ar-distance-badge rounded-full border border-[#38BDF8]/80 bg-[#0F141C] px-3.5 py-1 shadow-xl shadow-black/80">
        <span className="font-mono-tabular text-xs sm:text-sm font-semibold tracking-tight text-white whitespace-nowrap">
=======
      <div className="ar-distance-badge rounded-full bg-white px-3 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
        <span className="font-mono-tabular text-xs sm:text-[13px] font-semibold tracking-tight text-[#111111] whitespace-nowrap">
>>>>>>> 879211a (Update AR Measure app)
          {formattedDistance}
        </span>
      </div>
    </div>
  );
}
