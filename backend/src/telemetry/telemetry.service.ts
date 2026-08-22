import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { EventHubConsumerClient } from '@azure/event-hubs';
import { Model } from 'mongoose';

import { Telemetry } from './telemetry.schema';
import { TelemetryGateway } from './telemetry.gateway';

@Injectable()
export class TelemetryService implements OnModuleInit {
  // Azure Event Hubs client used to consume telemetry from IoT Hub
  private consumerClient: EventHubConsumerClient;

  constructor(
    // Used to read environment variables from backend/.env
    private readonly configService: ConfigService,

    // Mongoose model used to read and write telemetry documents
    @InjectModel(Telemetry.name)
    private readonly telemetryModel: Model<Telemetry>,

    // WebSocket gateway used to push realtime telemetry to frontend clients
    private readonly telemetryGateway: TelemetryGateway,
  ) {
    // Read the Event Hub-compatible connection string from environment variables
    const connectionString = this.configService.get<string>(
      'IOT_HUB_EVENTHUB_CONNECTION_STRING',
    );

    // Read the Event Hub-compatible name from environment variables
    const eventHubName = this.configService.get<string>(
      'IOT_HUB_EVENTHUB_NAME',
    );

    // Stop application startup if required Azure configuration is missing
    if (!connectionString || !eventHubName) {
      throw new Error('IoT Hub configuration is missing');
    }

    // Create the Azure Event Hubs consumer client
    this.consumerClient = new EventHubConsumerClient(
      '$Default',
      connectionString,
      eventHubName,
    );
  }

  private isTelemetryPayload(data: unknown): data is Telemetry {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return false;
    }

    const payload = data as Record<string, unknown>;

    return (
      typeof payload.deviceId === 'string' &&
      typeof payload.timestamp === 'string' &&
      typeof payload.imu === 'object' &&
      payload.imu !== null &&
      !Array.isArray(payload.imu) &&
      typeof payload.load === 'object' &&
      payload.load !== null &&
      !Array.isArray(payload.load)
    );
  }

  onModuleInit() {
    // Start listening for telemetry when the NestJS module initializes
    this.consumerClient.subscribe({
      processEvents: async (events) => {
        for (const event of events) {
          // Treat IoT Hub message data as untrusted external input and validate it before processing
          const body: unknown = event.body;

          // Log incoming telemetry for debugging
          console.log('Received telemetry:', body);

          // Validate telemetry before storing or broadcasting it
          if (!this.isTelemetryPayload(body)) {
            console.warn('Invalid telemetry payload received:', body);
            continue; // Skip invalid telemetry
          }

          // Persist the telemetry document into MongoDB
          await this.telemetryModel.create(body);

          // Push the same telemetry to connected frontend clients in realtime
          this.telemetryGateway.emitTelemetry(body);
        }
      },

      processError: (error) => {
        // Log errors that occur while consuming telemetry events
        console.error('Telemetry consumer error:', error);
        return Promise.resolve(); // Continue processing events after an error
      },
    });
  }

  async findLatest() {
    // Query the latest 20 telemetry documents from MongoDB
    return this.telemetryModel
      .find()
      .sort({ timestamp: -1 }) // Newest telemetry first
      .limit(20) // Return at most 20 records
      .exec(); // Execute the Mongoose query
  }
}
