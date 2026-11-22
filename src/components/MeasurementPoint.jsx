import React from 'react';

/**
 * Small circular endpoint marker anchored to projected normalized screen coordinates (0..1).
 */
export default function MeasurementPoint({ point, variant = 'first', index = 1 }) {
  if (!point || point.visible === false) return null;

  return (
    <div
      data-testid={`measurement-point-${index}`}
      aria-label={`Measurement point ${index}`}
      style={{
        left: `${point.x * 100}%`,
        top: `${point.y * 100}%`,
      }}
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
    >
      <span className="relative flex items-center justify-center">
        <span
          className="ar-endpoint-halo pointer-events-none absolute h-8 w-8 rounded-full border border-[#38BDF8]/75"
          aria-hidden="true"
        />
        <span className="ar-endpoint-marker relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-[#38BDF8] shadow-[0_0_0_3px_rgba(8,10,13,0.72)]">
          <span className="sr-only">Point {index}</span>
        </span>
      </span>
    </div>
  );
}
