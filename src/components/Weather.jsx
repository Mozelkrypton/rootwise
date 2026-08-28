import React from "react";
import { weather } from "../data/mock.js";

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
