import time

from sensors.mock_mpu6050 import read_mpu6050
from sensors.mock_hx711 import read_hx711
from telemetry.telemetry_builder import build_telemetry
from cloud.iot_publisher import create_iot_client, send_telemetry


DEVICE_ID = "device-001"


def main():
    client = create_iot_client()


    while True:
        imu_data = read_mpu6050()
        load_data = read_hx711()

        telemetry = build_telemetry(
            DEVICE_ID,
            imu_data,
            load_data
        )

        print(telemetry)

        send_telemetry(client, telemetry)

        time.sleep(1)


if __name__ == "__main__":
    main()