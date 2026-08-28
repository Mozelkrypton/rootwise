#pragma once

/**
 * Board pin map — select with PlatformIO env:
 *   esp32dev  -> classic ESP32 (default)
 *   esp32s3   -> ESP32-S3 dev module
 */

#if defined(BOARD_ESP32S3)

#define DHT_PIN 4
#define SOIL_MOISTURE_PIN 1
#define LDR_PIN 2
#define RELAY_PIN 5
#define I2C_SDA 8
#define I2C_SCL 9

#else

// Classic ESP32 (ADC1: GPIO 32-39; 34/35 are input-only)
#define DHT_PIN 4
#define SOIL_MOISTURE_PIN 34
#define LDR_PIN 35
#define RELAY_PIN 26
#define I2C_SDA 21
#define I2C_SCL 22

#endif

#define LCD_I2C_ADDR 0x27
#define RELAY_ACTIVE LOW
