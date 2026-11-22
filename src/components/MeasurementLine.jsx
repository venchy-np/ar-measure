import React from 'react';

/**
 * Clean white SVG line connecting measurement points or point to live reticle.
 */
export default function MeasurementLine({ firstPoint, secondPoint, isLive = false }) {
  if (!firstPoint || firstPoint.visible === false) return null;
  if (!secondPoint || secondPoint.visible === false) return null;

  return (
    <svg
      data-testid="measurement-line"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
    >
      <line
        x1={`${firstPoint.x * 100}%`}
        y1={`${firstPoint.y * 100}%`}
        x2={`${secondPoint.x * 100}%`}
        y2={`${secondPoint.y * 100}%`}
        stroke="#000000"
        strokeOpacity="0.4"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1={`${firstPoint.x * 100}%`}
        y1={`${firstPoint.y * 100}%`}
        x2={`${secondPoint.x * 100}%`}
        y2={`${secondPoint.y * 100}%`}
        stroke="#FFFFFF"
        strokeOpacity={isLive ? '0.75' : '0.98'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={isLive ? '5 5' : undefined}
      />
    </svg>
  );
}
