from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

from normalize import normalize_telemetry_payload


DEFAULT_CROP = "maize"
DEFAULT_SOIL_ON = 35.0
DEFAULT_SOIL_OFF = 60.0


class TelemetryIngest(BaseModel):
    node_id: str = Field(..., min_length=1)
    temperature: float
    humidity: float = Field(..., ge=0, le=100)
    soil_moisture: float = Field(..., ge=0, le=100)
    light_intensity: float = Field(..., ge=0, le=100)
    pump_status: bool
    crop: str = DEFAULT_CROP
    soil_on: float = Field(default=DEFAULT_SOIL_ON, ge=0, le=100)
    soil_off: float = Field(default=DEFAULT_SOIL_OFF, ge=0, le=100)

    @model_validator(mode="before")
    @classmethod
    def accept_aliases(cls, data: object) -> object:
        return normalize_telemetry_payload(data)

    @field_validator("node_id", "crop")
    @classmethod
    def strip_strings(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("value must not be empty")
        return stripped

    @model_validator(mode="after")
    def validate_soil_thresholds(self) -> "TelemetryIngest":
        if self.soil_on >= self.soil_off:
            raise ValueError("soil_on must be less than soil_off")
        return self


class TelemetryCommandResponse(BaseModel):
    status: str = "ok"
    pump_override: Optional[bool] = None


class PumpOverrideRequest(BaseModel):
    override: Optional[bool] = None


class PumpOverrideResponse(BaseModel):
    status: str = "ok"
    override: Optional[bool] = None


class TelemetrySnapshot(BaseModel):
    node_id: str
    temperature: float
    temp_c: float
    humidity: float
    soil_moisture: float
    soil_pct: float
    light_intensity: float
    light_pct: float
    pump_status: bool
    crop: str
    soil_on: float
    soil_off: float


class LatestTelemetryResponse(TelemetrySnapshot):
    is_online: bool
    last_heartbeat: str
    pump_override: Optional[bool] = None


class HistoryEntry(TelemetrySnapshot):
    timestamp: str


class TelemetryHistoryResponse(BaseModel):
    readings: List[HistoryEntry]
