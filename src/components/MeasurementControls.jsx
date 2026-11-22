import React from 'react';
import { Check, Plus, RotateCcw } from 'lucide-react';
import { UI_MEASUREMENT_UNITS } from '../utils/measurementMath.js';
import { MEASUREMENT_PHASES, TRACKING_STATUSES } from '../utils/measurementState.js';

/**
 * Floating bottom HUD matching the screenshot layout:
 * - Segmented unit selector pill (`cm | ft | m`)
 * - 3-button shutter row: Left Reset, Center `+` shutter button, Right Confirm (`✓`)
 */
export default function MeasurementControls({
  unit,
  phase,
  trackingStatus,
  formattedDistance,
  formattedLiveDistance,
  onUnitChange,
  onPlacePoint,
  onStartNewMeasurement,
  onReset,
  statusSummary,
  resetCount,
}) {
  const isTrackingLost = trackingStatus === TRACKING_STATUSES.TRACKING_LOST;
  const isInitial = phase === MEASUREMENT_PHASES.INITIAL;
  const isFirstPoint = phase === MEASUREMENT_PHASES.FIRST_POINT;
  const isCompleted = phase === MEASUREMENT_PHASES.COMPLETED;

  const primaryAriaLabel = isCompleted
    ? 'Start a new measurement'
    : isFirstPoint
      ? 'Place second measurement point'
      : 'Start measurement and place first point';

  const handlePrimaryAction = () => {
    if (isCompleted) {
      onStartNewMeasurement();
      return;
    }
    onPlacePoint();
  };

  const handleConfirmAction = () => {
    if (isFirstPoint) {
      onPlacePoint();
      return;
    }
    if (isCompleted) {
      onStartNewMeasurement();
    }
  };

  const isConfirmDisabled = isInitial || (isFirstPoint && isTrackingLost);
  const activeReadout = isFirstPoint
    ? (formattedLiveDistance ?? formattedDistance)
    : formattedDistance;

  return (
    <footer className="ar-hud-bottom pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {/* Accessible screen-reader readout keeping status and formatted value exposed */}
      <div className="sr-only">
        <span data-testid="measurement-status">{statusSummary.measurementLabel}</span>
        <span data-testid="active-distance-readout">{activeReadout}</span>
      </div>

      {/* Unit Selector Bar: cm | ft | m */}
      <div
        role="group"
        aria-label="Measurement unit"
        data-testid="unit-selector"
        className="pointer-events-auto ar-glass-surface inline-flex items-center gap-1 rounded-full p-1 shadow-xl shadow-black/60"
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
              className={`min-h-[40px] min-w-[56px] sm:min-w-[64px] rounded-full px-4 py-1.5 font-mono-tabular text-xs sm:text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8] whitespace-nowrap ${
                isSelected
                  ? 'bg-white text-[#0B0E14] font-semibold shadow-sm'
                  : 'text-[#D5DAE3] font-medium hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* 3-Button Shutter Row: Reset (Left), + Shutter (Center), Check (Right) */}
      <div className="pointer-events-auto flex items-center justify-center gap-7 sm:gap-9">
        <button
          type="button"
          onClick={onReset}
          data-testid="reset-measurement-button"
          data-reset-count={resetCount}
          aria-label="Reset measurement"
          className="ar-glass-surface ar-shutter-side flex h-12 w-12 items-center justify-center rounded-full text-white shadow-xl shadow-black/55 transition-transform active:scale-95 hover:bg-white/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]"
        >
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={isTrackingLost}
          aria-label={primaryAriaLabel}
          data-testid="primary-measure-action"
          className="ar-shutter-main flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#0B0E14] shadow-[0_0_0_4px_rgba(255,255,255,0.22),0_12px_28px_rgba(0,0,0,0.65)] transition-transform active:scale-95 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]"
        >
          <Plus className="h-7 w-7 stroke-[2.5]" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleConfirmAction}
          disabled={isConfirmDisabled}
          data-testid="confirm-measure-action"
          aria-label={
            isCompleted ? 'Finish and start new measurement' : 'Place final measurement mark'
          }
          className={`ar-shutter-side flex h-12 w-12 items-center justify-center rounded-full shadow-xl shadow-black/55 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8] ${
            isConfirmDisabled
              ? 'ar-glass-surface text-white/40 opacity-45 cursor-not-allowed'
              : 'bg-white text-[#0B0E14] hover:bg-slate-100 active:scale-95'
          }`}
        >
          <Check className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
        </button>
      </div>
    </footer>
  );
}
