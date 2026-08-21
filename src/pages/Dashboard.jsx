import React, { useEffect, useState } from "react";
import SoilProfile from "../components/SoilProfile.jsx";
import TrendChart from "../components/TrendChart.jsx";
import Recommendation from "../components/Recommendation.jsx";
import { Weather, SensorCards } from "../components/Weather.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [clock, setClock] = useState("");

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
            {/* Once the backend exists, replace this with the user's actual
                field(s) fetched from GET /api/fields (scoped by their auth token) */}
            <span className="field-name">North Plot — Maize</span>
            <span className="field-sub">0.8 ha · 3 nodes online</span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="status-pill status-pill--ok">
            <span className="status-dot"></span>
            All sensors reporting
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
            <h2>7-day moisture trend</h2>
            <span className="panel-sub">Root zone (25 cm), sensor node 02</span>
          </div>
          <TrendChart />
        </section>

        <section className="panel panel--sensors">
          <div className="panel-head">
            <h2>Live readings</h2>
            <span className="panel-sub">Updated just now</span>
          </div>
          <SensorCards />
        </section>
      </main>

      <footer className="foot">
        <span>
          Mock data · wire to <code>/api/readings</code> and <code>/api/predict</code> when the backend is live
        </span>
      </footer>
    </div>
  );
}
