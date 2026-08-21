import { Test, TestingModule } from '@nestjs/testing';

import { TelemetryController } from './telemetry.controller';
import { TelemetryService } from './telemetry.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('TelemetryController', () => {
  let telemetryController: TelemetryController;

  // Mock TelemetryService so the controller unit test
  // does not execute real database or Azure logic.
  const telemetryServiceMock = {
    findLatest: jest.fn(),
  };

  // Mock JwtAuthGuard because authentication logic
  // is already tested separately in jwt-auth.guard.spec.ts.
  const jwtAuthGuardMock = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    // Create a NestJS testing module.
    // TelemetryController is real, while TelemetryService
    // and JwtAuthGuard are replaced with mocks.
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [TelemetryController],

        providers: [
          {
            provide: TelemetryService,
            useValue: telemetryServiceMock,
          },
        ],
      })

        // Replace the real JwtAuthGuard with a mock guard.
        // This prevents NestJS from trying to create
        // JwtAuthGuard and inject a real JwtService.
        .overrideGuard(JwtAuthGuard)
        .useValue(jwtAuthGuardMock)

        .compile();

    // Get the real TelemetryController instance
    // from the testing module.
    telemetryController =
      module.get<TelemetryController>(
        TelemetryController,
      );

    // Clear previous mock calls before each test.
    jest.clearAllMocks();
  });

  // =========================================================
  // Latest Telemetry Controller Test
  // =========================================================

  it(
    'should call TelemetryService.findLatest and return telemetry records',
    async () => {
      // -------------------------
      // Arrange
      // -------------------------

      // Fake telemetry records that would normally
      // be returned from MongoDB.
      const mockTelemetryRecords = [
        {
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
        },
        {
          deviceId: 'device-001',
          timestamp: '2026-08-21T11:59:59.000Z',
          imu: {
            ax: 0.2,
            ay: 0.1,
            az: 9.7,
          },
          load: {
            weight: 24.8,
          },
        },
      ];

      // Simulate TelemetryService returning
      // the latest telemetry records.
      telemetryServiceMock.findLatest.mockResolvedValue(
        mockTelemetryRecords,
      );

      // -------------------------
      // Act
      // -------------------------

      // Call the real controller method.
      const result =
        await telemetryController.getLatestTelemetry();

      // -------------------------
      // Assert
      // -------------------------

      // Verify that the controller called
      // TelemetryService.findLatest().
      expect(
        telemetryServiceMock.findLatest,
      ).toHaveBeenCalledTimes(1);

      // Verify that the controller returned
      // the result from TelemetryService.
      expect(result).toEqual(
        mockTelemetryRecords,
      );
    },
  );
});