import React from 'react';
import { getSmartDistanceLabelLayout } from '../utils/measurementMath.js';

/**
 * Clean iOS-style solid white distance pill centered along a measurement segment.
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
      <div className="ar-distance-badge rounded-full bg-white px-3 py-1 shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
        <span className="font-mono-tabular text-xs sm:text-[13px] font-semibold tracking-tight text-[#111111] whitespace-nowrap">
          {formattedDistance}
        </span>
      </div>
    </div>
  );
}
