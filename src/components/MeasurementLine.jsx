import React from 'react';

/**
<<<<<<< HEAD
 * Crisp sky-blue SVG line connecting two measurement points or point to live reticle.
=======
 * Clean white SVG line connecting measurement points or point to live reticle.
>>>>>>> 879211a (Update AR Measure app)
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
<<<<<<< HEAD
        stroke="#080A0D"
        strokeOpacity="0.55"
        strokeWidth="4.5"
=======
        stroke="#000000"
        strokeOpacity="0.4"
        strokeWidth="4"
>>>>>>> 879211a (Update AR Measure app)
        strokeLinecap="round"
      />
      <line
        x1={`${firstPoint.x * 100}%`}
        y1={`${firstPoint.y * 100}%`}
        x2={`${secondPoint.x * 100}%`}
        y2={`${secondPoint.y * 100}%`}
<<<<<<< HEAD
        stroke="#38BDF8"
        strokeOpacity={isLive ? '0.78' : '0.98'}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray={isLive ? '6 6' : undefined}
=======
        stroke="#FFFFFF"
        strokeOpacity={isLive ? '0.75' : '0.98'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={isLive ? '5 5' : undefined}
>>>>>>> 879211a (Update AR Measure app)
      />
    </svg>
  );
}
