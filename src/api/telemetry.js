export function mapTelemetryFromApi(data) {
  return {
    nodeId: data.node_id,
    temperature: data.temperature,
    humidity: data.humidity,
    soilMoisture: data.soil_moisture,
    lightIntensity: data.light_intensity,
    pumpStatus: data.pump_status,
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
    soilMoisture: r.soil_moisture,
    temperature: r.temperature,
    humidity: r.humidity,
    lightIntensity: r.light_intensity,
    pumpStatus: r.pump_status,
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
