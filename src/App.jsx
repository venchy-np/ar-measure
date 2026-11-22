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
<<<<<<< HEAD
    firstPoint,
    secondPoint,
    distanceMeters,
    liveDistanceMeters,
    formattedDistance,
    formattedLiveDistance,
=======
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
>>>>>>> 879211a (Update AR Measure app)
    resetCount,
    capabilities,
    cameraResolution,
    qualityMode,
<<<<<<< HEAD
    zoom,
=======
    availableQualities,
    zoom,
    availableZooms,
>>>>>>> 879211a (Update AR Measure app)
    instruction,
    statusSummary,
    isResetting,
    setUnit,
    setZoom,
    setQuality,
    startNewMeasurement,
    placePoint,
<<<<<<< HEAD
=======
    completeMeasurement,
    undoPoint,
>>>>>>> 879211a (Update AR Measure app)
    resetMeasurement,
  } = useMeasurementSession();

  const camera = useCameraStream({
    enabled: !capabilities.hasARCorePlugin,
  });

  const [isBridgeOpen, setIsBridgeOpen] = useState(false);

<<<<<<< HEAD
  return (
    <div
      className={`relative h-dvh w-full overflow-hidden text-[#F4F5F7] select-none ${
        capabilities.hasARCorePlugin ? 'bg-transparent' : 'bg-[#080A0D]'
=======
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
>>>>>>> 879211a (Update AR Measure app)
      }`}
    >
      <ARViewport
        isResetting={isResetting}
<<<<<<< HEAD
        hasNativePlugin={capabilities.hasARCorePlugin}
        phase={phase}
        trackingStatus={trackingStatus}
        firstPoint={firstPoint}
        secondPoint={secondPoint}
        distanceMeters={distanceMeters}
        liveDistanceMeters={liveDistanceMeters}
        formattedDistance={formattedDistance}
        formattedLiveDistance={formattedLiveDistance}
        onPlacePoint={placePoint}
        camera={camera}
        zoom={zoom}
      />

      <Header
        unit={unit}
=======
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
>>>>>>> 879211a (Update AR Measure app)
        instruction={instruction}
        trackingStatus={trackingStatus}
        statusSummary={statusSummary}
        capabilities={capabilities}
        camera={camera}
<<<<<<< HEAD
        onUnitChange={setUnit}
=======
        pointsCount={points.length}
        onUndo={undoPoint}
>>>>>>> 879211a (Update AR Measure app)
        onOpenBridgeInfo={() => setIsBridgeOpen(true)}
      />

      <MeasurementControls
        unit={unit}
        phase={phase}
        trackingStatus={trackingStatus}
<<<<<<< HEAD
=======
        points={points}
>>>>>>> 879211a (Update AR Measure app)
        formattedDistance={formattedDistance}
        formattedLiveDistance={formattedLiveDistance}
        onUnitChange={setUnit}
        onPlacePoint={placePoint}
<<<<<<< HEAD
=======
        onCompleteMeasurement={completeMeasurement}
>>>>>>> 879211a (Update AR Measure app)
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
<<<<<<< HEAD
        cameraResolution={cameraResolution}
        qualityMode={qualityMode}
        zoom={zoom}
        onZoomChange={setZoom}
        onQualityChange={setQuality}
=======
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
>>>>>>> 879211a (Update AR Measure app)
      />
    </div>
  );
}
