import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

import { TelemetryGateway } from './telemetry.gateway';

describe('TelemetryGateway', () => {
  let telemetryGateway: TelemetryGateway;

  // Mock JwtService so the tests do not verify real JWT tokens.
  const jwtServiceMock = {
    verifyAsync: jest.fn(),
  };

  // Mock Socket.IO server so the tests do not start
  // a real WebSocket server.
  const serverMock = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    // Create a NestJS testing module.
    // TelemetryGateway is real, while JwtService is mocked.
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          TelemetryGateway,
          {
            provide: JwtService,
            useValue: jwtServiceMock,
          },
        ],
      }).compile();

    // Get the real TelemetryGateway instance.
    telemetryGateway =
      module.get<TelemetryGateway>(TelemetryGateway);

    // Replace the real Socket.IO server with a mock server.
    telemetryGateway.server =
      serverMock as unknown as Server;

    // Clear previous mock calls before every test.
    jest.clearAllMocks();
  });

  // =========================================================
  // Valid Token Test
  // =========================================================

  it('should authenticate a client with a valid access token', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake decoded JWT payload.
    const mockPayload = {
      sub: 'user-123',
      email: 'test@example.com',
    };

    // Fake Socket.IO client with a valid token
    // inside the handshake authentication payload.
    const client = {
      handshake: {
        auth: {
          token: 'valid-token',
        },
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket;

    // Simulate successful JWT verification.
    jwtServiceMock.verifyAsync.mockResolvedValue(
      mockPayload,
    );

    // -------------------------
    // Act
    // -------------------------

    // Call the real WebSocket connection handler.
    await telemetryGateway.handleConnection(client);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that JwtService received the access token.
    expect(
      jwtServiceMock.verifyAsync,
    ).toHaveBeenCalledWith('valid-token');

    // Verify that the decoded user information
    // was attached to the WebSocket client.
    expect(client.data.user).toEqual(mockPayload);

    // A valid authenticated client should not be disconnected.
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  // =========================================================
  // Missing Token Test
  // =========================================================

  it('should disconnect a client when access token is missing', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake Socket.IO client without an access token.
    const client = {
      handshake: {
        auth: {},
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket;

    // -------------------------
    // Act
    // -------------------------

    // Attempt to establish the WebSocket connection.
    await telemetryGateway.handleConnection(client);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the unauthenticated client was disconnected.
    expect(client.disconnect).toHaveBeenCalledTimes(1);

    // JWT verification should never run
    // because no token was provided.
    expect(
      jwtServiceMock.verifyAsync,
    ).not.toHaveBeenCalled();
  });

  // =========================================================
  // Invalid or Expired Token Test
  // =========================================================

  it('should disconnect a client when access token is invalid or expired', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake Socket.IO client with an invalid token.
    const client = {
      handshake: {
        auth: {
          token: 'invalid-token',
        },
      },
      data: {},
      disconnect: jest.fn(),
    } as unknown as Socket;

    // Simulate JWT verification failure.
    jwtServiceMock.verifyAsync.mockRejectedValue(
      new Error('Invalid or expired token'),
    );

    // -------------------------
    // Act
    // -------------------------

    // Attempt to establish the WebSocket connection.
    await telemetryGateway.handleConnection(client);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that JwtService attempted to verify the token.
    expect(
      jwtServiceMock.verifyAsync,
    ).toHaveBeenCalledWith('invalid-token');

    // Verify that the invalid client was disconnected.
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });

  // =========================================================
  // Telemetry Broadcast Test
  // =========================================================

  it('should emit telemetry data to connected WebSocket clients', () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake realtime telemetry data.
    const mockTelemetry = {
      deviceId: 'device-001',
      timestamp: '2026-08-21T12:00:00.000Z',
      imu: {
        ax: 0.1,
        ay: 0.2,
        az: 9.8,
      },
      load: {
        weight: 25.5,
      },
    };

    // -------------------------
    // Act
    // -------------------------

    // Call the real emitTelemetry() method.
    telemetryGateway.emitTelemetry(mockTelemetry);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that Socket.IO broadcasted the telemetry event
    // with the correct event name and data.
    expect(serverMock.emit).toHaveBeenCalledWith(
      'telemetry',
      mockTelemetry,
    );

    // Verify that the telemetry event was emitted once.
    expect(serverMock.emit).toHaveBeenCalledTimes(1);
  });
});