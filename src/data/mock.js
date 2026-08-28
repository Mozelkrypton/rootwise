// Replace these with real API calls once the FastAPI backend is live:
//   GET /api/readings  -> nodeTelemetry, depthSensors
//   GET /api/predict   -> recommendation
//   Open-Meteo         -> weather

export const THRESHOLDS = {
  soilMoisture: { optimalMin: 40, optimalMax: 70 },
  temperature: { normalMin: 18, normalMax: 32 },
  lightIntensity: { normalMin: 30, normalMax: 90 },
};

/** ESP32 node telemetry — single hardware node readings */
export const nodeTelemetry = {
  temperature: 24.6,
  humidity: 48,
  soilMoisture: 54,
  lightIntensity: 72,
  pumpStatus: false,
  pumpOverride: null,
  isOnline: true,
  lastHeartbeat: new Date(Date.now() - 12_000).toISOString(),
};

export function getSoilMoistureStatus(pct) {
  if (pct < THRESHOLDS.soilMoisture.optimalMin) {
    return { level: "critical", label: "Dry" };
  }
  if (pct > THRESHOLDS.soilMoisture.optimalMax) {
    return { level: "warning", label: "Saturated" };
  }
  return { level: "optimal", label: "Optimal" };
}

export function getTemperatureStatus(celsius) {
  const { normalMin, normalMax } = THRESHOLDS.temperature;
  if (celsius < normalMin || celsius > normalMax) {
    return { level: "warning", label: "Alert" };
  }
  return { level: "optimal", label: "Normal" };
}

export function getLightIntensityStatus(pct) {
  const { normalMin, normalMax } = THRESHOLDS.lightIntensity;
  if (pct < normalMin) {
    return { level: "warning", label: "Low light" };
  }
  if (pct > normalMax) {
    return { level: "warning", label: "High light" };
  }
  return { level: "optimal", label: "Normal" };
}

export function moistureColor(pct) {
  const { level } = getSoilMoistureStatus(pct);
  if (level === "optimal") return "var(--health)";
  if (level === "warning") return "var(--water)";
  return "var(--critical)";
}

export function formatHeartbeat(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export const depthSensors = [
  { label: "10 cm", node: "ESP32 Node", moisture: 58 },
  { label: "25 cm", node: "ESP32 Node", moisture: 54 },
  { label: "40 cm", node: "ESP32 Node", moisture: 49 },
];

export const weather = [
  { day: "Today", icon: "☀️", temp: "29° / 18°", rain: "4%" },
  { day: "Tomorrow", icon: "🌤️", temp: "28° / 17°", rain: "6%" },
  { day: "Thu", icon: "⛅", temp: "26° / 17°", rain: "22%" },
  { day: "Fri", icon: "🌦️", temp: "24° / 16°", rain: "58%" },
  { day: "Sat", icon: "🌧️", temp: "22° / 15°", rain: "74%" },
];

export const recommendation = {
  window: "Tomorrow, 05:30–06:15",
  confidence: 91,
  reason:
    "Root-zone moisture will fall below the 40% threshold overnight. Forecast shows no rain in the next 48 hours, so a short irrigation cycle is recommended before sunrise heat sets in.",
  waterUse: "1,240 L",
  waterSaved: "18%",
  rainProbability: "6%",
};

export function genTrend() {
  const points = [];
  let v = 58;
  for (let i = 0; i < 42; i++) {
    v += (Math.random() - 0.58) * 4;
    v = Math.max(22, Math.min(78, v));
    points.push(v);
  }
  return points;
}
