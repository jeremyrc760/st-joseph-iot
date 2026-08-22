import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { io, Socket as ClientSocket } from 'socket.io-client';

import { AddressInfo } from 'net';

import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';

import { UsersService } from '../src/users/users.service';
import { User, UserSchema } from '../src/users/user.schema';

import { TelemetryGateway } from '../src/telemetry/telemetry.gateway';

// Give MongoDB Memory Server enough time to start.
jest.setTimeout(30000);

describe('WebSocket E2E', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let serverUrl: string;
  let client: ClientSocket | undefined;
  let telemetryGateway: TelemetryGateway;

  beforeAll(async () => {
    // Start a temporary MongoDB instance.
    mongoServer = await MongoMemoryServer.create();

    const mongoUri = mongoServer.getUri();

    // Create a real NestJS application.
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Use temporary MongoDB for authentication test data.
        MongooseModule.forRoot(mongoUri),

        // Register the real User schema.
        MongooseModule.forFeature([
          {
            name: User.name,
            schema: UserSchema,
          },
        ]),

        // Use a real JwtService.
        // AuthService signs JWTs with this secret,
        // and TelemetryGateway verifies them
        // with the same secret.
        JwtModule.register({
          secret: 'test-jwt-secret',
          signOptions: {
            expiresIn: '1h',
          },
        }),
      ],

      controllers: [AuthController],

      providers: [
        AuthService,
        UsersService,

        // Use the real WebSocket gateway.
        TelemetryGateway,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Get the real TelemetryGateway instance
    // so the test can trigger a telemetry broadcast.
    telemetryGateway = moduleFixture.get<TelemetryGateway>(TelemetryGateway);

    // A real network port is required because
    // socket.io-client connects over the network.
    // Port 0 tells the operating system to choose
    // an available port automatically.
    await app.listen(0, '127.0.0.1');

    // Get the automatically assigned port.
    const address = app.getHttpServer().address() as AddressInfo;

    serverUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(() => {
    // Close the Socket.IO client after each test
    // so Jest does not keep an open network connection.
    if (client) {
      client.disconnect();
      client = undefined;
    }
  });

  afterAll(async () => {
    // Close the NestJS HTTP/WebSocket server.
    await app.close();

    // Stop the temporary MongoDB instance.
    await mongoServer.stop();
  });

  // =========================================================
  // Valid JWT WebSocket Connection Test
  // =========================================================

  it('should connect to WebSocket with a valid JWT', async () => {
    // -------------------------
    // Arrange - Register
    // -------------------------

    // Register a real user.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'websocket@example.com',
        password: 'password123',
        name: 'WebSocket User',
      })
      .expect(201);

    // -------------------------
    // Arrange - Login
    // -------------------------

    // Login and receive a real JWT.
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'websocket@example.com',
        password: 'password123',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    expect(accessToken).toBeDefined();

    // -------------------------
    // Act
    // -------------------------

    // Create a real Socket.IO client.
    // The JWT is sent inside handshake.auth.token,
    // which matches TelemetryGateway.handleConnection().
    client = io(serverUrl, {
      autoConnect: false,

      auth: {
        token: accessToken,
      },

      transports: ['websocket'],
    });

    // Wait until the real WebSocket connection succeeds.
    await new Promise<void>((resolve, reject) => {
      client!.once('connect', () => {
        resolve();
      });

      client!.once('connect_error', (error) => {
        reject(error);
      });

      client!.connect();
    });

    // Give the gateway a short moment to finish
    // JWT verification inside handleConnection().
    await new Promise((resolve) => setTimeout(resolve, 50));

    // -------------------------
    // Assert
    // -------------------------

    // The client should remain connected because
    // the JWT is valid.
    expect(client.connected).toBe(true);
  });

  // =========================================================
  // Missing JWT WebSocket Connection Test
  // =========================================================

  it('should disconnect WebSocket client when JWT is missing', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Create a Socket.IO client without an access token.
    client = io(serverUrl, {
      autoConnect: false,

      // No auth token is provided.
      auth: {},

      transports: ['websocket'],
    });

    // -------------------------
    // Act
    // -------------------------

    // Wait until the client connects first.
    await new Promise<void>((resolve, reject) => {
      client!.once('connect', () => {
        resolve();
      });

      client!.once('connect_error', (error) => {
        reject(error);
      });

      client!.connect();
    });

    // TelemetryGateway.handleConnection() should detect
    // the missing token and disconnect the client.
    await new Promise<void>((resolve) => {
      if (!client!.connected) {
        resolve();
        return;
      }

      client!.once('disconnect', () => {
        resolve();
      });
    });

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the client is no longer connected.
    expect(client.connected).toBe(false);
  });

  // =========================================================
  // Invalid JWT WebSocket Connection Test
  // =========================================================

  it('should disconnect WebSocket client when JWT is invalid', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Create a Socket.IO client with an invalid access token.
    client = io(serverUrl, {
      autoConnect: false,

      auth: {
        token: 'invalid-token',
      },

      transports: ['websocket'],
    });

    // -------------------------
    // Act
    // -------------------------

    // Wait until the Socket.IO connection is established.
    await new Promise<void>((resolve, reject) => {
      client!.once('connect', () => {
        resolve();
      });

      client!.once('connect_error', (error) => {
        reject(error);
      });

      client!.connect();
    });

    // TelemetryGateway.handleConnection() should fail
    // JWT verification and disconnect the client.
    await new Promise<void>((resolve) => {
      if (!client!.connected) {
        resolve();
        return;
      }

      client!.once('disconnect', () => {
        resolve();
      });
    });

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the client was disconnected
    // because the JWT was invalid.
    expect(client.connected).toBe(false);
  });

  // =========================================================
  // Realtime Telemetry WebSocket Test
  // =========================================================

  it('should receive realtime telemetry through WebSocket', async () => {
    // -------------------------
    // Arrange - Register
    // -------------------------

    // Register a real user for this test.
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'realtime@example.com',
        password: 'password123',
        name: 'Realtime User',
      })
      .expect(201);

    // -------------------------
    // Arrange - Login
    // -------------------------

    // Login and obtain a real JWT.
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'realtime@example.com',
        password: 'password123',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    // Fake telemetry data that will be broadcast
    // through the real Socket.IO server.
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

    // Create a real authenticated Socket.IO client.
    client = io(serverUrl, {
      autoConnect: false,

      auth: {
        token: accessToken,
      },

      transports: ['websocket'],
    });

    // Connect the client first.
    await new Promise<void>((resolve, reject) => {
      client!.once('connect', () => {
        resolve();
      });

      client!.once('connect_error', (error) => {
        reject(error);
      });

      client!.connect();
    });

    // -------------------------
    // Act + Assert
    // -------------------------

    // Wait for the real client to receive
    // the "telemetry" WebSocket event.
    const receivedTelemetry = await new Promise((resolve, reject) => {
      // Fail the test if telemetry is not received
      // within a reasonable amount of time.
      const timeout = setTimeout(() => {
        reject(new Error('Timed out waiting for telemetry event'));
      }, 2000);

      client!.once('telemetry', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });

      // Trigger a real WebSocket broadcast
      // from the real TelemetryGateway.
      telemetryGateway.emitTelemetry(mockTelemetry);
    });

    // Verify that the client received
    // exactly the telemetry data that was broadcast.
    expect(receivedTelemetry).toEqual(mockTelemetry);
  });
});
