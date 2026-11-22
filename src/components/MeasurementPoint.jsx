import React from 'react';

/**
 * Minimal iOS-inspired circular measurement endpoint marker anchored to
 * projected normalized screen coordinates (0..1), with no text or coordinate clutter.
 */
export default function MeasurementPoint({ point, index = 1 }) {
  if (!point || point.visible === false) return null;

  return (
    <div
      data-testid={`measurement-point-${index}`}
      data-hit-type={point.hitType ?? 'unknown'}
      data-plane-type={point.planeType ?? ''}
      aria-label={`Measurement point ${index}`}
      style={{
        left: `${point.x * 100}%`,
        top: `${point.y * 100}%`,
      }}
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
    >
      <span className="ar-endpoint-marker flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.65)]">
        <span className="sr-only">Point {index}</span>
      </span>
    </div>
  );
}
