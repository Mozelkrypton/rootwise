from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from models import (
    HistoryEntry,
    LatestTelemetryResponse,
    PumpOverrideRequest,
    PumpOverrideResponse,
    TelemetryCommandResponse,
    TelemetryHistoryResponse,
    TelemetryIngest,
)
from store import TelemetryReading, store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("rootwise.telemetry")

app = FastAPI(title="RootWise Telemetry", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = exc.errors()
    logger.warning("Validation error on %s: %s", request.url.path, errors)
    return JSONResponse(
        status_code=422,
        content={"status": "error", "detail": errors},
    )


def _reading_to_history_entry(reading: TelemetryReading) -> HistoryEntry:
    return HistoryEntry(
        node_id=reading.node_id,
        temperature=reading.temperature,
        humidity=reading.humidity,
        soil_moisture=reading.soil_moisture,
        light_intensity=reading.light_intensity,
        pump_status=reading.pump_status,
        timestamp=reading.timestamp.isoformat(),
    )


@app.post("/api/telemetry", response_model=TelemetryCommandResponse)
async def ingest_telemetry(payload: TelemetryIngest) -> TelemetryCommandResponse:
    reading = TelemetryReading(
        node_id=payload.node_id,
        temperature=payload.temperature,
        humidity=payload.humidity,
        soil_moisture=payload.soil_moisture,
        light_intensity=payload.light_intensity,
        pump_status=payload.pump_status,
        timestamp=datetime.now(timezone.utc),
    )
    store.ingest(reading)
    logger.info(
        "Telemetry from %s: temp=%.1f°C humidity=%.1f%% soil=%.1f%% light=%.1f%% pump=%s",
        reading.node_id,
        reading.temperature,
        reading.humidity,
        reading.soil_moisture,
        reading.light_intensity,
        reading.pump_status,
    )
    return TelemetryCommandResponse(status="ok", pump_override=store.pump_override)


@app.get("/api/telemetry/latest", response_model=LatestTelemetryResponse)
async def get_latest_telemetry() -> LatestTelemetryResponse:
    latest = store.latest()
    if latest is None:
        raise HTTPException(status_code=404, detail="No telemetry received yet")

    return LatestTelemetryResponse(
        node_id=latest.node_id,
        temperature=latest.temperature,
        humidity=latest.humidity,
        soil_moisture=latest.soil_moisture,
        light_intensity=latest.light_intensity,
        pump_status=latest.pump_status,
        is_online=store.is_online(),
        last_heartbeat=latest.timestamp.isoformat(),
        pump_override=store.pump_override,
    )


@app.get("/api/telemetry/history", response_model=TelemetryHistoryResponse)
async def get_telemetry_history() -> TelemetryHistoryResponse:
    readings = [_reading_to_history_entry(r) for r in store.history()]
    return TelemetryHistoryResponse(readings=readings)


@app.post("/api/actuators/pump", response_model=PumpOverrideResponse)
async def set_pump_override(body: PumpOverrideRequest) -> PumpOverrideResponse:
    store.set_pump_override(body.override)
    logger.info("Pump override set to %s", body.override)
    return PumpOverrideResponse(status="ok", override=store.pump_override)


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}
