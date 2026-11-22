import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMERA_STATUSES,
  buildVideoConstraints,
  classifyCameraError,
  extractCameraTrackCapabilities,
  listVideoInputDevices,
  requestCameraStream,
  stopMediaStream,
} from './cameraService.js';

test('buildVideoConstraints constructs facingMode and exact deviceId constraints', () => {
  const rear = buildVideoConstraints({ facingMode: 'environment' });
  assert.equal(rear.audio, false);
  assert.deepEqual(rear.video.facingMode, { ideal: 'environment' });

  const specific = buildVideoConstraints({ deviceId: 'cam-2' });
  assert.deepEqual(specific.video.deviceId, { exact: 'cam-2' });
});

test('classifyCameraError maps browser DOMExceptions to structured UI errors', () => {
  assert.equal(
    classifyCameraError({ name: 'NotAllowedError' }).status,
    CAMERA_STATUSES.DENIED
  );
  assert.equal(
    classifyCameraError({ name: 'NotFoundError' }).status,
    CAMERA_STATUSES.UNAVAILABLE
  );
  assert.equal(
    classifyCameraError({ name: 'NotReadableError' }).status,
    CAMERA_STATUSES.IN_USE
  );
  assert.equal(
    classifyCameraError({ name: 'NotSupportedError' }).status,
    CAMERA_STATUSES.UNSUPPORTED
  );
  assert.equal(
    classifyCameraError({ name: 'UnknownError', message: 'boom' }).status,
    CAMERA_STATUSES.ERROR
  );
});

test('requestCameraStream falls back to generic { video: true } on OverconstrainedError', async () => {
  const calls: unknown[] = [];
  const fakeStream = { getTracks: () => [] } as unknown as MediaStream;

  const mockMediaDevices = {
    getUserMedia: async (constraints: MediaStreamConstraints) => {
      calls.push(constraints);
      if (calls.length === 1) {
        const err = new Error('Constraint mismatch');
        err.name = 'OverconstrainedError';
        throw err;
      }
      return fakeStream;
    },
  } as unknown as MediaDevices;

  const stream = await requestCameraStream({ facingMode: 'environment' }, mockMediaDevices);
  assert.equal(stream, fakeStream);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], { audio: false, video: true });
});

test('requestCameraStream propagates permission denial without swallowing', async () => {
  const mockMediaDevices = {
    getUserMedia: async () => {
      const err = new Error('Permission denied');
      err.name = 'NotAllowedError';
      throw err;
    },
  } as unknown as MediaDevices;

  await assert.rejects(
    () => requestCameraStream({ facingMode: 'environment' }, mockMediaDevices),
    (err: Error) => err.name === 'NotAllowedError'
  );
});

test('stopMediaStream stops every track and listVideoInputDevices filters video inputs', async () => {
  let stopped = 0;
  stopMediaStream({
    getTracks: () => [{ stop: () => { stopped += 1; } }, { stop: () => { stopped += 1; } }],
  } as unknown as MediaStream);
  assert.equal(stopped, 2);

  const cameras = await listVideoInputDevices({
    enumerateDevices: async () => [
      { kind: 'audioinput', deviceId: 'mic1', label: 'Mic' },
      { kind: 'videoinput', deviceId: 'cam1', label: 'Back Camera' },
      { kind: 'videoinput', deviceId: 'cam2', label: '' },
    ],
  } as unknown as MediaDevices);

  assert.deepEqual(cameras, [
    { deviceId: 'cam1', label: 'Back Camera' },
    { deviceId: 'cam2', label: 'Camera 2' },
  ]);
});

test('extractCameraTrackCapabilities strictly filters zoom and quality to hardware-supported ranges', () => {
  // Device without 0.5x ultrawide zoom and max 1080p
  const phoneTrack = {
    getSettings: () => ({ width: 1920, height: 1080, zoom: 1 }),
    getCapabilities: () => ({
      zoom: { min: 1, max: 3, step: 0.1 },
      width: { min: 320, max: 1920 },
      height: { min: 240, max: 1080 },
    }),
  } as unknown as MediaStreamTrack;

  const phoneCaps = extractCameraTrackCapabilities(phoneTrack);
  assert.deepEqual(phoneCaps.availableZooms, ['1x', '2x']);
  assert.equal(phoneCaps.availableZooms.includes('0.5x'), false);
  assert.equal(phoneCaps.availableZooms.includes('4x'), false);
  assert.deepEqual(phoneCaps.availableQualities, ['480p SD', '720p HD', '1080p Full HD']);
  assert.equal(phoneCaps.activeResolution, '1920x1080 (1080p HD)');

  // Webcam without zoom capability and max 720p
  const webcamTrack = {
    getSettings: () => ({ width: 1280, height: 720 }),
    getCapabilities: () => ({
      width: { min: 320, max: 1280 },
      height: { min: 240, max: 720 },
    }),
  } as unknown as MediaStreamTrack;

  const webcamCaps = extractCameraTrackCapabilities(webcamTrack);
  assert.deepEqual(webcamCaps.availableZooms, ['1x']);
  assert.equal(webcamCaps.supportsHardwareZoom, false);
  assert.deepEqual(webcamCaps.availableQualities, ['480p SD', '720p HD']);
  assert.equal(webcamCaps.activeResolution, '1280x720 (720p HD)');
});

