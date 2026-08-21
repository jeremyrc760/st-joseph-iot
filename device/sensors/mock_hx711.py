import random


def read_hx711():
    """Generate simulated HX711 load sensor data."""

    raw_value = random.randint(800000, 900000)

    weight = round(random.uniform(60.0, 80.0), 2)

    return {
        "raw": raw_value,
        "weight": weight,
        "unit": "kg"
    }