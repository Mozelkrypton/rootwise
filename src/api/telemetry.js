export function mapTelemetryFromApi(data) {
  const temperature = data.temperature ?? data.temp_c;
  const soilMoisture = data.soil_moisture ?? data.soil_pct;
  const lightIntensity = data.light_intensity ?? data.light_pct;

  return {
    nodeId: data.node_id,
    temperature,
    tempC: temperature,
    humidity: data.humidity,
    soilMoisture,
    soilPct: soilMoisture,
    lightIntensity,
    lightPct: lightIntensity,
    pumpStatus: data.pump_status,
    crop: data.crop ?? "maize",
    soilOn: data.soil_on ?? 35,
    soilOff: data.soil_off ?? 60,
    isOnline: data.is_online,
    lastHeartbeat: data.last_heartbeat,
    pumpOverride: data.pump_override ?? null,
  };
}

export async function fetchLatestTelemetry() {
  const res = await fetch("/api/telemetry/latest");
  if (!res.ok) {
    const err = new Error(`Failed to fetch telemetry (${res.status})`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return mapTelemetryFromApi(data);
}

export async function fetchTelemetryHistory() {
  const res = await fetch("/api/telemetry/history");
  if (!res.ok) {
    const err = new Error(`Failed to fetch history (${res.status})`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return data.readings.map((r) => ({
    timestamp: r.timestamp,
    soilMoisture: r.soil_moisture ?? r.soil_pct,
    temperature: r.temperature ?? r.temp_c,
    humidity: r.humidity,
    lightIntensity: r.light_intensity ?? r.light_pct,
    pumpStatus: r.pump_status,
    crop: r.crop,
    soilOn: r.soil_on,
    soilOff: r.soil_off,
  }));
}

export async function setPumpOverride(override) {
  const res = await fetch("/api/actuators/pump", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ override }),
  });
  if (!res.ok) {
    const err = new Error(`Failed to set pump override (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
