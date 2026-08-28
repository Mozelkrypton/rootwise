# RootWise ESP32 Firmware

PlatformIO firmware for the ESP32 sensor node. Reads DHT22, soil moisture, and LDR sensors; drives the irrigation relay; displays live values on a 16×2 I2C LCD; and posts telemetry to the FastAPI backend every 3 seconds.

## Hardware

| Component | Pin / Bus |
|---|---|
| DHT22 | GPIO 4 |
| Soil moisture (analog) | GPIO 34 |
| LDR (analog) | GPIO 35 |
| Relay (pump) | GPIO 26 (`RELAY_ACTIVE LOW` by default) |
| I2C LCD 16×2 | SDA GPIO 21, SCL GPIO 22, address `0x27` |

## Setup

1. Edit `src/main.cpp` and set `WIFI_SSID`, `WIFI_PASSWORD`, and `SERVER_URL` (your machine's LAN IP, e.g. `http://192.168.1.100:8000/api/telemetry`).
2. Calibrate `SOIL_ADC_DRY`, `SOIL_ADC_WET`, `LDR_ADC_DARK`, and `LDR_ADC_BRIGHT` for your probes.
3. Build and upload:

```bash
cd firmware
pio run -t upload
pio device monitor
```

## Automation

| Mode | Behavior |
|---|---|
| Auto (`pump_override: null`) | Relay ON when soil &lt; 35%, OFF when soil ≥ 60% (hysteresis between) |
| Force ON | Relay ON regardless of soil level |
| Force OFF | Relay OFF regardless of soil level |

Override commands come from the backend response to each `POST /api/telemetry`, or from the dashboard via `POST /api/actuators/pump`.

## LCD layout

```
L: 78% T:24.5C
S: 42% H:65% PUMP
```

`PUMP` appears only while the relay is active; the display updates only when values change to reduce flicker.
