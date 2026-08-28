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
    TelemetrySnapshot,
)
from store import TelemetryReading, store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("rootwise.telemetry")

app = FastAPI(
    title="RootWise Telemetry",
    version="0.2.0",
    description="HTTP REST ingestion for ESP32 nodes (MQTT bridge deferred).",
)

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


def _snapshot_from_reading(reading: TelemetryReading) -> TelemetrySnapshot:
    return TelemetrySnapshot(
        node_id=reading.node_id,
        temperature=reading.temperature,
        temp_c=reading.temperature,
        humidity=reading.humidity,
        soil_moisture=reading.soil_moisture,
        soil_pct=reading.soil_moisture,
        light_intensity=reading.light_intensity,
        light_pct=reading.light_intensity,
        pump_status=reading.pump_status,
        crop=reading.crop,
        soil_on=reading.soil_on,
        soil_off=reading.soil_off,
    )


def _reading_to_history_entry(reading: TelemetryReading) -> HistoryEntry:
    snapshot = _snapshot_from_reading(reading)
    return HistoryEntry(
        **snapshot.model_dump(),
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
        crop=payload.crop,
        soil_on=payload.soil_on,
        soil_off=payload.soil_off,
        timestamp=datetime.now(timezone.utc),
    )
    store.ingest(reading)
    logger.info(
        "Telemetry from %s (%s): temp=%.1f°C humidity=%.1f%% soil=%.1f%% "
        "light=%.1f%% pump=%s thresholds=%.0f/%.0f",
        reading.node_id,
        reading.crop,
        reading.temperature,
        reading.humidity,
        reading.soil_moisture,
        reading.light_intensity,
        reading.pump_status,
        reading.soil_on,
        reading.soil_off,
    )
    return TelemetryCommandResponse(status="ok", pump_override=store.pump_override)


@app.get("/api/telemetry/latest", response_model=LatestTelemetryResponse)
async def get_latest_telemetry() -> LatestTelemetryResponse:
    latest = store.latest()
    if latest is None:
        raise HTTPException(status_code=404, detail="No telemetry received yet")

    snapshot = _snapshot_from_reading(latest)
    return LatestTelemetryResponse(
        **snapshot.model_dump(),
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
    return {"status": "ok", "ingestion": "http"}
