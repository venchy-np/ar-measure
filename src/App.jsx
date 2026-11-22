import React, { useState } from 'react';
import Header from './components/Header.jsx';
import ARViewport from './components/ARViewport.jsx';
import MeasurementControls from './components/MeasurementControls.jsx';
import BridgeInfoDialog from './components/BridgeInfoDialog.jsx';
import { useMeasurementSession } from './hooks/useMeasurementSession.js';
import { useCameraStream } from './hooks/useCameraStream.js';

export default function App() {
  const {
    unit,
    phase,
    trackingStatus,
    points,
    segments,
    distanceMeters,
    liveDistanceMeters,
    detectedPlanesCount,
    reticleHitType,
    reticlePlaneType,
    reticleWorldPoint,
    formattedDistance,
    formattedLiveDistance,
    formattedSegments,
    resetCount,
    capabilities,
    cameraResolution,
    qualityMode,
    availableQualities,
    zoom,
    availableZooms,
    instruction,
    statusSummary,
    isResetting,
    setUnit,
    setZoom,
    setQuality,
    startNewMeasurement,
    placePoint,
    completeMeasurement,
    undoPoint,
    resetMeasurement,
  } = useMeasurementSession();

  const camera = useCameraStream({
    enabled: !capabilities.hasARCorePlugin,
  });

  const [isBridgeOpen, setIsBridgeOpen] = useState(false);

  const isNative = Boolean(capabilities.hasARCorePlugin);
  const activeResolution = isNative ? cameraResolution : camera.activeResolution;
  const activeQuality = isNative ? qualityMode : camera.activeQuality;
  const activeQualities = isNative ? availableQualities : camera.availableQualities;
  const activeZoom = isNative ? zoom : camera.activeZoom;
  const activeZooms = isNative ? availableZooms : camera.availableZooms;

  return (
    <div
      className={`relative h-dvh w-full overflow-hidden text-white select-none ${
        isNative ? 'bg-transparent' : 'bg-black'
      }`}
    >
      <ARViewport
        isResetting={isResetting}
        hasNativePlugin={isNative}
        phase={phase}
        trackingStatus={trackingStatus}
        points={points}
        segments={segments}
        formattedSegments={formattedSegments}
        distanceMeters={distanceMeters}
        liveDistanceMeters={liveDistanceMeters}
        formattedLiveDistance={formattedLiveDistance}
        detectedPlanesCount={detectedPlanesCount}
        reticleHitType={reticleHitType}
        reticlePlaneType={reticlePlaneType}
        reticleWorldPoint={reticleWorldPoint}
        onPlacePoint={placePoint}
        camera={camera}
      />

      <Header
        instruction={instruction}
        trackingStatus={trackingStatus}
        statusSummary={statusSummary}
        capabilities={capabilities}
        camera={camera}
        pointsCount={points.length}
        onUndo={undoPoint}
        onOpenBridgeInfo={() => setIsBridgeOpen(true)}
      />

      <MeasurementControls
        unit={unit}
        phase={phase}
        trackingStatus={trackingStatus}
        points={points}
        formattedDistance={formattedDistance}
        formattedLiveDistance={formattedLiveDistance}
        onUnitChange={setUnit}
        onPlacePoint={placePoint}
        onCompleteMeasurement={completeMeasurement}
        onStartNewMeasurement={startNewMeasurement}
        onReset={resetMeasurement}
        statusSummary={statusSummary}
        resetCount={resetCount}
      />

      <BridgeInfoDialog
        isOpen={isBridgeOpen}
        onClose={() => setIsBridgeOpen(false)}
        capabilities={capabilities}
        activeUnit={unit}
        trackingStatus={trackingStatus}
        phase={phase}
        distanceMeters={distanceMeters}
        cameraStatus={camera.status}
        cameraResolution={activeResolution}
        qualityMode={activeQuality}
        zoom={activeZoom}
        availableZooms={activeZooms}
        availableQualities={activeQualities}
        onZoomChange={(z) => {
          if (isNative) {
            setZoom(z);
          } else {
            camera.applyZoom(z);
          }
        }}
        onQualityChange={(q, res) => {
          if (isNative) {
            setQuality(q, res);
          } else {
            camera.setQualityPreference(q);
          }
        }}
      />
    </div>
  );
}
