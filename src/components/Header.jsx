import React from 'react';
import { SlidersHorizontal, SwitchCamera, Undo2 } from 'lucide-react';
import StatusIndicator from './StatusIndicator.jsx';
import { CAMERA_STATUSES } from '../services/cameraService.js';
import { TRACKING_STATUSES } from '../utils/measurementState.js';

/**
 * Minimal iOS-inspired floating top bar:
 * - Left: Info / camera settings trigger
 * - Center: Flat status capsule + concise instruction
 * - Right: Camera switch (browser camera) + Undo button (removes latest point)
 */
export default function Header({
  instruction,
  trackingStatus,
  statusSummary,
  capabilities,
  camera,
  pointsCount = 0,
  onUndo,
  onOpenBridgeInfo,
}) {
  const isCameraActive = camera?.status === CAMERA_STATUSES.ACTIVE;
  const isTrackingLost = trackingStatus === TRACKING_STATUSES.TRACKING_LOST;
  const isInvalidPoint = trackingStatus === TRACKING_STATUSES.INVALID_POINT;
  const canUndo = pointsCount > 0;

  const instructionColorClass = isTrackingLost
    ? 'text-rose-200'
    : isInvalidPoint
      ? 'text-amber-200'
      : 'text-white/90';

  return (
    <header className="ar-hud-top pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-[max(0.875rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-3">
        {/* Left: Minimal circular info button */}
        <div className="pointer-events-auto flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenBridgeInfo}
            aria-label="Inspect Capacitor ARCore bridge compatibility"
            data-testid="bridge-info-button"
            className="ar-ios-surface flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition-colors hover:bg-[#2C2C2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <SlidersHorizontal className="h-4 w-4 text-white" aria-hidden="true" />
          </button>
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
            className={`mt-2 max-w-xs sm:max-w-md text-xs sm:text-[13px] font-medium leading-snug drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] [text-wrap:balance] ${instructionColorClass}`}
          >
            {instruction}
          </p>
        </div>

        {/* Right: Switch camera (when active) + Undo last point button */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          {!capabilities.hasARCorePlugin && isCameraActive && (
            <button
              type="button"
              onClick={() => camera?.switchCamera()}
              aria-label="Switch camera"
              data-testid="switch-camera-button"
              className="ar-ios-surface flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition-colors hover:bg-[#2C2C2E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <SwitchCamera className="h-4 w-4 text-white" aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo last measurement point"
            data-testid="undo-point-button"
            className={`ar-ios-surface flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              canUndo
                ? 'text-white hover:bg-[#2C2C2E] active:scale-95'
                : 'text-white/35 opacity-50 cursor-not-allowed'
            }`}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
