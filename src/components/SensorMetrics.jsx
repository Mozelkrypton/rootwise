import React from "react";
import {
  getLightIntensityStatus,
  getSoilMoistureStatus,
  getTemperatureStatus,
  THRESHOLDS,
} from "../data/mock.js";

const STATUS_STYLES = {
  optimal: {
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-400",
    dot: "bg-emerald-400",
    value: "text-emerald-50",
  },
  warning: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    badge: "bg-amber-500/20 text-amber-400",
    dot: "bg-amber-400",
    value: "text-amber-50",
  },
  critical: {
    border: "border-red-500/40",
    bg: "bg-red-500/10",
    badge: "bg-red-500/20 text-red-400",
    dot: "bg-red-400",
    value: "text-red-50",
  },
};

function MetricCard({ title, subtitle, status, children, className = "" }) {
  const styles = STATUS_STYLES[status.level];
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-4 sm:p-5 ${styles.border} ${styles.bg} ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-stone-100">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-stone-500">
              {subtitle}
            </p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-medium uppercase tracking-wide ${styles.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
          {status.label}
        </span>
      </div>
      {children}
    </div>
  );
}

function SoilMoistureCard({ soilMoisture, pumpActive }) {
  const status = getSoilMoistureStatus(soilMoisture);
  const needsWater = soilMoisture < THRESHOLDS.soilMoisture.optimalMin;
  const styles = STATUS_STYLES[status.level];

  return (
    <MetricCard
      title="Soil Moisture"
      subtitle="Capacitive sensor · primary"
      status={status}
      className="sm:col-span-2 lg:col-span-1"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className={`font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums ${styles.value}`}>
            {soilMoisture}
            <span className="text-2xl font-semibold text-stone-400">%</span>
          </p>
          <p className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-stone-500">
            Optimal range {THRESHOLDS.soilMoisture.optimalMin}–{THRESHOLDS.soilMoisture.optimalMax}%
          </p>
        </div>
        <div
          className={`flex flex-col items-end gap-1 rounded-lg border px-3 py-2 ${
            needsWater || pumpActive
              ? "border-amber-500/50 bg-amber-500/15"
              : "border-stone-700/60 bg-stone-900/40"
          }`}
        >
          <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-widest text-stone-500">
            Watering
          </span>
          <span
            className={`font-[family-name:var(--font-mono)] text-xs font-semibold ${
              pumpActive ? "text-sky-400" : needsWater ? "text-amber-400" : "text-stone-400"
            }`}
          >
            {pumpActive ? "ACTIVE" : needsWater ? "TRIGGER" : "STANDBY"}
          </span>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status.level === "optimal"
              ? "bg-emerald-500"
              : status.level === "warning"
                ? "bg-sky-500"
                : "bg-red-500"
          }`}
          style={{ width: `${Math.min(100, soilMoisture)}%` }}
        />
      </div>
    </MetricCard>
  );
}

function AmbientCard({ temperature, humidity }) {
  const tempStatus = getTemperatureStatus(temperature);
  const styles = STATUS_STYLES[tempStatus.level];

  return (
    <MetricCard title="Ambient Conditions" subtitle="DHT22 sensor" status={tempStatus}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-stone-500">
            Temperature
          </p>
          <p className={`font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums ${styles.value}`}>
            {temperature.toFixed(1)}
            <span className="text-lg text-stone-400">°C</span>
          </p>
        </div>
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-stone-500">
            Humidity
          </p>
          <p className="font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-stone-100">
            {humidity}
            <span className="text-lg text-stone-400">%</span>
          </p>
        </div>
      </div>
      <p className="font-[family-name:var(--font-mono)] text-[10px] text-stone-500">
        Normal {THRESHOLDS.temperature.normalMin}–{THRESHOLDS.temperature.normalMax}°C
      </p>
    </MetricCard>
  );
}

function LightCard({ lightIntensity }) {
  const status = getLightIntensityStatus(lightIntensity);
  const styles = STATUS_STYLES[status.level];

  return (
    <MetricCard title="Light Intensity" subtitle="LDR sensor" status={status}>
      <p className={`font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums ${styles.value}`}>
        {lightIntensity}
        <span className="text-2xl font-semibold text-stone-400">%</span>
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-stone-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status.level === "optimal" ? "bg-emerald-500" : "bg-amber-500"
          }`}
          style={{ width: `${Math.min(100, lightIntensity)}%` }}
        />
      </div>
      <p className="font-[family-name:var(--font-mono)] text-[10px] text-stone-500">
        Daytime normal {THRESHOLDS.lightIntensity.normalMin}–{THRESHOLDS.lightIntensity.normalMax}%
      </p>
    </MetricCard>
  );
}

function PumpCard({ pumpActive, manualOverride, onToggleOverride }) {
  const status = pumpActive
    ? { level: "warning", label: "Active" }
    : { level: "optimal", label: "Idle" };

  return (
    <MetricCard title="Pump & Relay" subtitle="GPIO relay output" status={status}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 ${
              pumpActive
                ? "border-sky-500/60 bg-sky-500/20 text-sky-300"
                : "border-stone-600/50 bg-stone-800/60 text-stone-500"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" strokeLinecap="round" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
          <div>
            <p
              className={`font-[family-name:var(--font-display)] text-xl font-bold ${
                pumpActive ? "text-sky-300" : "text-stone-300"
              }`}
            >
              {pumpActive ? "ACTIVE" : "IDLE"}
            </p>
            <p className="font-[family-name:var(--font-mono)] text-[10px] text-stone-500">
              {manualOverride ? "Manual override" : "Auto mode"}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={manualOverride}
          onClick={onToggleOverride}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
            manualOverride ? "bg-amber-500" : "bg-stone-600"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              manualOverride ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      <p className="font-[family-name:var(--font-mono)] text-[10px] text-stone-500">
        {manualOverride ? "Manual override — pump forced on" : "Toggle to force pump on manually"}
      </p>
    </MetricCard>
  );
}

export default function SensorMetrics({
  telemetry,
  pumpActive,
  manualOverride,
  onToggleOverride,
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SoilMoistureCard soilMoisture={telemetry.soilMoisture} pumpActive={pumpActive} />
      <AmbientCard temperature={telemetry.temperature} humidity={telemetry.humidity} />
      <LightCard lightIntensity={telemetry.lightIntensity} />
      <PumpCard
        pumpActive={pumpActive}
        manualOverride={manualOverride}
        onToggleOverride={onToggleOverride}
      />
    </div>
  );
}
