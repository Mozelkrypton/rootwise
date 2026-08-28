/**
 * RootWise ESP32 Node Firmware
 *
 * Reads DHT22, soil moisture, and LDR sensors; controls irrigation relay;
 * displays live readings on a 16x2 I2C LCD; posts telemetry to the FastAPI backend.
 */

#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <ArduinoJson.h>

// ---------------------------------------------------------------------------
// Network configuration — edit before flashing
// ---------------------------------------------------------------------------
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"
#define SERVER_URL "http://192.168.1.100:8000/api/telemetry"
#define NODE_ID "esp32-node-01"

// ---------------------------------------------------------------------------
// Pin mapping
// ---------------------------------------------------------------------------
#define DHT_PIN 4
#define SOIL_MOISTURE_PIN 34
#define LDR_PIN 35
#define RELAY_PIN 26
#define I2C_SDA 21
#define I2C_SCL 22
#define LCD_I2C_ADDR 0x27

// Relay modules are often active-LOW; set HIGH if your module is active-HIGH.
#define RELAY_ACTIVE LOW

// ---------------------------------------------------------------------------
// Timing
// ---------------------------------------------------------------------------
static const unsigned long TELEMETRY_INTERVAL_MS = 3000;
static const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;
static const unsigned long LCD_REFRESH_INTERVAL_MS = 500;

// ---------------------------------------------------------------------------
// Automation thresholds (%)
// ---------------------------------------------------------------------------
static const float SOIL_PUMP_ON_THRESHOLD = 35.0f;
static const float SOIL_PUMP_OFF_THRESHOLD = 60.0f;

// ---------------------------------------------------------------------------
// ADC calibration — tune these on your bench
// ---------------------------------------------------------------------------
// Capacitive soil probe: dry soil reads higher ADC, wet soil reads lower ADC.
static const int SOIL_ADC_DRY = 4095;
static const int SOIL_ADC_WET = 1500;

// LDR divider: dark = low ADC, bright = high ADC (adjust for your wiring).
static const int LDR_ADC_DARK = 400;
static const int LDR_ADC_BRIGHT = 3600;

// ---------------------------------------------------------------------------
// Hardware objects
// ---------------------------------------------------------------------------
DHT dht(DHT_PIN, DHT22);
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, 16, 2);

// ---------------------------------------------------------------------------
// Sensor / control state
// ---------------------------------------------------------------------------
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

char lcdLine1[17] = "";
char lcdLine2[17] = "";
char lcdLine1Prev[17] = "";
char lcdLine2Prev[17] = "";

// ---------------------------------------------------------------------------
// Relay helpers
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

// ---------------------------------------------------------------------------
// ADC helpers
// ---------------------------------------------------------------------------
static int readAdcAverage(uint8_t pin, uint8_t samples = 8) {
  long total = 0;
  for (uint8_t i = 0; i < samples; i++) {
    total += analogRead(pin);
    delay(2);
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
  // Invert mapping: high ADC = dry (0%), low ADC = wet (100%).
  return 100.0f - mapAdcToPercent(adc, SOIL_ADC_WET, SOIL_ADC_DRY);
}

static float readLightIntensityPercent() {
  const int adc = readAdcAverage(LDR_PIN);
  return mapAdcToPercent(adc, LDR_ADC_DARK, LDR_ADC_BRIGHT);
}

// ---------------------------------------------------------------------------
// Sensor reads
// ---------------------------------------------------------------------------
static void readSensors() {
  const float temp = dht.readTemperature();
  const float hum = dht.readHumidity();

  if (!isnan(temp)) {
    sensors.temperature = temp;
  }
  if (!isnan(hum)) {
    sensors.humidity = hum;
  }

  sensors.soilMoisture = readSoilMoisturePercent();
  sensors.lightIntensity = readLightIntensityPercent();
}

// ---------------------------------------------------------------------------
// Pump control
// ---------------------------------------------------------------------------
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
      // Between thresholds: keep previous state (hysteresis).
      break;
  }

  setPump(desiredOn);
}

// ---------------------------------------------------------------------------
// LCD — update only changed lines to avoid flicker
// ---------------------------------------------------------------------------
static void writeLcdLine(uint8_t row, const char *text, char *cachePrev) {
  if (strcmp(text, cachePrev) == 0) {
    return;
  }

  lcd.setCursor(0, row);
  lcd.print(text);
  const size_t len = strlen(text);
  for (size_t i = len; i < 16; i++) {
    lcd.print(' ');
  }

  strncpy(cachePrev, text, 16);
  cachePrev[16] = '\0';
}

static void updateLcd() {
  const unsigned long now = millis();
  if (now - lastLcdRefreshMs < LCD_REFRESH_INTERVAL_MS) {
    return;
  }
  lastLcdRefreshMs = now;

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

  const uint8_t attempts = 30;
  for (uint8_t i = 0; i < attempts; i++) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("WiFi connected, IP: ");
      Serial.println(WiFi.localIP());
      return;
    }
    delay(500);
    Serial.print('.');
  }

  Serial.println();
  Serial.println("WiFi connection failed — will retry.");
}

// ---------------------------------------------------------------------------
// Backend response parsing
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

// ---------------------------------------------------------------------------
// Telemetry upload
// ---------------------------------------------------------------------------
static bool sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  JsonDocument doc;
  doc["node_id"] = NODE_ID;
  doc["temperature"] = isnan(sensors.temperature) ? 0.0f : sensors.temperature;
  doc["humidity"] = isnan(sensors.humidity) ? 0.0f : sensors.humidity;
  doc["soil_moisture"] = sensors.soilMoisture;
  doc["light_intensity"] = sensors.lightIntensity;
  doc["pump_status"] = sensors.pumpStatus;

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

// ---------------------------------------------------------------------------
// Arduino entry points
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(RELAY_PIN, OUTPUT);
  setPump(false);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.print("RootWise ESP32");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");

  dht.begin();

  connectWiFi(true);

  lcd.clear();
  memset(lcdLine1Prev, 0xFF, sizeof(lcdLine1Prev));
  memset(lcdLine2Prev, 0xFF, sizeof(lcdLine2Prev));

  lastTelemetryMs = millis() - TELEMETRY_INTERVAL_MS;
}

void loop() {
  connectWiFi(false);

  const unsigned long now = millis();
  if (now - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = now;

    readSensors();
    updatePumpControl();
    sendTelemetry();
  }

  updateLcd();
}
