from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Dict, List, Optional

from models import DEFAULT_CROP, DEFAULT_SOIL_OFF, DEFAULT_SOIL_ON

HISTORY_LIMIT = 100
ONLINE_THRESHOLD_SECONDS = 15


@dataclass
class TelemetryReading:
    node_id: str
    temperature: float
    humidity: float
    soil_moisture: float
    light_intensity: float
    pump_status: bool
    crop: str = DEFAULT_CROP
    soil_on: float = DEFAULT_SOIL_ON
    soil_off: float = DEFAULT_SOIL_OFF
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict:
        return {
            "node_id": self.node_id,
            "temperature": self.temperature,
            "temp_c": self.temperature,
            "humidity": self.humidity,
            "soil_moisture": self.soil_moisture,
            "soil_pct": self.soil_moisture,
            "light_intensity": self.light_intensity,
            "light_pct": self.light_intensity,
            "pump_status": self.pump_status,
            "crop": self.crop,
            "soil_on": self.soil_on,
            "soil_off": self.soil_off,
            "timestamp": self.timestamp.isoformat(),
        }


class TelemetryStore:
    def __init__(self) -> None:
        self._latest: Optional[TelemetryReading] = None
        self._history: Deque[TelemetryReading] = deque(maxlen=HISTORY_LIMIT)
        self._pump_override: Optional[bool] = None

    @property
    def pump_override(self) -> Optional[bool]:
        return self._pump_override

    def set_pump_override(self, override: Optional[bool]) -> None:
        self._pump_override = override

    def ingest(self, reading: TelemetryReading) -> None:
        self._latest = reading
        self._history.append(reading)

    def latest(self) -> Optional[TelemetryReading]:
        return self._latest

    def history(self) -> List[TelemetryReading]:
        return list(self._history)

    def is_online(self) -> bool:
        if self._latest is None:
            return False
        now = datetime.now(timezone.utc)
        ts = self._latest.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        age = (now - ts).total_seconds()
        return age < ONLINE_THRESHOLD_SECONDS


store = TelemetryStore()
