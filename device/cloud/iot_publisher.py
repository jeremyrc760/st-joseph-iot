import json
import os

from azure.iot.device import IoTHubDeviceClient, Message
from dotenv import load_dotenv


load_dotenv()

CONNECTION_STRING = os.getenv(
    "IOT_HUB_DEVICE_CONNECTION_STRING"
)


def create_iot_client():
    """Create an Azure IoT Hub device client."""

    return IoTHubDeviceClient.create_from_connection_string(
        CONNECTION_STRING
    )


def send_telemetry(client, telemetry):
    """Send telemetry to Azure IoT Hub."""

    message_body = json.dumps(telemetry)

    message = Message(message_body)
    message.content_type = "application/json"
    message.content_encoding = "utf-8"

    client.send_message(message)