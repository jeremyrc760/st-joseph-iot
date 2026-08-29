import type { DashboardReading, TelemetryPayload } from './types';

const FALLBACK_READING: DashboardReading = {
  tiltAngle: 3,
  loadLeft: 75,
  loadRight: 73,
  loadUnit: 'lb',
  timestamp: new Date().toISOString(),
  deviceId: 'device-001',
};

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toPounds(weight: number, unit?: string) {
  return unit === 'kg' ? weight * 2.20462 : weight;
}

function calculateTilt(payload: TelemetryPayload) {
  const accelerometer = payload.imu.accelerometer;

  if (
    !accelerometer ||
    !isNumber(accelerometer.x) ||
    !isNumber(accelerometer.y) ||
    !isNumber(accelerometer.z)
  ) {
    return FALLBACK_READING.tiltAngle;
  }

  const horizontal = Math.sqrt(
    accelerometer.x ** 2 + accelerometer.y ** 2,
  );
  const radians = Math.atan2(horizontal, Math.abs(accelerometer.z));

  return Math.round((radians * 180) / Math.PI);
}

function calculateLoads(payload: TelemetryPayload) {
  if (isNumber(payload.load.left) && isNumber(payload.load.right)) {
    return {
      left: Math.round(payload.load.left),
      right: Math.round(payload.load.right),
      unit: payload.load.unit ?? 'lb',
    };
  }

  if (isNumber(payload.load.weight)) {
    const totalLoad = toPounds(payload.load.weight, payload.load.unit);
    const lean = payload.imu.accelerometer?.x ?? 0;
    const offset = Math.max(-4, Math.min(4, lean * 2));

    return {
      left: Math.round(totalLoad / 2 + offset),
      right: Math.round(totalLoad / 2 - offset),
      unit: 'lb',
    };
  }

  return {
    left: FALLBACK_READING.loadLeft,
    right: FALLBACK_READING.loadRight,
    unit: FALLBACK_READING.loadUnit,
  };
}

export function toDashboardReading(
  payload?: TelemetryPayload,
): DashboardReading {
  if (!payload) {
    return FALLBACK_READING;
  }

  const loads = calculateLoads(payload);

  return {
    tiltAngle: calculateTilt(payload),
    loadLeft: loads.left,
    loadRight: loads.right,
    loadUnit: loads.unit,
    timestamp: payload.timestamp,
    deviceId: payload.deviceId,
  };
}

export function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');

  return `${minutes}:${seconds}`;
}
