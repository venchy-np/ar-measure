import React from 'react';
import MeasurementLine from './MeasurementLine.jsx';
import MeasurementPoint from './MeasurementPoint.jsx';
import DistanceLabel from './DistanceLabel.jsx';
import { MEASUREMENT_PHASES, RETICLE_CENTER_POINT } from '../utils/measurementState.js';

/**
 * Composite overlay displaying projected measurement points,
 * connecting ice-blue line (live to center crosshair until second point is placed),
 * and floating live or final distance label.
 */
export default function MeasurementOverlay({
  firstPoint,
  secondPoint,
  phase,
  formattedDistance,
  formattedLiveDistance,
  hasNativeDistance,
}) {
  if (!firstPoint) return null;

  const isCompleted = phase === MEASUREMENT_PHASES.COMPLETED && Boolean(secondPoint);
  const labelTargetPoint = isCompleted ? secondPoint : RETICLE_CENTER_POINT;
  const activeLabelText = isCompleted ? formattedDistance : formattedLiveDistance;
  const shouldShowLabel = isCompleted || Boolean(formattedLiveDistance);

  return (
    <div
      data-testid="measurement-overlay"
      className="pointer-events-none absolute inset-0 z-10"
    >
      <MeasurementLine firstPoint={firstPoint} secondPoint={secondPoint} />
      <MeasurementPoint point={firstPoint} variant="first" />
      <MeasurementPoint point={secondPoint} variant="second" />
      {shouldShowLabel && activeLabelText && (
        <DistanceLabel
          firstPoint={firstPoint}
          secondPoint={labelTargetPoint}
          formattedDistance={activeLabelText}
          hasNativeDistance={hasNativeDistance}
        />
      )}
    </div>
  );
}
