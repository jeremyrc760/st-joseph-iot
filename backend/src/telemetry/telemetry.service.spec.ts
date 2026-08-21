import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { EventHubConsumerClient } from '@azure/event-hubs';

import { TelemetryService } from './telemetry.service';
import { Telemetry } from './telemetry.schema';
import { TelemetryGateway } from './telemetry.gateway';

// Mock the Azure Event Hubs SDK.
// This prevents the unit tests from creating a real Azure connection.
jest.mock('@azure/event-hubs', () => ({
  EventHubConsumerClient: jest.fn(),
}));

describe('TelemetryService', () => {
  let telemetryService: TelemetryService;

  // Mock subscribe() so the tests do not create
  // a real Azure Event Hubs subscription.
  const subscribeMock = jest.fn();

  // Mock ConfigService so environment variables
  // do not come from the real .env file.
  const configServiceMock = {
    get: jest.fn(),
  };

  // Mock the Mongoose Telemetry model so the tests
  // do not connect to the real MongoDB database.
  const telemetryModelMock = {
    create: jest.fn(),
    find: jest.fn(),
  };

  // Mock TelemetryGateway so the tests do not
  // start or use a real WebSocket server.
  const telemetryGatewayMock = {
    emitTelemetry: jest.fn(),
  };

  beforeEach(async () => {
    // Clear previous mock call history before every test.
    jest.clearAllMocks();

    // Simulate the required IoT Hub environment variables.
    configServiceMock.get.mockImplementation(
      (key: string) => {
        if (
          key === 'IOT_HUB_EVENTHUB_CONNECTION_STRING'
        ) {
          return 'mock-connection-string';
        }

        if (key === 'IOT_HUB_EVENTHUB_NAME') {
          return 'mock-event-hub-name';
        }

        return undefined;
      },
    );

    // Mock the EventHubConsumerClient constructor.
    // TelemetryService will receive this fake client
    // instead of connecting to Azure.
    (
      EventHubConsumerClient as unknown as jest.Mock
    ).mockImplementation(() => ({
      subscribe: subscribeMock,
    }));

    // Create the NestJS testing module.
    // TelemetryService is real, while its external
    // dependencies are replaced with mocks.
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          TelemetryService,

          // Replace the real ConfigService with a mock.
          {
            provide: ConfigService,
            useValue: configServiceMock,
          },

          // Replace the real Mongoose Telemetry model
          // with a mock.
          {
            provide: getModelToken(Telemetry.name),
            useValue: telemetryModelMock,
          },

          // Replace the real WebSocket gateway with a mock.
          {
            provide: TelemetryGateway,
            useValue: telemetryGatewayMock,
          },
        ],
      }).compile();

    // Get the real TelemetryService instance.
    telemetryService =
      module.get<TelemetryService>(TelemetryService);
  });

  afterEach(() => {
    // Restore mocked console methods after each test.
    jest.restoreAllMocks();
  });

  // =========================================================
  // Service Creation Test
  // =========================================================

  it('should be defined', () => {
    // Verify that NestJS successfully created TelemetryService.
    expect(telemetryService).toBeDefined();
  });

  // =========================================================
  // Event Hub Client Configuration Test
  // =========================================================

  it('should create the Event Hub consumer client with configuration values', () => {
    // Verify that TelemetryService requested
    // the correct environment variables.
    expect(
      configServiceMock.get,
    ).toHaveBeenCalledWith(
      'IOT_HUB_EVENTHUB_CONNECTION_STRING',
    );

    expect(
      configServiceMock.get,
    ).toHaveBeenCalledWith(
      'IOT_HUB_EVENTHUB_NAME',
    );

    // Verify that EventHubConsumerClient was created
    // with the correct consumer group and configuration.
    expect(
      EventHubConsumerClient,
    ).toHaveBeenCalledWith(
      '$Default',
      'mock-connection-string',
      'mock-event-hub-name',
    );
  });

  // =========================================================
  // Missing IoT Hub Configuration Test
  // =========================================================

  it('should throw an error when IoT Hub configuration is missing', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Create a ConfigService mock that simulates
    // a missing IoT Hub connection string.
    const missingConfigServiceMock = {
      get: jest.fn((key: string) => {
        if (
          key === 'IOT_HUB_EVENTHUB_CONNECTION_STRING'
        ) {
          return undefined;
        }

        if (key === 'IOT_HUB_EVENTHUB_NAME') {
          return 'mock-event-hub-name';
        }

        return undefined;
      }),
    };

    // -------------------------
    // Act + Assert
    // -------------------------

    // TelemetryService should fail during construction
    // because the required configuration is missing.
    await expect(
      Test.createTestingModule({
        providers: [
          TelemetryService,
          {
            provide: ConfigService,
            useValue: missingConfigServiceMock,
          },
          {
            provide: getModelToken(Telemetry.name),
            useValue: telemetryModelMock,
          },
          {
            provide: TelemetryGateway,
            useValue: telemetryGatewayMock,
          },
        ],
      }).compile(),
    ).rejects.toThrow(
      'IoT Hub configuration is missing',
    );
  });

  // =========================================================
  // Event Subscription Test
  // =========================================================

  it('should subscribe to telemetry events on module initialization', () => {
    // -------------------------
    // Act
    // -------------------------

    // Manually trigger the NestJS lifecycle method.
    telemetryService.onModuleInit();

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the service created an Event Hub subscription.
    expect(subscribeMock).toHaveBeenCalledTimes(1);

    // Verify that subscribe() received
    // both event and error handlers.
    expect(subscribeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        processEvents: expect.any(Function),
        processError: expect.any(Function),
      }),
    );
  });

  // =========================================================
  // Incoming Telemetry Processing Test
  // =========================================================

  it('should save incoming telemetry and emit it through WebSocket', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Prevent console.log() from printing during the unit test.
    const consoleLogSpy = jest
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);

    // Fake telemetry data that would normally
    // arrive from Azure IoT Hub.
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

    // Simulate successful MongoDB insertion.
    telemetryModelMock.create.mockResolvedValue(
      mockTelemetry,
    );

    // Start the Event Hub subscription.
    telemetryService.onModuleInit();

    // Get the handlers passed to subscribe().
    const eventHandlers =
      subscribeMock.mock.calls[0][0];

    // -------------------------
    // Act
    // -------------------------

    // Simulate Azure delivering one telemetry event.
    await eventHandlers.processEvents([
      {
        body: mockTelemetry,
      },
    ]);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the incoming telemetry was logged.
    expect(consoleLogSpy).toHaveBeenCalledWith(
      'Received telemetry:',
      mockTelemetry,
    );

    // Verify that the telemetry was saved to MongoDB.
    expect(
      telemetryModelMock.create,
    ).toHaveBeenCalledWith(mockTelemetry);

    // Verify that the telemetry was pushed
    // to connected frontend clients.
    expect(
      telemetryGatewayMock.emitTelemetry,
    ).toHaveBeenCalledWith(mockTelemetry);

    expect(
      telemetryModelMock.create,
    ).toHaveBeenCalledTimes(1);

    expect(
      telemetryGatewayMock.emitTelemetry,
    ).toHaveBeenCalledTimes(1);
  });

  // =========================================================
  // Event Hub Error Processing Test
  // =========================================================

  it('should log an error when the Event Hub consumer reports an error', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Mock console.error() so the test output remains clean.
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    // Fake error that would normally come from Azure Event Hubs.
    const mockError = new Error(
      'Event Hub connection failed',
    );

    // Start the Event Hub subscription.
    telemetryService.onModuleInit();

    // Get the handlers passed to subscribe().
    const eventHandlers =
      subscribeMock.mock.calls[0][0];

    // -------------------------
    // Act
    // -------------------------

    // Simulate an error from the Event Hub consumer.
    await eventHandlers.processError(mockError);

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the Event Hub error was logged.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Telemetry consumer error:',
      mockError,
    );
  });

  // =========================================================
  // findLatest Test
  // =========================================================

  it('should return the latest 20 telemetry records', async () => {
    // -------------------------
    // Arrange
    // -------------------------

    // Fake telemetry records returned from MongoDB.
    const mockTelemetryRecords = [
      {
        deviceId: 'device-001',
        timestamp: '2026-08-21T12:00:00.000Z',
      },
      {
        deviceId: 'device-001',
        timestamp: '2026-08-21T11:59:59.000Z',
      },
    ];

    // Mock the Mongoose query chain:
    //
    // find()
    //   -> sort()
    //   -> limit()
    //   -> exec()

    const execMock = jest
      .fn()
      .mockResolvedValue(mockTelemetryRecords);

    const limitMock = jest
      .fn()
      .mockReturnValue({
        exec: execMock,
      });

    const sortMock = jest
      .fn()
      .mockReturnValue({
        limit: limitMock,
      });

    telemetryModelMock.find.mockReturnValue({
      sort: sortMock,
    });

    // -------------------------
    // Act
    // -------------------------

    // Call the real TelemetryService.findLatest() method.
    const result =
      await telemetryService.findLatest();

    // -------------------------
    // Assert
    // -------------------------

    // Verify that the MongoDB query started with find().
    expect(
      telemetryModelMock.find,
    ).toHaveBeenCalledTimes(1);

    // Verify that telemetry is sorted newest first.
    expect(sortMock).toHaveBeenCalledWith({
      timestamp: -1,
    });

    // Verify that at most 20 records are requested.
    expect(limitMock).toHaveBeenCalledWith(20);

    // Verify that the Mongoose query was executed.
    expect(execMock).toHaveBeenCalledTimes(1);

    // Verify the final result.
    expect(result).toEqual(
      mockTelemetryRecords,
    );
  });
});