/**
 * RootWise ESP32 Node Firmware
 *
 * HTTP REST telemetry to FastAPI backend (no MQTT on-device).
 * Schema aligned with backend/models.py and src/api/telemetry.js.
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include "board_config.h"

// ---------------------------------------------------------------------------
// Network & field configuration — edit before flashing
// ---------------------------------------------------------------------------
#define WIFI_SSID "Kenzie"
#define WIFI_PASSWORD "WeakLink"
#define SERVER_URL "http://10.91.210.203:8000/api/telemetry"
#define NODE_ID "esp32-node-01"
#define CROP_NAME "maize"

// Pump automation thresholds (%); mirrored in telemetry payload as soil_on/soil_off
static const float SOIL_PUMP_ON_THRESHOLD = 35.0f;
static const float SOIL_PUMP_OFF_THRESHOLD = 60.0f;

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------
static const unsigned long TELEMETRY_INTERVAL_MS = 3000;
static const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
static const unsigned long LCD_REFRESH_INTERVAL_MS = 5000;
static const unsigned long DHT_MIN_INTERVAL_MS = 2200;

// ---------------------------------------------------------------------------
// ADC calibration — tune these on your bench
// ---------------------------------------------------------------------------
static const int SOIL_ADC_DRY = 4095;
static const int SOIL_ADC_WET = 1500;
static const int LDR_ADC_DARK = 400;
static const int LDR_ADC_BRIGHT = 3600;

// ---------------------------------------------------------------------------
// Hardware objects
// ---------------------------------------------------------------------------
DHT dht(DHT_PIN, DHT22);
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, 16, 2);

bool lcdAvailable = false;

struct SensorState {
  float temperature = NAN;
  float humidity = NAN;
  float soilMoisture = 0.0f;
  float lightIntensity = 0.0f;
  bool pumpStatus = false;
} sensors;

enum PumpOverrideMode {
  OVERRIDE_AUTO = 0,
  OVERRIDE_FORCE_ON,
  OVERRIDE_FORCE_OFF,
};

PumpOverrideMode pumpOverride = OVERRIDE_AUTO;

unsigned long lastTelemetryMs = 0;
unsigned long lastWifiAttemptMs = 0;
unsigned long lastLcdRefreshMs = 0;
unsigned long lastDhtReadMs = 0;

char lcdLine1[17] = "";
char lcdLine2[17] = "";
char lcdLine1Prev[17] = "";
char lcdLine2Prev[17] = "";

// ---------------------------------------------------------------------------
// I2C helpers
// ---------------------------------------------------------------------------
static bool probeI2C(uint8_t address) {
  Wire.beginTransmission(address);
  const uint8_t err = Wire.endTransmission();
  yield();
  return err == 0;
}

static bool initLcdIfPresent() {
  if (!probeI2C(LCD_I2C_ADDR)) {
    Serial.printf("LCD not found at 0x%02X — display disabled\n", LCD_I2C_ADDR);
    return false;
  }

  lcd.init();
  yield();
  lcd.backlight();
  lcd.clear();
  lcd.print("RootWise ESP32");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  yield();
  Serial.printf("LCD ready at 0x%02X\n", LCD_I2C_ADDR);
  return true;
}

// ---------------------------------------------------------------------------
// Relay / ADC
// ---------------------------------------------------------------------------
static int relayLevelForPump(bool on) {
  const int relayOn = RELAY_ACTIVE;
  const int relayOff = (RELAY_ACTIVE == LOW) ? HIGH : LOW;
  return on ? relayOn : relayOff;
}

static void setPump(bool on) {
  digitalWrite(RELAY_PIN, relayLevelForPump(on));
  sensors.pumpStatus = on;
}

static int readAdcAverage(uint8_t pin, uint8_t samples = 8) {
  long total = 0;
  for (uint8_t i = 0; i < samples; i++) {
    total += analogRead(pin);
    delay(1);
    yield();
  }
  return static_cast<int>(total / samples);
}

static float mapAdcToPercent(int adcValue, int adcMin, int adcMax) {
  const int clamped = constrain(adcValue, min(adcMin, adcMax), max(adcMin, adcMax));
  return (static_cast<float>(clamped - adcMin) * 100.0f) /
         static_cast<float>(adcMax - adcMin);
}

static float readSoilMoisturePercent() {
  const int adc = readAdcAverage(SOIL_MOISTURE_PIN);
  return 100.0f - mapAdcToPercent(adc, SOIL_ADC_WET, SOIL_ADC_DRY);
}

static float readLightIntensityPercent() {
  const int adc = readAdcAverage(LDR_PIN);
  return mapAdcToPercent(adc, LDR_ADC_DARK, LDR_ADC_BRIGHT);
}

// ---------------------------------------------------------------------------
// Sensors — rate-limited DHT, keep last good values on failure
// ---------------------------------------------------------------------------
static void readSensors() {
  const unsigned long now = millis();

  if (now - lastDhtReadMs >= DHT_MIN_INTERVAL_MS) {
    lastDhtReadMs = now;

    const float temp = dht.readTemperature();
    yield();
    const float hum = dht.readHumidity();
    yield();

    if (!isnan(temp)) {
      sensors.temperature = temp;
    }
    if (!isnan(hum)) {
      sensors.humidity = hum;
    }
  }

  sensors.soilMoisture = readSoilMoisturePercent();
  sensors.lightIntensity = readLightIntensityPercent();
}

static void updatePumpControl() {
  bool desiredOn = sensors.pumpStatus;

  switch (pumpOverride) {
    case OVERRIDE_FORCE_ON:
      desiredOn = true;
      break;
    case OVERRIDE_FORCE_OFF:
      desiredOn = false;
      break;
    case OVERRIDE_AUTO:
    default:
      if (sensors.soilMoisture < SOIL_PUMP_ON_THRESHOLD) {
        desiredOn = true;
      } else if (sensors.soilMoisture >= SOIL_PUMP_OFF_THRESHOLD) {
        desiredOn = false;
      }
      break;
  }

  setPump(desiredOn);
}

// ---------------------------------------------------------------------------
// LCD — skipped when display not detected
// ---------------------------------------------------------------------------
static void writeLcdLine(uint8_t row, const char *text, char *cachePrev) {
  if (!lcdAvailable || strcmp(text, cachePrev) == 0) {
    return;
  }

  if (!probeI2C(LCD_I2C_ADDR)) {
    lcdAvailable = false;
    Serial.println("LCD I2C lost — disabling display updates");
    return;
  }

  esp_task_wdt_reset();
  lcd.setCursor(0, row);
  lcd.print(text);
  const size_t len = strlen(text);
  for (size_t i = len; i < 16; i++) {
    lcd.print(' ');
    yield();
  }
  esp_task_wdt_reset();

  strncpy(cachePrev, text, 16);
  cachePrev[16] = '\0';
}

static void updateLcd() {
  if (!lcdAvailable) {
    return;
  }

  const unsigned long now = millis();
  if (now - lastLcdRefreshMs < LCD_REFRESH_INTERVAL_MS) {
    return;
  }
  lastLcdRefreshMs = now;

  if (!probeI2C(LCD_I2C_ADDR)) {
    lcdAvailable = false;
    Serial.println("LCD not responding — skipping refresh");
    return;
  }

  const float temp = isnan(sensors.temperature) ? 0.0f : sensors.temperature;
  const float hum = isnan(sensors.humidity) ? 0.0f : sensors.humidity;

  snprintf(lcdLine1, sizeof(lcdLine1), "L:%.0f%% T:%.1fC",
           sensors.lightIntensity, temp);
  snprintf(lcdLine2, sizeof(lcdLine2), "S:%.0f%% H:%.0f%%",
           sensors.soilMoisture, hum);

  if (sensors.pumpStatus) {
    memcpy(lcdLine2 + 12, "PUMP", 4);
    lcdLine2[16] = '\0';
  }

  writeLcdLine(0, lcdLine1, lcdLine1Prev);
  writeLcdLine(1, lcdLine2, lcdLine2Prev);
}

// ---------------------------------------------------------------------------
// Wi-Fi
// ---------------------------------------------------------------------------
static void connectWiFi(bool force) {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  const unsigned long now = millis();
  if (!force && (now - lastWifiAttemptMs) < WIFI_RETRY_INTERVAL_MS) {
    return;
  }
  lastWifiAttemptMs = now;

  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  for (uint8_t i = 0; i < 30; i++) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("WiFi connected, IP: ");
      Serial.println(WiFi.localIP());
      return;
    }
    delay(500);
    yield();
    Serial.print('.');
  }

  Serial.println();
  Serial.println("WiFi connection failed — will retry.");
}

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------
static void applyPumpOverrideFromResponse(const String &responseBody) {
  JsonDocument doc;
  const DeserializationError err = deserializeJson(doc, responseBody);
  if (err) {
    Serial.print("JSON parse error: ");
    Serial.println(err.c_str());
    return;
  }

  if (doc["pump_override"].isNull()) {
    pumpOverride = OVERRIDE_AUTO;
    Serial.println("Pump override from server: AUTO");
  } else {
    const bool forceOn = doc["pump_override"].as<bool>();
    pumpOverride = forceOn ? OVERRIDE_FORCE_ON : OVERRIDE_FORCE_OFF;
    Serial.print("Pump override from server: ");
    Serial.println(forceOn ? "ON" : "OFF");
  }

  updatePumpControl();
}

static void appendTelemetryFields(JsonDocument &doc) {
  const float temp = isnan(sensors.temperature) ? 0.0f : sensors.temperature;
  const float hum = isnan(sensors.humidity) ? 0.0f : sensors.humidity;

  doc["node_id"] = NODE_ID;
  doc["temperature"] = temp;
  doc["temp_c"] = temp;
  doc["humidity"] = hum;
  doc["soil_moisture"] = sensors.soilMoisture;
  doc["soil_pct"] = sensors.soilMoisture;
  doc["light_intensity"] = sensors.lightIntensity;
  doc["light_pct"] = sensors.lightIntensity;
  doc["pump_status"] = sensors.pumpStatus;
  doc["crop"] = CROP_NAME;
  doc["soil_on"] = SOIL_PUMP_ON_THRESHOLD;
  doc["soil_off"] = SOIL_PUMP_OFF_THRESHOLD;
}

static bool sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  JsonDocument doc;
  appendTelemetryFields(doc);

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.setTimeout(5000);
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  Serial.print("POST ");
  Serial.print(SERVER_URL);
  Serial.print(" -> ");
  Serial.println(payload);

  const int httpCode = http.POST(payload);
  String response = http.getString();
  http.end();
  yield();

  if (httpCode > 0) {
    Serial.print("HTTP ");
    Serial.print(httpCode);
    Serial.print(" response: ");
    Serial.println(response);

    if (httpCode >= 200 && httpCode < 300) {
      applyPumpOverrideFromResponse(response);
      return true;
    }
  } else {
    Serial.print("HTTP POST failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  return false;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("RootWise node — HTTP REST telemetry");
#if defined(BOARD_ESP32S3)
  Serial.println("Board profile: ESP32-S3");
#else
  Serial.println("Board profile: ESP32");
#endif
  Serial.printf("Pins: DHT=%d soil=%d ldr=%d relay=%d i2c=%d/%d\n",
                DHT_PIN, SOIL_MOISTURE_PIN, LDR_PIN, RELAY_PIN, I2C_SDA, I2C_SCL);

  pinMode(RELAY_PIN, OUTPUT);
  setPump(false);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setTimeOut(50);
  lcdAvailable = initLcdIfPresent();

  dht.begin();
  connectWiFi(true);

  if (lcdAvailable) {
    lcd.clear();
    memset(lcdLine1Prev, 0xFF, sizeof(lcdLine1Prev));
    memset(lcdLine2Prev, 0xFF, sizeof(lcdLine2Prev));
  }

  lastTelemetryMs = millis() - TELEMETRY_INTERVAL_MS;
}

void loop() {
  esp_task_wdt_reset();
  connectWiFi(false);

  const unsigned long now = millis();
  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = now;
    readSensors();
    updatePumpControl();
    sendTelemetry();
  }

  // Runtime LCD refresh disabled — I2C writes can stall the ESP32-S3 WDT on this bus.
  // Splash screen still shown during setup when the display is detected.
  // updateLcd();
  yield();
}
