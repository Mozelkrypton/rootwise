import React, { useCallback, useEffect, useState } from "react";
import SoilProfile from "../components/SoilProfile.jsx";
import TrendChart from "../components/TrendChart.jsx";
import Recommendation from "../components/Recommendation.jsx";
import { Weather } from "../components/Weather.jsx";
import SensorMetrics from "../components/SensorMetrics.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchLatestTelemetry, setPumpOverride } from "../api/telemetry.js";
import { formatHeartbeat, nodeTelemetry } from "../data/mock.js";

const POLL_INTERVAL_MS = 3000;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [clock, setClock] = useState("");
  const [telemetry, setTelemetry] = useState(nodeTelemetry);
  const [usingLiveData, setUsingLiveData] = useState(false);

  const manualOverride = telemetry.pumpOverride !== null && telemetry.pumpOverride !== undefined;
  const pumpActive = manualOverride ? Boolean(telemetry.pumpOverride) : telemetry.pumpStatus;

  const refreshTelemetry = useCallback(async () => {
    try {
      const latest = await fetchLatestTelemetry();
      setTelemetry(latest);
      setUsingLiveData(true);
    } catch (err) {
      if (err.status !== 404) {
        console.warn("Telemetry fetch failed, using mock data:", err.message);
      }
      setUsingLiveData(false);
    }
  }, []);

  const handleToggleOverride = useCallback(async () => {
    const nextOverride = manualOverride ? null : true;
    try {
      await setPumpOverride(nextOverride);
      setTelemetry((prev) => ({ ...prev, pumpOverride: nextOverride }));
    } catch (err) {
      console.error("Failed to set pump override:", err.message);
    }
  }, [manualOverride]);

  useEffect(() => {
    refreshTelemetry();
    const id = setInterval(refreshTelemetry, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshTelemetry]);

  useEffect(() => {
    function tick() {
      setClock(
        new Date().toLocaleString(undefined, {
          weekday: "short",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const statusClass = telemetry.isOnline
    ? "status-pill status-pill--ok"
    : "status-pill status-pill--offline";

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <div className="brand">
            <svg className="brand-mark" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 4C16 4 8 12 8 19C8 23.4183 11.5817 27 16 27C20.4183 27 24 23.4183 24 19C24 12 16 4 16 4Z" stroke="currentColor" strokeWidth="2" />
              <path d="M16 27V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="brand-name">RootWise</span>
          </div>
          <div className="field-picker">
            <span className="field-name">North Plot — Maize</span>
            <span className="field-sub">
              0.8 ha · ESP32 node {telemetry.isOnline ? "online" : "offline"}
            </span>
          </div>
        </div>
        <div className="topbar-right">
          <div className={statusClass}>
            <span className="status-dot"></span>
            {telemetry.isOnline
              ? `Node reporting · ${formatHeartbeat(telemetry.lastHeartbeat)}`
              : "Node offline"}
          </div>
          <div className="clock">{clock}</div>
          <div className="user-menu">
            <span className="user-name">{user?.name}</span>
            <button className="btn-ghost" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>

      <main className="grid">
        <section className="panel panel--profile">
          <div className="panel-head">
            <h2>Soil profile</h2>
            <span className="panel-sub">Moisture by depth</span>
          </div>
          <SoilProfile />
        </section>

        <section className="panel panel--recommend">
          <div className="panel-head">
            <h2>Irrigation recommendation</h2>
            <span className="panel-sub">Model confidence 91%</span>
          </div>
          <Recommendation />
        </section>

        <section className="panel panel--weather">
          <div className="panel-head">
            <h2>Forecast</h2>
            <span className="panel-sub">Open-Meteo</span>
          </div>
          <Weather />
        </section>

        <section className="panel panel--trend">
          <div className="panel-head">
            <h2>Moisture trend</h2>
            <span className="panel-sub">Soil moisture history · ESP32 node</span>
          </div>
          <TrendChart />
        </section>

        <section className="panel panel--sensors">
          <div className="panel-head">
            <h2>Live readings</h2>
            <span className="panel-sub">
              {usingLiveData
                ? telemetry.isOnline
                  ? `Heartbeat ${formatHeartbeat(telemetry.lastHeartbeat)}`
                  : "Last known values"
                : "Mock data · awaiting backend"}
            </span>
          </div>
          <SensorMetrics
            telemetry={telemetry}
            pumpActive={pumpActive}
            manualOverride={manualOverride}
            onToggleOverride={handleToggleOverride}
          />
        </section>
      </main>

      <footer className="foot">
        <span>
          {usingLiveData ? (
            <>Live telemetry via <code>/api/telemetry</code></>
          ) : (
            <>Mock data · start backend on <code>:8000</code> to ingest ESP32 readings</>
          )}
        </span>
      </footer>
    </div>
  );
}
