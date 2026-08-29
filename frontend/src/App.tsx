import { useEffect, useMemo, useState } from 'react';
import { Activity, BatteryCharging, Bell, LogOut, Shield, Wifi } from 'lucide-react';
import { io } from 'socket.io-client';
import patientLiftImage from './assets/patient-lift-care.png';
import { SOCKET_URL } from './config';
import { fetchLatestTelemetry, submitAuth } from './api';
import { formatElapsed, toDashboardReading } from './telemetry';
import type { AuthMode, AuthUser, DashboardReading, TelemetryPayload } from './types';

const TOKEN_STORAGE_KEY = 'st-joseph-iot-token';
const USER_STORAGE_KEY = 'st-joseph-iot-user';

function isDashboardPreview() {
  return (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('preview') === 'dashboard'
  );
}

function getInitialToken() {
  if (isDashboardPreview()) {
    return 'preview-token';
  }

  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function getInitialUser(): AuthUser | null {
  if (isDashboardPreview()) {
    return {
      id: 'preview',
      email: 'preview@example.com',
      name: 'Care Team',
    };
  }

  const storedUser = localStorage.getItem(USER_STORAGE_KEY);
  return storedUser ? (JSON.parse(storedUser) as AuthUser) : null;
}

function Gauge({
  label,
  value,
  unit,
  min,
  max,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
}) {
  const percent = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const isGood = percent >= 35 && percent <= 82;

  return (
    <section className="sensor-card">
      <div className="sensor-header">
        <span>{label}</span>
        <strong className={isGood ? 'reading-good' : 'reading-alert'}>
          {value} {unit}
        </strong>
      </div>
      <div className="gauge-track">
        <span className="gauge-marker" style={{ left: `${percent}%` }} />
      </div>
      <div className="gauge-labels">
        <span>Bad</span>
        <span>Good</span>
      </div>
    </section>
  );
}

function AuthPanel({
  onAuthenticated,
}: {
  onAuthenticated: (token: string, user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await submitAuth(mode, {
        email,
        password,
        name: name || undefined,
      });

      if (response) {
        onAuthenticated(response.accessToken, response.user);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-lockup">
          <span className="brand-icon">
            <Activity size={26} />
          </span>
          <div>
            <p>St. Joseph IoT</p>
            <h1>Resident lift telemetry</h1>
          </div>
        </div>

        <div className="mode-tabs" role="tablist" aria-label="Authentication mode">
          <button
            className={mode === 'login' ? 'active' : ''}
            type="button"
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            type="button"
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Name
              <input
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Clinical user"
              />
            </label>
          )}

          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
            />
          </label>

          <label>
            Password
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            <Shield size={18} />
            {isSubmitting ? 'Connecting' : mode === 'login' ? 'Enter dashboard' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({
  token,
  user,
  onLogout,
}: {
  token: string;
  user: AuthUser;
  onLogout: () => void;
}) {
  const [reading, setReading] = useState<DashboardReading>(() => toDashboardReading());
  const [connected, setConnected] = useState(false);
  const [elapsed, setElapsed] = useState(185);

  useEffect(() => {
    let isMounted = true;

    fetchLatestTelemetry(token)
      .then((records) => {
        if (isMounted && records.length > 0) {
          setReading(toDashboardReading(records[0]));
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('telemetry', (payload: TelemetryPayload) => {
      setReading(toDashboardReading(payload));
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setElapsed((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const statusText = useMemo(() => {
    if (!connected) {
      return 'Waiting for telemetry';
    }

    if (Math.abs(reading.tiltAngle) > 10) {
      return 'Tilt attention needed';
    }

    return 'Lifting stable';
  }, [connected, reading.tiltAngle]);

  return (
    <main className="dashboard-shell">
      <div className="tablet-frame">
        <section className="tablet-screen">
          <header className="topbar">
            <div className="topbar-icons">
              <BatteryCharging size={28} />
              <Bell size={26} />
            </div>
            <div className="operator-chip">
              <Wifi size={16} />
              <span>{connected ? 'Live' : 'Offline'}</span>
            </div>
            <button className="icon-button" type="button" onClick={onLogout} aria-label="Log out">
              <LogOut size={20} />
            </button>
          </header>

          <div className="dashboard-grid">
            <section className="lift-panel">
              <div className="bubble">{statusText}</div>
              <img src={patientLiftImage} alt="Resident supported by lift and caregiver" />
              <div className="device-strip">
                <span>{reading.deviceId}</span>
                <span>{new Date(reading.timestamp).toLocaleTimeString()}</span>
              </div>
            </section>

            <section className="metrics-panel">
              <div className="title-row">
                <div>
                  <p>Care session</p>
                  <h1>Raising Resident...</h1>
                </div>
                <span>{user.name ?? user.email}</span>
              </div>

              <Gauge label="Tilt Angle" value={reading.tiltAngle} unit="deg" min={0} max={18} />

              <section className="sensor-card dual-load">
                <div className="sensor-header stacked">
                  <span>Load Tension L</span>
                  <strong>{reading.loadLeft} {reading.loadUnit}</strong>
                  <span>Load Tension R</span>
                  <strong>{reading.loadRight} {reading.loadUnit}</strong>
                </div>
                <div className="gauge-track">
                  <span
                    className="gauge-marker"
                    style={{
                      left: `${Math.min(100, Math.max(0, (reading.loadLeft / 120) * 100))}%`,
                    }}
                  />
                </div>
                <div className="gauge-labels">
                  <span>Bad</span>
                  <span>Good</span>
                </div>
              </section>

              <div className="timer-ring">
                <span>{formatElapsed(elapsed)}</span>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

export function App() {
  const [token, setToken] = useState(getInitialToken);
  const [user, setUser] = useState<AuthUser | null>(getInitialUser);

  function handleAuthenticated(accessToken: string, authUser: AuthUser) {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
    setToken(accessToken);
    setUser(authUser);
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  if (!token || !user) {
    return <AuthPanel onAuthenticated={handleAuthenticated} />;
  }

  return <Dashboard token={token} user={user} onLogout={handleLogout} />;
}
