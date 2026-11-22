import React from 'react';
import { SlidersHorizontal, SwitchCamera } from 'lucide-react';
import StatusIndicator from './StatusIndicator.jsx';
import { CAMERA_STATUSES } from '../services/cameraService.js';
import { UI_MEASUREMENT_UNITS } from '../utils/measurementMath.js';
import { TRACKING_STATUSES } from '../utils/measurementState.js';

/**
 * Floating top HUD bar matching the minimal camera-overlay layout:
 * - Left: Bridge Info button + subtle AR Measure title
 * - Center: Status capsule + contextual instruction
 * - Right: Camera switch (when browser camera is live) + active unit cycle button
 */
export default function Header({
  unit,
  instruction,
  trackingStatus,
  statusSummary,
  capabilities,
  camera,
  onUnitChange,
  onOpenBridgeInfo,
}) {
  const isCameraActive = camera?.status === CAMERA_STATUSES.ACTIVE;
  const isTrackingLost = trackingStatus === TRACKING_STATUSES.TRACKING_LOST;
  const isInvalidPoint = trackingStatus === TRACKING_STATUSES.INVALID_POINT;

  const handleCycleUnit = () => {
    const ids = UI_MEASUREMENT_UNITS.map((item) => item.id);
    const currentIndex = ids.indexOf(unit);
    const nextUnit = ids[(currentIndex + 1) % ids.length];
    onUnitChange(nextUnit);
  };

  const instructionColorClass = isTrackingLost
    ? 'text-rose-200'
    : isInvalidPoint
      ? 'text-amber-200'
      : 'text-[#F4F5F7]';

  return (
    <header className="ar-hud-top pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-[max(0.875rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3">
        {/* Left: Bridge info circular trigger + subtle desktop/tablet wordmark */}
        <div className="pointer-events-auto flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenBridgeInfo}
            aria-label="Inspect Capacitor ARCore bridge compatibility"
            data-testid="bridge-info-button"
            className="ar-glass-surface flex h-11 w-11 items-center justify-center rounded-full text-[#F4F5F7] shadow-lg shadow-black/45 transition-colors hover:bg-white/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]"
          >
            <SlidersHorizontal className="h-4 w-4 text-[#F4F5F7]" aria-hidden="true" />
          </button>
          <div className="hidden sm:flex items-center gap-2">
            <img
              src="/app-icon.png"
              alt=""
              width="24"
              height="24"
              className="h-6 w-6 rounded-md shadow-sm"
            />
            <span className="text-sm font-semibold tracking-tight text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)] whitespace-nowrap">
              AR Measure
            </span>
          </div>
        </div>

        {/* Center: Status capsule + contextual instruction */}
        <div className="flex min-w-0 flex-1 flex-col items-center text-center pt-0.5">
          <StatusIndicator
            label={statusSummary.headerLabel}
            tone={statusSummary.tone}
            hasNativePlugin={capabilities.hasARCorePlugin}
            cameraStatus={camera?.status}
          />
          <p
            role="status"
            aria-live="polite"
            data-testid="contextual-instruction"
            className={`mt-2 max-w-xs sm:max-w-md text-xs sm:text-[13px] font-medium leading-snug drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] [text-wrap:balance] ${instructionColorClass}`}
          >
            {instruction}
          </p>
        </div>

        {/* Right: Switch camera (when active) + circular active unit button */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          {!capabilities.hasARCorePlugin && isCameraActive && (
            <button
              type="button"
              onClick={() => camera?.switchCamera()}
              aria-label="Switch camera"
              data-testid="switch-camera-button"
              className="ar-glass-surface flex h-11 w-11 items-center justify-center rounded-full text-[#F4F5F7] shadow-lg shadow-black/45 transition-colors hover:bg-white/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]"
            >
              <SwitchCamera className="h-4 w-4 text-[#38BDF8]" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={handleCycleUnit}
            aria-label={`Active unit ${unit}. Tap to switch unit`}
            data-testid="header-unit-button"
            className="ar-glass-surface flex h-11 w-11 items-center justify-center rounded-full font-mono-tabular text-xs font-semibold text-white shadow-lg shadow-black/45 transition-colors hover:bg-white/[0.14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]"
          >
            {unit}
          </button>
        </div>
      </div>
    </header>
  );
}
