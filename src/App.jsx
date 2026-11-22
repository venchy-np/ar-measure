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
    firstPoint,
    secondPoint,
    distanceMeters,
    liveDistanceMeters,
    formattedDistance,
    formattedLiveDistance,
    resetCount,
    capabilities,
    cameraResolution,
    qualityMode,
    zoom,
    instruction,
    statusSummary,
    isResetting,
    setUnit,
    setZoom,
    setQuality,
    startNewMeasurement,
    placePoint,
    resetMeasurement,
  } = useMeasurementSession();

  const camera = useCameraStream({
    enabled: !capabilities.hasARCorePlugin,
  });

  const [isBridgeOpen, setIsBridgeOpen] = useState(false);

  return (
    <div
      className={`relative h-dvh w-full overflow-hidden text-[#F4F5F7] select-none ${
        capabilities.hasARCorePlugin ? 'bg-transparent' : 'bg-[#080A0D]'
      }`}
    >
      <ARViewport
        isResetting={isResetting}
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
        instruction={instruction}
        trackingStatus={trackingStatus}
        statusSummary={statusSummary}
        capabilities={capabilities}
        camera={camera}
        onUnitChange={setUnit}
        onOpenBridgeInfo={() => setIsBridgeOpen(true)}
      />

      <MeasurementControls
        unit={unit}
        phase={phase}
        trackingStatus={trackingStatus}
        formattedDistance={formattedDistance}
        formattedLiveDistance={formattedLiveDistance}
        onUnitChange={setUnit}
        onPlacePoint={placePoint}
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
        cameraResolution={cameraResolution}
        qualityMode={qualityMode}
        zoom={zoom}
        onZoomChange={setZoom}
        onQualityChange={setQuality}
      />
    </div>
  );
}
