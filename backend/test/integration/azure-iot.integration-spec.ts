import 'dotenv/config';

import {
  Client,
  Message,
} from 'azure-iot-device';

import { MqttWs } from 'azure-iot-device-mqtt';

import {
  EventHubConsumerClient,
  latestEventPosition,
} from '@azure/event-hubs';

// External Azure integration tests may take longer
// than normal unit tests.
jest.setTimeout(30000);

describe('Azure IoT Integration', () => {
  // Read Azure configuration from backend/.env.
  const deviceConnectionString =
    process.env.IOT_DEVICE_CONNECTION_STRING;

  const eventHubConnectionString =
    process.env.IOT_HUB_EVENTHUB_CONNECTION_STRING;

  const eventHubName =
    process.env.IOT_HUB_EVENTHUB_NAME;

  const consumerGroup =
    process.env.IOT_HUB_TEST_CONSUMER_GROUP;

  // =========================================================
  // Azure Configuration Test
  // =========================================================

  it('should load the required Azure IoT configuration', () => {
    // Verify that all required Azure configuration exists.
    expect(deviceConnectionString).toBeDefined();

    expect(eventHubConnectionString).toBeDefined();

    expect(eventHubName).toBeDefined();

    expect(consumerGroup).toBeDefined();

    // Verify that none of the configuration values are empty.
    expect(deviceConnectionString).not.toBe('');

    expect(eventHubConnectionString).not.toBe('');

    expect(eventHubName).not.toBe('');

    expect(consumerGroup).not.toBe('');
  });

  // =========================================================
  // Azure Publish -> Consume Integration Test
  // =========================================================

  it('should publish telemetry to IoT Hub and consume the same message', async () => {
    // Make sure TypeScript knows these values exist
    // after the configuration test above.
    if (
      !deviceConnectionString ||
      !eventHubConnectionString ||
      !eventHubName ||
      !consumerGroup
    ) {
      throw new Error(
        'Azure IoT integration configuration is missing',
      );
    }

    // Generate a unique ID so this test can distinguish
    // its own message from other telemetry in IoT Hub.
    const testId =
      `integration-${Date.now()}`;

    // Create known test telemetry.
    const testTelemetry = {
      testId,
      deviceId: 'device-001',
      timestamp: new Date().toISOString(),
      accelerometer: {
        x: 0.1,
        y: 0.2,
        z: 9.8,
      },
      load_left: 25.5,
      load_right: 24.9,
    };

    // ---------------------------------------------------------
    // Create Azure Event Hub Consumer
    // ---------------------------------------------------------

    // Create a real consumer connected to the IoT Hub
    // Event Hub-compatible endpoint.
    const consumerClient =
      new EventHubConsumerClient(
        consumerGroup,
        eventHubConnectionString,
        eventHubName,
      );

    // This promise resolves only when the exact test message
    // sent by this test is received from Azure.
    let resolveMessage:
      | ((value: unknown) => void)
      | undefined;

    let rejectMessage:
      | ((reason?: unknown) => void)
      | undefined;

    const receivedMessagePromise =
      new Promise<unknown>((resolve, reject) => {
        resolveMessage = resolve;
        rejectMessage = reject;
      });

    // Subscribe before publishing the message.
    // Start at the latest event position so old telemetry
    // does not interfere with this integration test.
    const subscription =
      consumerClient.subscribe(
        {
          processEvents: async (events) => {
            for (const event of events) {
              let body = event.body;

              // Depending on message parsing behavior,
              // the body may already be an object or may
              // still be a JSON string.
              if (typeof body === 'string') {
                try {
                  body = JSON.parse(body);
                } catch {
                  continue;
                }
              }

              // Ignore unrelated telemetry messages.
              if (
                body &&
                typeof body === 'object' &&
                'testId' in body &&
                body.testId === testId
              ) {
                resolveMessage?.(body);
              }
            }
          },

          processError: async (error) => {
            // Fail the test if the Azure consumer
            // reports an unexpected error.
            rejectMessage?.(error);
          },
        },
        {
          startPosition: latestEventPosition,
          maxWaitTimeInSeconds: 5,
        },
      );

    // ---------------------------------------------------------
    // Create Azure IoT Device Publisher
    // ---------------------------------------------------------

    // Create a real device client using MQTT.
    const deviceClient =
      Client.fromConnectionString(
        deviceConnectionString,
        MqttWs,
      );

    try {
      // Give the consumer a short moment to establish
      // its subscription before the device publishes.
      await new Promise((resolve) =>
        setTimeout(resolve, 1000),
      );

      // Open the real device connection.
      await new Promise<void>(
        (resolve, reject) => {
          deviceClient.open((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        },
      );

      // Convert the telemetry object into an IoT Hub message.
      const message = new Message(
        JSON.stringify(testTelemetry),
      );

      // Tell IoT Hub that the telemetry body contains UTF-8 JSON.
      message.contentType = 'application/json';
      message.contentEncoding = 'utf-8';

      

      // Publish the telemetry to Azure IoT Hub.
      await new Promise<void>(
        (resolve, reject) => {
          deviceClient.sendEvent(
            message,
            (error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            },
          );
        },
      );

      // Wait for the same message to come back through
      // the Event Hub-compatible consumer endpoint.
      const receivedTelemetry =
        await Promise.race([
          receivedMessagePromise,

          // Fail instead of waiting forever.
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    'Timed out waiting for Azure IoT telemetry',
                  ),
                ),
              15000,
            ),
          ),
        ]);

      // -------------------------------------------------------
      // Assert
      // -------------------------------------------------------

      // Verify that the exact message sent by this test
      // was received through Azure IoT Hub.
      expect(receivedTelemetry).toEqual(
        expect.objectContaining({
          testId,
          deviceId: 'device-001',
          load_left: 25.5,
          load_right: 24.9,
        }),
      );
    } finally {
      // Always close external Azure resources,
      // even if the test fails.

      await subscription.close();

      await consumerClient.close();

      await new Promise<void>((resolve) => {
        deviceClient.close(() => {
          resolve();
        });
      });
    }
  });
});