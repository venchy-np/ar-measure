import React, { useState } from 'react';
import { Check, Plus, RotateCcw } from 'lucide-react';
import { UI_MEASUREMENT_UNITS } from '../utils/measurementMath.js';
import { MEASUREMENT_PHASES, TRACKING_STATUSES } from '../utils/measurementState.js';

/**
 * Minimal iOS-inspired floating bottom HUD:
 * - Solid segmented unit control (`cm | ft | m`)
 * - Clean 3-button shutter row: Reset (Left), `+` Shutter (Center), Done `✓` (Right)
 */
export default function MeasurementControls({
  unit,
  phase,
  trackingStatus,
  points = [],
  formattedDistance,
  formattedLiveDistance,
  onUnitChange,
  onPlacePoint,
  onCompleteMeasurement,
  onStartNewMeasurement,
  onReset,
  statusSummary,
  resetCount,
}) {
  const [isPlacing, setIsPlacing] = useState(false);

  const isTrackingLost = trackingStatus === TRACKING_STATUSES.TRACKING_LOST;
  const isInitial = phase === MEASUREMENT_PHASES.INITIAL || points.length === 0;
  const isCompleted = phase === MEASUREMENT_PHASES.COMPLETED;

  const handlePlusAction = async () => {
    if (isPlacing) return;
    if (isCompleted) {
      await onStartNewMeasurement();
      return;
    }
    setIsPlacing(true);
    try {
      await onPlacePoint();
    } finally {
      setIsPlacing(false);
    }
  };

  const handleDoneAction = async () => {
    if (isPlacing) return;
    if (isCompleted) {
      await onStartNewMeasurement();
      return;
    }
    if (points.length >= 2) {
      await onCompleteMeasurement();
      return;
    }
    if (points.length === 1) {
      setIsPlacing(true);
      try {
        const placed = await onPlacePoint();
        if (placed !== false) {
          await onCompleteMeasurement();
        }
      } finally {
        setIsPlacing(false);
      }
    }
  };

  const isDoneDisabled = isInitial || (points.length === 0 && isTrackingLost);
  const activeReadout =
    points.length >= 1 ? (formattedLiveDistance ?? formattedDistance) : formattedDistance;

  return (
    <footer className="ar-hud-bottom pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {/* Accessible screen-reader readout */}
      <div className="sr-only">
        <span data-testid="measurement-status">{statusSummary.measurementLabel}</span>
        <span data-testid="active-distance-readout">{activeReadout}</span>
      </div>

      {/* Unit Selector Bar: cm | ft | m */}
      <div
        role="group"
        aria-label="Measurement unit"
        data-testid="unit-selector"
        className="pointer-events-auto ar-ios-surface inline-flex items-center gap-1 rounded-full p-1 shadow-lg"
      >
        {UI_MEASUREMENT_UNITS.map((item) => {
          const isSelected = unit === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onUnitChange(item.id)}
              aria-pressed={isSelected}
              aria-label={`${item.name} (${item.label})`}
              data-testid={`unit-tab-${item.id}`}
              className={`min-h-[38px] min-w-[54px] sm:min-w-[60px] rounded-full px-4 py-1 font-mono-tabular text-xs sm:text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap ${
                isSelected
                  ? 'bg-white text-[#111111] font-semibold'
                  : 'text-zinc-300 font-medium hover:bg-[#2C2C2E] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 3-Button Shutter Row: Reset (Left), + Shutter (Center), Done (Right) */}
      <div className="pointer-events-auto flex items-center justify-center gap-7 sm:gap-9">
        <button
          type="button"
          onClick={onReset}
          data-testid="reset-measurement-button"
          data-reset-count={resetCount}
          aria-label="Reset measurement"
          className="ar-ios-surface ar-shutter-side flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 hover:bg-[#2C2C2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handlePlusAction}
          disabled={isTrackingLost || isPlacing}
          aria-label={isCompleted ? 'Start new measurement' : 'Add measurement point'}
          data-testid="primary-measure-action"
          className="ar-shutter-main flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#111111] ring-4 ring-white/25 shadow-xl transition-transform active:scale-95 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Plus className="h-7 w-7 stroke-[2.5]" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleDoneAction}
          disabled={isDoneDisabled || isPlacing}
          data-testid="confirm-measure-action"
          aria-label="Complete measurement and finish chain"
          className={`ar-shutter-side flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            isDoneDisabled
              ? 'ar-ios-surface text-white/35 opacity-55 cursor-not-allowed'
              : 'bg-white text-[#111111] hover:bg-zinc-100 active:scale-95'
          }`}
        >
          <Check className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}
