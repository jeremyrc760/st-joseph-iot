import { API_BASE_URL } from './config';
import type { AuthMode, LoginResponse, TelemetryPayload } from './types';

type AuthInput = {
  email: string;
  password: string;
  name?: string;
};

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : 'Request failed';

    throw new Error(message);
  }

  return payload as T;
}

export async function submitAuth(
  mode: AuthMode,
  input: AuthInput,
): Promise<LoginResponse | null> {
  if (mode === 'register') {
    await requestJson('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  return requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      password: input.password,
    }),
  });
}

export async function fetchLatestTelemetry(
  accessToken: string,
): Promise<TelemetryPayload[]> {
  return requestJson<TelemetryPayload[]>('/telemetry/latest', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
