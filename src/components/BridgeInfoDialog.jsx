import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const QUALITY_RES_MAP = {
  '480p SD': '640x480 (480p)',
  '720p HD': '1280x720 (720p HD)',
  '1080p Full HD': '1920x1080 (1080p HD)',
  '4K Ultra HD': '3840x2160 (4K UHD)',
};

/**
 * Clean iOS-style grouped modal sheet inspecting Capacitor/ARCore runtime
 * readiness and device-supported camera zoom & quality controls.
 */
export default function BridgeInfoDialog({
  isOpen,
  onClose,
  capabilities,
  activeUnit,
  trackingStatus,
  phase,
  distanceMeters,
  cameraStatus,
  cameraResolution = 'Detecting camera...',
  qualityMode = '1080p Full HD',
  zoom = '1x',
  availableZooms = ['1x'],
  availableQualities = ['1080p Full HD'],
  onZoomChange,
  onQualityChange,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isCameraControlsActive =
    capabilities.hasARCorePlugin || cameraStatus === 'active';

  const zoomGridCols =
    availableZooms.length <= 1
      ? 'grid-cols-1'
      : availableZooms.length === 2
        ? 'grid-cols-2'
        : availableZooms.length === 3
          ? 'grid-cols-3'
          : 'grid-cols-4';

  const qualityGridCols =
    availableQualities.length <= 1
      ? 'grid-cols-1'
      : availableQualities.length === 2
        ? 'grid-cols-2'
        : availableQualities.length === 3
          ? 'grid-cols-3'
          : 'grid-cols-4';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bridge-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] overflow-y-auto w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[#1C1C1E] border border-white/10 p-4 sm:p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/app-icon.png"
              alt="AR Measure app icon"
              width="34"
              height="34"
              className="h-8 w-8 rounded-lg shrink-0"
            />
            <div>
              <h2 id="bridge-dialog-title" className="text-base font-semibold text-white">
                AR Measure
              </h2>
              <p className="text-xs text-zinc-400">
                Camera &amp; runtime details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bridge info"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2C2C2E] text-zinc-300 transition-colors hover:bg-[#3A3A3C] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-4 divide-y divide-white/[0.08] rounded-xl bg-[#2C2C2E] px-3.5 text-xs">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-zinc-400">Runtime Mode</dt>
            <dd className="font-mono-tabular text-white">
              {capabilities.hasARCorePlugin ? 'Native ARCore' : 'Browser Preview'}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-zinc-400">Camera Stream</dt>
            <dd className="font-mono-tabular text-white">
              {capabilities.hasARCorePlugin ? 'arcore_native' : cameraStatus}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-zinc-400">Tracking Status</dt>
            <dd className="font-mono-tabular text-white">{trackingStatus}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-zinc-400">Measurement Phase</dt>
            <dd className="font-mono-tabular text-white">{phase}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-zinc-400">Stored Distance (m)</dt>
            <dd className="font-mono-tabular text-white">
              {typeof distanceMeters === 'number'
                ? `${distanceMeters.toFixed(4)} m`
                : 'Awaiting ARCore'}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-zinc-400">Capture Quality</dt>
            <dd className="font-mono-tabular text-white font-medium">
              {isCameraControlsActive ? qualityMode : 'Unavailable'}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-zinc-400">Camera Resolution</dt>
            <dd className="font-mono-tabular text-white">{cameraResolution}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-zinc-400">Display Unit</dt>
            <dd className="font-mono-tabular text-white font-medium">{activeUnit}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-zinc-400">Expected Plugin</dt>
            <dd className="font-mono-tabular text-zinc-200">{capabilities.pluginName}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-zinc-400">Android App ID</dt>
            <dd className="font-mono-tabular text-zinc-200">com.venchy.armeasure</dd>
          </div>
        </dl>

        {/* Device-Supported Camera Zoom & Quality Controls */}
        <div className="mt-3.5 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <label className="block text-[11px] font-medium text-zinc-400">
                Camera Zoom
              </label>
              <span className="text-[11px] text-zinc-500">
                {!isCameraControlsActive
                  ? 'Camera inactive'
                  : availableZooms.length <= 1
                    ? 'Fixed 1x on device'
                    : 'Device supported'}
              </span>
            </div>
            <div
              className={`grid gap-1 rounded-xl bg-[#2C2C2E] p-1 ${zoomGridCols}`}
              role="group"
              aria-label="Camera Zoom"
            >
              {availableZooms.map((z) => (
                <button
                  key={z}
                  type="button"
                  disabled={!isCameraControlsActive}
                  onClick={() => onZoomChange?.(z)}
                  className={`min-h-[32px] rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
                    zoom === z && isCameraControlsActive
                      ? 'bg-white text-[#111111] shadow-sm'
                      : 'text-zinc-300 hover:text-white'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5 px-0.5">
              <label className="block text-[11px] font-medium text-zinc-400">
                Capture Quality
              </label>
              <span className="text-[11px] text-zinc-500">
                {isCameraControlsActive ? 'Device supported' : 'Camera inactive'}
              </span>
            </div>
            <div
              className={`grid gap-1 rounded-xl bg-[#2C2C2E] p-1 ${qualityGridCols}`}
              role="group"
              aria-label="Capture Quality"
            >
              {availableQualities.map((qualLabel) => {
                const res = QUALITY_RES_MAP[qualLabel] || qualLabel;
                return (
                  <button
                    key={qualLabel}
                    type="button"
                    disabled={!isCameraControlsActive}
                    onClick={() => onQualityChange?.(qualLabel, res)}
                    className={`min-h-[32px] rounded-lg px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${
                      qualityMode === qualLabel && isCameraControlsActive
                        ? 'bg-white text-[#111111] shadow-sm'
                        : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    {qualLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-2 text-center sm:text-left">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] w-full sm:w-auto rounded-xl bg-white px-5 py-2 text-xs font-semibold text-[#111111] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Done
          </button>
          <a
            href="https://www.sajandhl.qzz.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white py-0.5"
            aria-label="Visit author website"
          >
            - sajan.
          </a>
        </div>
      </div>
    </div>
  );
}
