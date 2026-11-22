import React from 'react';
import { CAMERA_STATUSES } from '../services/cameraService.js';

/**
 * Centered floating status badge in the top bar showing ARCore tracking
 * or browser camera stream status in a flat iOS dark surface.
 */
export default function StatusIndicator({
  label,
  tone = 'neutral',
  hasNativePlugin = false,
  cameraStatus = CAMERA_STATUSES.IDLE,
}) {
  const isCameraActive = cameraStatus === CAMERA_STATUSES.ACTIVE;
  const isCameraStarting = cameraStatus === CAMERA_STATUSES.INITIALIZING;

  const displayLabel = hasNativePlugin
    ? label
    : isCameraActive
      ? 'Camera Live'
      : isCameraStarting
        ? 'Starting Camera'
        : 'Camera Off';

  const dotColorClass = hasNativePlugin
    ? tone === 'danger'
      ? 'bg-rose-400'
      : tone === 'warning'
        ? 'bg-amber-300'
        : tone === 'ready'
          ? 'bg-emerald-400'
          : tone === 'accent'
            ? 'bg-white'
            : 'bg-zinc-400'
    : isCameraActive
      ? 'bg-emerald-400'
      : isCameraStarting
        ? 'bg-white'
        : 'bg-zinc-400';

  return (
    <div
      className="ar-ios-surface inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs sm:text-[13px] font-medium text-white shadow-md whitespace-nowrap shrink-0"
      role="status"
      aria-live="polite"
      data-testid="status-indicator"
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${dotColorClass}`} aria-hidden="true" />
      <span>{displayLabel}</span>
    </div>
  );
}
