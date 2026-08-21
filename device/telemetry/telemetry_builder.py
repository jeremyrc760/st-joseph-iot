from datetime import datetime, timezone


def build_telemetry(device_id, imu_data, load_data):
    """Build a telemetry message from sensor data."""

    telemetry = {
        "deviceId": device_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "imu": imu_data,
        "load": load_data
    }

    return telemetry