import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMERA_STATUSES,
  buildVideoConstraints,
  classifyCameraError,
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
