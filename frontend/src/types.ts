export type AuthMode = 'login' | 'register';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export type TelemetryPayload = {
  deviceId: string;
  timestamp: string;
  imu: {
    accelerometer?: {
      x?: number;
      y?: number;
      z?: number;
      unit?: string;
    };
    gyroscope?: {
      x?: number;
      y?: number;
      z?: number;
      unit?: string;
    };
  };
  load: {
    raw?: number;
    weight?: number;
    left?: number;
    right?: number;
    unit?: string;
  };
};

export type DashboardReading = {
  tiltAngle: number;
  loadLeft: number;
  loadRight: number;
  loadUnit: string;
  timestamp: string;
  deviceId: string;
};
