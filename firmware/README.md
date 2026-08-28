# RootWise ESP32 Firmware

PlatformIO firmware for the ESP32 sensor node. Posts **HTTP REST** telemetry to the FastAPI backend every 3 seconds (MQTT is not used on-device; the backend can add an MQTT bridge later if needed).

## Board profiles (`include/board_config.h`)

| Component | ESP32 (`esp32dev`) | ESP32-S3 (`esp32s3`) |
|---|---|---|
| DHT22 | GPIO 4 | GPIO 4 |
| Soil moisture (ADC) | GPIO 34 | GPIO 1 |
| LDR (ADC) | GPIO 35 | GPIO 2 |
| Relay (pump) | GPIO 26 | GPIO 5 |
| I2C LCD SDA / SCL | GPIO 21 / 22 | GPIO 8 / 9 |

Build for classic ESP32 (default):

```bash
pio run -e esp32dev -t upload
```

Build for ESP32-S3:

```bash
pio run -e esp32s3 -t upload
```

## Telemetry schema (aligned with backend + dashboard)

Each `POST /api/telemetry` payload includes canonical and alias keys:

| Field | Alias | Type |
|---|---|---|
| `temperature` | `temp_c` | °C |
| `humidity` | — | % |
| `soil_moisture` | `soil_pct` | % |
| `light_intensity` | `light_pct` | % |
| `pump_status` | — | boolean |
| `crop` | — | string (e.g. `maize`) |
| `soil_on` | — | pump ON threshold % |
| `soil_off` | — | pump OFF threshold % |

## Setup

1. Edit `src/main.cpp`: `WIFI_SSID`, `WIFI_PASSWORD`, `SERVER_URL`, `CROP_NAME`.
2. Calibrate ADC constants (`SOIL_ADC_*`, `LDR_ADC_*`).
3. Flash and monitor:

```bash
pio device monitor -b 115200
```

## Automation

| Mode | Behavior |
|---|---|
| Auto (`pump_override: null`) | Relay ON when soil &lt; `soil_on` (35%), OFF when ≥ `soil_off` (60%) |
| Force ON / OFF | From backend `pump_override` in POST response |
