import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import MeasurementOverlay from './MeasurementOverlay.jsx';
import { CAMERA_STATUSES } from '../services/cameraService.js';
import {
  DEFAULT_WEB_DETECTED_PLANES,
  clientPointToWindowNormalized,
  hitTestDetectedPlanes,
  windowNormalizedToViewport,
} from '../utils/measurementMath.js';
import { MEASUREMENT_PHASES, TRACKING_STATUSES } from '../utils/measurementState.js';

const MAX_TAP_MOVEMENT_PX = 12;
const RIPPLE_DURATION_MS = 420;

/**
 * Full-bleed central camera / AR viewport.
 * Handles pointer/touch hit-testing against detected 3D planes (native ARCore or
 * pure ray-plane intersection in web preview), renders subtle touch feedback,
 * crisp center `+` aiming reticle, and the multi-point MeasurementOverlay.
 */
export default function ARViewport({
  hasNativePlugin,
  phase,
  trackingStatus,
  points = [],
  segments = [],
  formattedSegments = [],
  distanceMeters,
  liveDistanceMeters,
  formattedLiveDistance,
  detectedPlanesCount = 0,
  reticleHitType = null,
  reticlePlaneType = null,
  onPlacePoint,
  camera,
}) {
  const viewportRef = useRef(null);
  const pointerDownRef = useRef(null);
  const lastPointerGestureAtRef = useRef(0);
  const rippleTimersRef = useRef(new Set());
  const rippleIdRef = useRef(0);

  const [viewportMetrics, setViewportMetrics] = useState(null);
  const [touchRipples, setTouchRipples] = useState([]);

  useEffect(() => {
    const timers = rippleTimersRef.current;
    return () => {
      for (const timerId of timers) {
        clearTimeout(timerId);
      }
      timers.clear();
    };
  }, []);

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
    !hasNativePlugin && !isCameraActive && !isCameraStarting && points.length === 0;

  const isTrackingLost = trackingStatus === TRACKING_STATUSES.TRACKING_LOST;
  const isCompleted = phase === MEASUREMENT_PHASES.COMPLETED;

  const canPlaceOnViewport =
    !isTrackingLost &&
    (phase === MEASUREMENT_PHASES.INITIAL || phase === MEASUREMENT_PHASES.CHAIN);

  const displayPoints =
    hasNativePlugin && viewportMetrics
      ? points.map((pt) =>
          windowNormalizedToViewport(pt, viewportMetrics.rect, viewportMetrics.windowSize)
        )
      : points;

  const effectivePlanesCount = hasNativePlugin
    ? detectedPlanesCount
    : DEFAULT_WEB_DETECTED_PLANES.length;

  const spawnTouchRipple = (x, y) => {
    const id = ++rippleIdRef.current;
    setTouchRipples((prev) => [...prev.slice(-3), { id, x, y }]);
    const timerId = setTimeout(() => {
      rippleTimersRef.current.delete(timerId);
      setTouchRipples((prev) => prev.filter((item) => item.id !== id));
    }, RIPPLE_DURATION_MS);
    rippleTimersRef.current.add(timerId);
  };

  const projectAndPlaceAtClientCoords = (clientX, clientY) => {
    if (!canPlaceOnViewport || !viewportRef.current || typeof onPlacePoint !== 'function') {
      return;
    }
    const rect = viewportRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const clamp01 = (v) => Math.min(1, Math.max(0, v));
    const localX = clamp01((clientX - rect.left) / rect.width);
    const localY = clamp01((clientY - rect.top) / rect.height);

    if (hasNativePlugin) {
      const windowPoint = clientPointToWindowNormalized(
        clientX,
        clientY,
        window.innerWidth,
        window.innerHeight
      );
      if (windowPoint) {
        spawnTouchRipple(localX, localY);
        onPlacePoint(windowPoint);
      }
      return;
    }

    const aspectRatio = rect.width / rect.height;
    const planeHit = hitTestDetectedPlanes(
      { x: localX, y: localY },
      DEFAULT_WEB_DETECTED_PLANES,
      { aspectRatio }
    );

    spawnTouchRipple(localX, localY);

    onPlacePoint({
      x: localX,
      y: localY,
      ...(planeHit
        ? {
            worldPoint: planeHit.worldPoint,
            hitType: planeHit.hitType,
            planeType: planeHit.planeType,
          }
        : {}),
    });
  };

  const handlePointerDown = (event) => {
    if (!canPlaceOnViewport) return;
    if (event.isPrimary === false) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;

    pointerDownRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      timestamp: Date.now(),
    };
  };

  const handlePointerUp = (event) => {
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    lastPointerGestureAtRef.current = Date.now();
    if (event.target instanceof Element && event.target.closest('button, a')) return;

    const movedPx = Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY);
    if (movedPx > MAX_TAP_MOVEMENT_PX) {
      return;
    }

    projectAndPlaceAtClientCoords(event.clientX, event.clientY);
  };

  const handlePointerCancel = () => {
    pointerDownRef.current = null;
    lastPointerGestureAtRef.current = Date.now();
  };

  const handleClickFallback = (event) => {
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    if (Date.now() - lastPointerGestureAtRef.current < 400) return;
    projectAndPlaceAtClientCoords(event.clientX, event.clientY);
  };

  return (
    <main className="relative h-full w-full">
      <section
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClickFallback}
        aria-label="AR Measurement Viewport"
        data-testid="ar-viewport"
        data-phase={phase}
        data-points-count={points.length}
        data-tracking-status={trackingStatus}
        data-camera-status={camera?.status ?? 'idle'}
        data-detected-planes={effectivePlanesCount}
        data-reticle-hit-type={reticleHitType ?? 'none'}
        data-reticle-plane-type={reticlePlaneType ?? ''}
        className={`ar-viewport-surface touch-none relative flex h-full w-full flex-col items-center justify-center overflow-hidden ${
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

        {/* Projected Multi-Point Chain & Live Crosshair Measurement Overlay */}
        <MeasurementOverlay
          points={displayPoints}
          segments={segments}
          formattedSegments={formattedSegments}
          phase={phase}
          formattedLiveDistance={formattedLiveDistance}
          hasNativeDistance={
            typeof distanceMeters === 'number' || typeof liveDistanceMeters === 'number'
          }
        />

        {/* Subtle Touch Ripple Feedback */}
        {touchRipples.map((ripple) => (
          <div
            key={ripple.id}
            data-testid="touch-hit-ripple"
            style={{ left: `${ripple.x * 100}%`, top: `${ripple.y * 100}%` }}
            aria-hidden="true"
            className="ar-touch-ripple pointer-events-none absolute z-20 h-8 w-8 rounded-full border border-white/75"
          />
        ))}

        {/* Clean Camera Off / Retry Card */}
        {showCameraFallback && (
          <div
            className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 z-20 w-max max-w-[calc(100%-2rem)] text-center"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            data-testid="camera-fallback-panel"
          >
            <div className="ar-ios-surface flex items-center gap-3 rounded-full px-4 py-1.5 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-medium text-white whitespace-nowrap">
                <Camera className="h-3.5 w-3.5 text-white/75" aria-hidden="true" />
                <span>{camera?.errorInfo?.title ?? 'Camera Off'}</span>
              </div>
              <button
                type="button"
                onClick={() => camera?.startCamera()}
                data-testid="retry-camera-button"
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-xs font-semibold text-[#111111] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap"
              >
                <RefreshCw className="h-3 w-3" aria-hidden="true" />
                <span>
                  {camera?.status === CAMERA_STATUSES.IDLE ? 'Enable Camera' : 'Retry'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Minimal Center Aiming Crosshair (+) */}
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div
            data-testid="aiming-reticle"
            aria-label="Center aiming reticle"
            className={`relative flex h-4 w-4 items-center justify-center transition-opacity duration-200 ${
              isCompleted ? 'opacity-0 scale-90' : isTrackingLost ? 'opacity-45' : 'opacity-100'
            }`}
          >
            <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1.5px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.85)]" />
            <span className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1.5px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.85)]" />
          </div>
        </div>
      </section>
    </main>
  );
}
