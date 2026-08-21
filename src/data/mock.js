// Replace these with real API calls once the FastAPI backend is live:
//   GET /api/readings  -> depthSensors, sensorReadings
//   GET /api/predict   -> recommendation
//   Open-Meteo         -> weather

export const depthSensors = [
  { label: "10 cm", node: "Node 01", moisture: 71 },
  { label: "25 cm", node: "Node 02", moisture: 38 },
  { label: "40 cm", node: "Node 03", moisture: 54 },
];

export const sensorReadings = [
  { label: "Soil moisture (avg)", value: "54%", node: "3 nodes" },
  { label: "Soil temperature", value: "23.4°C", node: "Node 02" },
  { label: "Ambient temperature", value: "27.1°C", node: "Weather node" },
  { label: "Ambient humidity", value: "48%", node: "Weather node" },
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
    "Root-zone moisture will fall below the 32% threshold overnight. Forecast shows no rain in the next 48 hours, so a short irrigation cycle is recommended before sunrise heat sets in.",
  waterUse: "1,240 L",
  waterSaved: "18%",
  rainProbability: "6%",
};

export function genTrend() {
  const points = [];
  let v = 62;
  for (let i = 0; i < 42; i++) {
    v += (Math.random() - 0.58) * 4;
    v = Math.max(22, Math.min(78, v));
    points.push(v);
  }
  return points;
}

export function moistureColor(pct) {
  if (pct >= 60) return "var(--water)";
  if (pct >= 32) return "var(--health)";
  return "var(--alert)";
}
