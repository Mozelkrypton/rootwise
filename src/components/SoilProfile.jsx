import React from "react";
import { depthSensors, moistureColor } from "../data/mock.js";

export default function SoilProfile() {
  const W = 320, H = 380;
  const groundY = 40;
  const soilBottom = 360;
  const rowH = (soilBottom - groundY) / depthSensors.length;
  const plantX = W / 2;

  return (
    <div className="profile-body">
      <svg viewBox={`0 0 ${W} ${H}`} className="soil-svg">
        <defs>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2C2116" />
            <stop offset="100%" stopColor="#1A130D" />
          </linearGradient>
        </defs>

        <line x1={10} y1={groundY} x2={W - 10} y2={groundY} stroke="#4A3A2A" strokeWidth={2} />
        <rect x={10} y={groundY} width={W - 20} height={soilBottom - groundY} fill="url(#soilGrad)" rx={4} />

        <line x1={plantX} y1={groundY} x2={plantX} y2={groundY - 22} stroke="#8CB369" strokeWidth={2} strokeLinecap="round" />
        {[-1, 1].map((dir) => (
          <path
            key={dir}
            d={`M ${plantX} ${groundY - 14} Q ${plantX + dir * 16} ${groundY - 20} ${plantX + dir * 10} ${groundY - 6}`}
            stroke="#8CB369"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />
        ))}

        {depthSensors.map((s, i) => {
          const y0 = groundY + i * rowH;
          const midY = y0 + rowH / 2;
          const bandH = rowH - 10;
          const fillH = (s.moisture / 100) * bandH;
          const barX = 26, barW = W - 26 - 100;
          const color = moistureColor(s.moisture);

          return (
            <g key={s.label}>
              {i > 0 && (
                <line x1={10} y1={y0} x2={W - 10} y2={y0} stroke="#3A2E22" strokeWidth={1} strokeDasharray="3 4" />
              )}
              <rect
                x={barX}
                y={y0 + (bandH - fillH) + 5}
                width={barW}
                height={fillH}
                fill={color}
                opacity={0.85}
                rx={3}
              />
              <rect x={barX} y={y0 + 5} width={barW} height={bandH} fill="none" stroke="#3A2E22" strokeWidth={1} rx={3} />
              <circle cx={barX + barW + 14} cy={midY} r={4} fill={color} />
              <text x={barX + barW + 24} y={midY - 5} fill="var(--text-primary)" fontFamily="IBM Plex Mono" fontSize="12" fontWeight="600">
                {s.moisture}%
              </text>
              <text x={barX + barW + 24} y={midY + 10} fill="#9C8E7A" fontFamily="IBM Plex Mono" fontSize="9.5">
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>

      <ul className="profile-legend">
        <li><span className="swatch swatch--ok"></span>Optimal (40–70%)</li>
        <li><span className="swatch swatch--wet"></span>Saturated (&gt;70%)</li>
        <li><span className="swatch swatch--low"></span>Dry (&lt;40%)</li>
      </ul>
    </div>
  );
}
