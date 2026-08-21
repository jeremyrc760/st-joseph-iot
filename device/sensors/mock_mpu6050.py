import random


def read_mpu6050():
    """Generate simulated MPU6050 sensor data."""

    accelerometer = {
        "x": round(random.uniform(-2.0, 2.0), 2),
        "y": round(random.uniform(-2.0, 2.0), 2),
        "z": round(random.uniform(9.0, 10.5), 2),
        "unit": "m/s2"
    }

    gyroscope = {
        "x": round(random.uniform(-5.0, 5.0), 2),
        "y": round(random.uniform(-5.0, 5.0), 2),
        "z": round(random.uniform(-5.0, 5.0), 2),
        "unit": "deg/s"
    }

    return {
        "accelerometer": accelerometer,
        "gyroscope": gyroscope
    }