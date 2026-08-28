import React, { useEffect, useMemo, useState } from "react";
import { fetchTelemetryHistory } from "../api/telemetry.js";
import { genTrend } from "../data/mock.js";

export default function TrendChart() {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchTelemetryHistory()
      .then((readings) => {
        if (!cancelled && readings.length > 1) {
          setHistory(readings.map((r) => r.soilMoisture));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const data = useMemo(() => {
    if (history && history.length > 1) return history;
    return genTrend();
  }, [history]);

  const W = 900, H = 220, pad = 30;
  const max = 80, min = 15;

  const threshY = pad + (1 - (40 - min) / (max - min)) * (H - pad * 2);
  const stepX = (W - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / (max - min)) * (H - pad * 2);
    return [x, y];
  });
  const linePath = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const areaPath = linePath + ` L ${pts[pts.length - 1][0]} ${H - pad} L ${pts[0][0]} ${H - pad} Z`;
  const last = pts[pts.length - 1];
  const labelCount = Math.min(7, data.length);
  const labels = Array.from({ length: labelCount }, (_, i) => {
    if (history) {
      const idx = Math.round((i / (labelCount - 1)) * (data.length - 1));
      return `T-${data.length - 1 - idx}`;
    }
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend-svg">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4FA3C4" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4FA3C4" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((f) => {
        const y = pad + f * (H - pad * 2);
        return <line key={f} x1={pad} y1={y} x2={W - pad} y2={y} stroke="#2F251B" strokeWidth={1} />;
      })}

      <line x1={pad} y1={threshY} x2={W - pad} y2={threshY} stroke="#D9924A" strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
      <text x={W - pad} y={threshY - 6} fill="#D9924A" fontFamily="IBM Plex Mono" fontSize="10" textAnchor="end">
        dry threshold (40%)
      </text>

      <path d={areaPath} fill="url(#trendGrad)" stroke="none" />
      <path d={linePath} fill="none" stroke="#4FA3C4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={4} fill="#4FA3C4" />
      <circle cx={last[0]} cy={last[1]} r={8} fill="#4FA3C4" opacity={0.2} />

      {labels.map((d, i) => {
        const x = pad + (i / (labels.length - 1)) * (W - pad * 2);
        return (
          <text key={d + i} x={x} y={H - 8} fill="#6E6353" fontFamily="IBM Plex Mono" fontSize="10" textAnchor="middle">
            {d}
          </text>
        );
      })}
    </svg>
  );
}
