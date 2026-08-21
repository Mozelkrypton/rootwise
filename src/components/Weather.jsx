import React from "react";
import { weather, sensorReadings } from "../data/mock.js";

export function Weather() {
  return (
    <div className="weather-strip">
      {weather.map((w) => (
        <div className="weather-day" key={w.day}>
          <span className="weather-day-name">{w.day}</span>
          <span className="weather-day-icon">{w.icon}</span>
          <span className="weather-day-temp">{w.temp}</span>
          <span className="weather-day-rain">{w.rain}</span>
        </div>
      ))}
    </div>
  );
}

export function SensorCards() {
  return (
    <div className="sensor-cards">
      {sensorReadings.map((s) => (
        <div className="sensor-card" key={s.label}>
          <span className="sensor-card-label">{s.label}</span>
          <span className="sensor-card-value">{s.value}</span>
          <span className="sensor-card-node">{s.node}</span>
        </div>
      ))}
    </div>
  );
}
