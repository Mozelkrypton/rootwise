from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class TelemetryIngest(BaseModel):
    node_id: str = Field(..., min_length=1)
    temperature: float
    humidity: float = Field(..., ge=0, le=100)
    soil_moisture: float = Field(..., ge=0, le=100)
    light_intensity: float = Field(..., ge=0, le=100)
    pump_status: bool

    @field_validator("node_id")
    @classmethod
    def strip_node_id(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("node_id must not be empty")
        return stripped


class TelemetryCommandResponse(BaseModel):
    status: str = "ok"
    pump_override: Optional[bool] = None


class PumpOverrideRequest(BaseModel):
    override: Optional[bool] = None


class PumpOverrideResponse(BaseModel):
    status: str = "ok"
    override: Optional[bool] = None


class LatestTelemetryResponse(BaseModel):
    node_id: str
    temperature: float
    humidity: float
    soil_moisture: float
    light_intensity: float
    pump_status: bool
    is_online: bool
    last_heartbeat: str
    pump_override: Optional[bool] = None


class HistoryEntry(BaseModel):
    node_id: str
    temperature: float
    humidity: float
    soil_moisture: float
    light_intensity: float
    pump_status: bool
    timestamp: str


class TelemetryHistoryResponse(BaseModel):
    readings: List[HistoryEntry]
