import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import MeasurementOverlay from './MeasurementOverlay.jsx';
import { CAMERA_STATUSES } from '../services/cameraService.js';
import {
  clientPointToWindowNormalized,
  windowNormalizedToViewport,
} from '../utils/measurementMath.js';
import { MEASUREMENT_PHASES, TRACKING_STATUSES } from '../utils/measurementState.js';

/**
 * Full-bleed central camera / AR viewport.
 * Renders the live browser MediaStream video feed (or transparent native ARCore backing),
 * contrast gradient scrims, projected MeasurementOverlay, clean white center aiming reticle,
 * and non-occluding camera fallback prompt when permission is unavailable.
 */
export default function ARViewport({
  isResetting,
  hasNativePlugin,
  phase,
  trackingStatus,
  firstPoint,
  secondPoint,
  distanceMeters,
  liveDistanceMeters,
  formattedDistance,
  formattedLiveDistance,
  onPlacePoint,
  camera,
}) {
  const viewportRef = useRef(null);
  const [viewportMetrics, setViewportMetrics] = useState(null);

  useEffect(() => {
    if (!hasNativePlugin || !viewportRef.current || typeof window === 'undefined') {
      setViewportMetrics(null);
      return;
    }

    const updateMetrics = () => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const next = {
        rect: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
        windowSize: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      };
      setViewportMetrics((prev) => {
        if (
          prev &&
          prev.rect.left === next.rect.left &&
          prev.rect.top === next.rect.top &&
          prev.rect.width === next.rect.width &&
          prev.rect.height === next.rect.height &&
          prev.windowSize.width === next.windowSize.width &&
          prev.windowSize.height === next.windowSize.height
        ) {
          return prev;
        }
        return next;
      });
    };

    updateMetrics();

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateMetrics);
      resizeObserver.observe(viewportRef.current);
    }
    window.addEventListener('resize', updateMetrics);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, [hasNativePlugin]);

  const isCameraActive = camera?.status === CAMERA_STATUSES.ACTIVE;
  const isCameraStarting = camera?.status === CAMERA_STATUSES.INITIALIZING;
  const showCameraFallback =
    !hasNativePlugin && !isCameraActive && !isCameraStarting && !firstPoint;

  const isTrackingLost = trackingStatus === TRACKING_STATUSES.TRACKING_LOST;
  const isInvalidPoint = trackingStatus === TRACKING_STATUSES.INVALID_POINT;
  const isCompleted = phase === MEASUREMENT_PHASES.COMPLETED;

  const canPlaceOnViewport =
    !isTrackingLost &&
    (phase === MEASUREMENT_PHASES.INITIAL || phase === MEASUREMENT_PHASES.FIRST_POINT);

  const displayFirstPoint =
    hasNativePlugin && viewportMetrics
      ? windowNormalizedToViewport(firstPoint, viewportMetrics.rect, viewportMetrics.windowSize)
      : firstPoint;
  const displaySecondPoint =
    hasNativePlugin && viewportMetrics
      ? windowNormalizedToViewport(secondPoint, viewportMetrics.rect, viewportMetrics.windowSize)
      : secondPoint;

  const handleViewportClick = (event) => {
    if (!canPlaceOnViewport || !viewportRef.current || typeof onPlacePoint !== 'function') {
      return;
    }
    const rect = viewportRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (hasNativePlugin) {
      const windowPoint = clientPointToWindowNormalized(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight
      );
      if (windowPoint) {
        onPlacePoint(windowPoint);
      }
      return;
    }

    const normalizedX = (event.clientX - rect.left) / rect.width;
    const normalizedY = (event.clientY - rect.top) / rect.height;
    onPlacePoint({ x: normalizedX, y: normalizedY });
  };

  const reticleRingClass = isTrackingLost
    ? 'border-rose-400/80 opacity-60'
    : isInvalidPoint
      ? 'border-amber-300/85'
      : isCompleted
        ? 'border-white/0 opacity-0 scale-90'
        : isResetting
          ? 'ar-reticle-ring--reset border-[#38BDF8]'
          : 'border-white/95 shadow-[0_0_0_2px_rgba(8,10,13,0.45)]';

  const reticleDotClass = isTrackingLost
    ? 'bg-rose-400'
    : isInvalidPoint
      ? 'bg-amber-300'
      : 'bg-[#38BDF8]';

  return (
    <main className="relative h-full w-full">
      <section
        ref={viewportRef}
        onClick={handleViewportClick}
        aria-label="AR Measurement Viewport"
        data-testid="ar-viewport"
        data-phase={phase}
        data-tracking-status={trackingStatus}
        data-camera-status={camera?.status ?? 'idle'}
        className={`ar-viewport-surface relative flex h-full w-full flex-col items-center justify-center overflow-hidden ${
          canPlaceOnViewport ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        {/* Live Browser Camera Video Feed */}
        {!hasNativePlugin && (
          <video
            ref={camera?.videoRef}
            autoPlay
            playsInline
            muted
            data-testid="camera-video"
            aria-label="Live camera preview"
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              isCameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Measured Contrast Scrims for floating top & bottom HUD legibility */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/75 via-black/30 to-transparent"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/85 via-black/40 to-transparent"
          aria-hidden="true"
        />

        {/* Projected Two-Point & Live Crosshair Measurement Overlay */}
        <MeasurementOverlay
          firstPoint={displayFirstPoint}
          secondPoint={displaySecondPoint}
          phase={phase}
          formattedDistance={formattedDistance}
          formattedLiveDistance={formattedLiveDistance}
          hasNativeDistance={
            typeof distanceMeters === 'number' || typeof liveDistanceMeters === 'number'
          }
        />

        {/* Non-occluding Camera Fallback Card (placed above center crosshair) */}
        {showCameraFallback && (
          <div
            className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 z-20 w-max max-w-[calc(100%-2rem)] text-center"
            onClick={(e) => e.stopPropagation()}
            data-testid="camera-fallback-panel"
          >
            <div className="ar-glass-surface flex items-center gap-3 rounded-full px-4 py-1.5 shadow-xl shadow-black/60">
              <div className="flex items-center gap-2 text-xs font-medium text-[#F4F5F7] whitespace-nowrap">
                <Camera className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />
                <span>{camera?.errorInfo?.title ?? 'Camera Off'}</span>
              </div>
              <button
                type="button"
                onClick={() => camera?.startCamera()}
                data-testid="retry-camera-button"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-xs font-semibold text-[#0B0E14] transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38BDF8] whitespace-nowrap"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                <span>
                  {camera?.status === CAMERA_STATUSES.IDLE ? 'Enable Camera' : 'Retry'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Center Aiming Reticle */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            data-testid="aiming-reticle"
            aria-label="Center aiming reticle"
            className={`ar-reticle-ring ar-landscape-reticle relative flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 bg-black/10 ${reticleRingClass}`}
          >
            <span
              className={`h-2 w-2 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.6)] ${reticleDotClass}`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
