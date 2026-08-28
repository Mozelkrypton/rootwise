# RootWise Irrigation Dashboard (React + Vite)

## Setup

```
npm install
npm run dev
```

Then open the local URL Vite prints (usually http://localhost:5173).

## Accounts

Sign-up/login is currently a mock (`src/context/AuthContext.jsx`)  accounts are stored in `localStorage`, no backend needed to try it out. Visiting `/` redirects to `/login` if you're not signed in, and to `/dashboard` if you are.

To wire it to a real backend, replace the three functions in `AuthContext.jsx`:

- `signup()` - `POST /api/auth/signup { name, email, password }`
- `login()` - `POST /api/auth/login { email, password }` → returns `{ token, user }`
- `logout()` -  clear the token client-side

Once real, store only the JWT and attach it as `Authorization: Bearer <token>` on every IoT/ML API call so each user only sees their own fields.

Running on mock data (`src/data/mock.js`) until the telemetry backend receives ESP32 readings. To connect:

- Live sensor readings — `GET /api/telemetry/latest` (polled by the dashboard)
- Moisture trend chart — `GET /api/telemetry/history`
- Pump manual override — `POST /api/actuators/pump`
- `recommendation` — `GET /api/predict` (not yet implemented)
- `weather` — Open-Meteo API

## Telemetry backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Or from the repo root: `npm run backend`

The Vite dev server proxies `/api` to `http://localhost:8000`.

### ESP32 ingestion

```bash
curl -X POST http://localhost:8000/api/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "node_id": "esp32-node-01",
    "temperature": 24.5,
    "humidity": 65.0,
    "soil_moisture": 42.0,
    "light_intensity": 78.0,
    "pump_status": false
  }'
```

The ESP32 receives `{ "status": "ok", "pump_override": null }` (or `true`/`false` when a dashboard override is active).

## ESP32 firmware

See [`firmware/README.md`](firmware/README.md) for PlatformIO build/upload instructions and pin wiring.

## Structure

- `src/App.jsx` - layout, assembles all panels
- `src/index.css` - design tokens (colors, type, spacing) in `:root`
- `src/components/` - SoilProfile (signature soil cross-section), TrendChart, Recommendation, Weather, SensorCards
- `src/data/mock.js`  - mock data, swap for real fetches here
