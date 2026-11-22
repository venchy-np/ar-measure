import React from 'react';
import { RETICLE_CENTER_POINT } from '../utils/measurementState.js';

/**
 * Crisp sky-blue SVG line connecting the first measurement point to either
 * the second measurement point (completed) or the live middle crosshair (aiming).
 */
export default function MeasurementLine({ firstPoint, secondPoint }) {
  if (!firstPoint || firstPoint.visible === false) return null;
  if (secondPoint && secondPoint.visible === false) return null;

  const isCompleted = Boolean(secondPoint);
  const endPoint = secondPoint ?? RETICLE_CENTER_POINT;

  return (
    <svg
      data-testid="measurement-line"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
    >
      <line
        x1={`${firstPoint.x * 100}%`}
        y1={`${firstPoint.y * 100}%`}
        x2={`${endPoint.x * 100}%`}
        y2={`${endPoint.y * 100}%`}
        stroke="#080A0D"
        strokeOpacity="0.55"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <line
        x1={`${firstPoint.x * 100}%`}
        y1={`${firstPoint.y * 100}%`}
        x2={`${endPoint.x * 100}%`}
        y2={`${endPoint.y * 100}%`}
        stroke="#38BDF8"
        strokeOpacity={isCompleted ? '0.98' : '0.88'}
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
