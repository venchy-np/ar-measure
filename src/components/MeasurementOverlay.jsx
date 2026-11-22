import React from 'react';
import MeasurementLine from './MeasurementLine.jsx';
import MeasurementPoint from './MeasurementPoint.jsx';
import DistanceLabel from './DistanceLabel.jsx';
import { MEASUREMENT_PHASES, RETICLE_CENTER_POINT } from '../utils/measurementState.js';

/**
 * Composite overlay displaying projected multi-point chain measurements,
 * connecting sky-blue lines between consecutive points, segment distance badges,
 * and live reticle aiming line when active.
 */
export default function MeasurementOverlay({
  points = [],
  segments = [],
  formattedSegments = [],
  formattedLiveDistance,
  phase,
  hasNativeDistance,
}) {
  if (!points || points.length === 0) return null;

  const isCompleted = phase === MEASUREMENT_PHASES.COMPLETED;
  const lastPoint = points[points.length - 1];
  const liveTargetPoint = RETICLE_CENTER_POINT;
  const showLiveLine = !isCompleted && lastPoint && lastPoint.visible !== false;

  return (
    <div
      data-testid="measurement-overlay"
      className="pointer-events-none absolute inset-0 z-10"
    >
      {/* Completed segment lines and distance badges */}
      {points.map((p, idx) => {
        if (idx === points.length - 1) return null;
        const nextP = points[idx + 1];
        const segDistText = formattedSegments[idx] ?? '';
        return (
          <React.Fragment key={`segment-${idx}`}>
            <MeasurementLine firstPoint={p} secondPoint={nextP} />
            {segDistText && (
              <DistanceLabel
                firstPoint={p}
                secondPoint={nextP}
                formattedDistance={segDistText}
                hasNativeDistance={hasNativeDistance}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Live aiming line from last placed point to center crosshair */}
      {showLiveLine && (
        <>
          <MeasurementLine firstPoint={lastPoint} secondPoint={liveTargetPoint} isLive={true} />
          {formattedLiveDistance && (
            <DistanceLabel
              firstPoint={lastPoint}
              secondPoint={liveTargetPoint}
              formattedDistance={formattedLiveDistance}
              hasNativeDistance={hasNativeDistance}
            />
          )}
        </>
      )}

      {/* Render all placed measurement point markers */}
      {points.map((p, idx) => (
        <MeasurementPoint
          key={`point-${idx}`}
          point={p}
          variant={idx === 0 ? 'first' : idx === points.length - 1 ? 'second' : 'intermediate'}
          index={idx + 1}
<<<<<<< HEAD
=======
          isLatest={idx === points.length - 1}
>>>>>>> 879211a (Update AR Measure app)
        />
      ))}
    </div>
  );
}
