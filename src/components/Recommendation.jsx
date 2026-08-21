import React, { useState } from "react";
import { recommendation } from "../data/mock.js";

export default function Recommendation() {
  const [justTriggered, setJustTriggered] = useState(false);

  function handleOverride() {
    setJustTriggered(true);
    setTimeout(() => setJustTriggered(false), 2200);
  }

  return (
    <>
      <div className="recommend-headline">
        <span className="recommend-label">Next irrigation window</span>
        <span className="recommend-value">{recommendation.window}</span>
      </div>
      <p className="recommend-reason">{recommendation.reason}</p>
      <div className="recommend-meta">
        <div className="meta-item">
          <span className="meta-label">Est. water use</span>
          <span className="meta-value">{recommendation.waterUse}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Water saved this week</span>
          <span className="meta-value meta-value--good">{recommendation.waterSaved}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Rain probability, 48h</span>
          <span className="meta-value">{recommendation.rainProbability}</span>
        </div>
      </div>
      <button
        className="btn-primary"
        onClick={handleOverride}
        style={justTriggered ? { background: "var(--health)" } : undefined}
      >
        {justTriggered ? "Irrigation started ✓" : "Override & irrigate now"}
      </button>
    </>
  );
}
