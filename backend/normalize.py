from __future__ import annotations

from typing import Any, Dict, Optional


def _first_present(data: Dict[str, Any], *keys: str) -> Optional[Any]:
    for key in keys:
        if key in data and data[key] is not None:
            return data[key]
    return None


def normalize_telemetry_payload(data: Any) -> Dict[str, Any]:
    """Accept canonical REST keys and short aliases from ESP32 / MQTT bridges."""
    if not isinstance(data, dict):
        return data

    normalized = dict(data)

    temperature = _first_present(data, "temperature", "temp_c")
    if temperature is not None:
        normalized["temperature"] = temperature

    soil = _first_present(data, "soil_moisture", "soil_pct")
    if soil is not None:
        normalized["soil_moisture"] = soil

    light = _first_present(data, "light_intensity", "light_pct")
    if light is not None:
        normalized["light_intensity"] = light

    return normalized


def telemetry_aliases(
    *,
    temperature: float,
    humidity: float,
    soil_moisture: float,
    light_intensity: float,
    pump_status: bool,
    crop: str,
    soil_on: float,
    soil_off: float,
) -> Dict[str, float | bool | str]:
    return {
        "temperature": temperature,
        "temp_c": temperature,
        "humidity": humidity,
        "soil_moisture": soil_moisture,
        "soil_pct": soil_moisture,
        "light_intensity": light_intensity,
        "light_pct": light_intensity,
        "pump_status": pump_status,
        "crop": crop,
        "soil_on": soil_on,
        "soil_off": soil_off,
    }
