import React, { useEffect } from 'react';
import { X } from 'lucide-react';

<<<<<<< HEAD
/**
 * Accessible dialog inspecting Capacitor runtime & ARCore plugin readiness,
 * tracking state, and underlying measurement stored in metres.
=======
const QUALITY_RES_MAP = {
  '480p SD': '640x480 (480p)',
  '720p HD': '1280x720 (720p HD)',
  '1080p Full HD': '1920x1080 (1080p HD)',
  '4K Ultra HD': '3840x2160 (4K UHD)',
};

/**
 * Clean iOS-style grouped modal sheet inspecting Capacitor/ARCore runtime
 * readiness and device-supported camera zoom & quality controls.
>>>>>>> 879211a (Update AR Measure app)
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
<<<<<<< HEAD
  cameraResolution = '1920x1080 (1080p HD)',
  qualityMode = 'High Quality (1080p)',
  zoom = '1x',
=======
  cameraResolution = 'Detecting camera...',
  qualityMode = '1080p Full HD',
  zoom = '1x',
  availableZooms = ['1x'],
  availableQualities = ['1080p Full HD'],
>>>>>>> 879211a (Update AR Measure app)
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

<<<<<<< HEAD
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-6"
=======
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
>>>>>>> 879211a (Update AR Measure app)
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bridge-dialog-title"
        onClick={(e) => e.stopPropagation()}
<<<<<<< HEAD
        className="ar-glass-surface max-h-[90dvh] overflow-y-auto w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl shadow-black/70"
      >
        <div className="flex items-start justify-between gap-4">
=======
        className="max-h-[92dvh] overflow-y-auto w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[#1C1C1E] border border-white/10 p-4 sm:p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-4">
>>>>>>> 879211a (Update AR Measure app)
          <div className="flex items-center gap-3">
            <img
              src="/app-icon.png"
              alt="AR Measure app icon"
<<<<<<< HEAD
              width="40"
              height="40"
              className="h-10 w-10 rounded-xl shrink-0 shadow-md"
            />
            <div>
              <h2 id="bridge-dialog-title" className="text-base font-semibold text-[#F4F5F7]">
                AR Measure
              </h2>
              <p className="mt-0.5 text-xs text-[#9AA3B2]">
                Capacitor ARCore runtime inspection.
=======
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
>>>>>>> 879211a (Update AR Measure app)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bridge info"
<<<<<<< HEAD
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-[#A8B1C0] transition-colors hover:bg-white/[0.1] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]"
=======
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2C2C2E] text-zinc-300 transition-colors hover:bg-[#3A3A3C] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
>>>>>>> 879211a (Update AR Measure app)
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

<<<<<<< HEAD
        <dl className="mt-5 divide-y divide-white/[0.07] border-y border-white/[0.07] text-xs">
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[#8D96A6]">Runtime Mode</dt>
            <dd className="font-mono-tabular text-[#F4F5F7]">
              {capabilities.hasARCorePlugin ? 'Native ARCore' : 'Browser Camera Preview'}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[#8D96A6]">Camera Stream</dt>
            <dd className="font-mono-tabular text-[#F4F5F7]">{cameraStatus}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[#8D96A6]">Tracking Status</dt>
            <dd className="font-mono-tabular text-[#F4F5F7]">{trackingStatus}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[#8D96A6]">Measurement Phase</dt>
            <dd className="font-mono-tabular text-[#F4F5F7]">{phase}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[#8D96A6]">Stored Distance (m)</dt>
            <dd className="font-mono-tabular text-[#F4F5F7]">
=======
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
>>>>>>> 879211a (Update AR Measure app)
              {typeof distanceMeters === 'number'
                ? `${distanceMeters.toFixed(4)} m`
                : 'Awaiting ARCore'}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
<<<<<<< HEAD
            <dt className="text-[#8D96A6]">Capture Quality</dt>
            <dd className="font-mono-tabular text-emerald-400 font-medium">
              {qualityMode}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[#8D96A6]">Camera Resolution</dt>
            <dd className="font-mono-tabular text-[#F4F5F7]">
              {cameraResolution}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[#8D96A6]">Display Unit</dt>
            <dd className="font-mono-tabular text-[#38BDF8]">{activeUnit}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[#8D96A6]">Expected Plugin</dt>
            <dd className="font-mono-tabular text-[#D5DAE3]">{capabilities.pluginName}</dd>
          </div>
          <div className="flex items-center justify-between py-2.5">
            <dt className="text-[#8D96A6]">Android App ID</dt>
            <dd className="font-mono-tabular text-[#D5DAE3]">com.venchy.armeasure</dd>
          </div>
        </dl>

        {/* Interactive Camera Zoom & Quality Controls */}
        <div className="mt-4 space-y-3 pt-3 border-t border-white/[0.07]">
          <div>
            <label className="block text-[11px] font-medium text-[#8D96A6] mb-1.5">
              Camera Zoom Setting
            </label>
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Camera Zoom">
              {['0.5x', '1x', '2x', '4x'].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => onZoomChange?.(z)}
                  className={`min-h-[36px] rounded-xl px-2 py-1 text-xs font-semibold transition-colors ${
                    zoom === z
                      ? 'bg-[#38BDF8] text-[#080A0D]'
                      : 'bg-white/[0.04] text-[#A8B1C0] hover:bg-white/[0.08] hover:text-white'
=======
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
>>>>>>> 879211a (Update AR Measure app)
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          <div>
<<<<<<< HEAD
            <label className="block text-[11px] font-medium text-[#8D96A6] mb-1.5">
              Capture Quality & Resolution
            </label>
            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Capture Quality">
              {[
                { label: '720p HD', res: '1280x720 (720p)' },
                { label: '1080p Full HD', res: '1920x1080 (1080p HD)' },
                { label: '4K Ultra HD', res: '3840x2160 (4K UHD)' },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => onQualityChange?.(q.label, q.res)}
                  className={`min-h-[36px] rounded-xl px-2 py-1 text-xs font-semibold transition-colors ${
                    qualityMode === q.label
                      ? 'bg-emerald-400 text-[#080A0D]'
                      : 'bg-white/[0.04] text-[#A8B1C0] hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {q.label}
                </button>
              ))}
=======
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
>>>>>>> 879211a (Update AR Measure app)
            </div>
          </div>
        </div>

<<<<<<< HEAD
        <p className="mt-4 text-xs leading-relaxed text-[#8D96A6]">
          Measurements are stored in metres and converted for display. Native Android builds supply
          projected screen points and 3D world distances via{' '}
          <code className="font-mono-tabular text-[#D2D8E3]">
            ARMeasurePlugin
          </code>
          .
        </p>

        <div className="mt-5 flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-3 text-center sm:text-left">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] w-full sm:w-auto rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-[#0B0E14] transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8]"
=======
        <div className="mt-4 flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-2 text-center sm:text-left">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] w-full sm:w-auto rounded-xl bg-white px-5 py-2 text-xs font-semibold text-[#111111] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
>>>>>>> 879211a (Update AR Measure app)
          >
            Done
          </button>
          <a
            href="https://www.sajandhl.qzz.io/"
            target="_blank"
            rel="noopener noreferrer"
<<<<<<< HEAD
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8] py-1"
=======
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white py-0.5"
>>>>>>> 879211a (Update AR Measure app)
            aria-label="Visit author website"
          >
            - sajan.
          </a>
        </div>
      </div>
    </div>
  );
}
