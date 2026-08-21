# RootWise — Irrigation Dashboard (React + Vite)

## Setup
```
npm install
npm run dev
```
Then open the local URL Vite prints (usually http://localhost:5173).

## Accounts

Sign-up/login is currently a mock (`src/context/AuthContext.jsx`) — accounts are stored in `localStorage`, no backend needed to try it out. Visiting `/` redirects to `/login` if you're not signed in, and to `/dashboard` if you are.

To wire it to a real backend, replace the three functions in `AuthContext.jsx`:
- `signup()` → `POST /api/auth/signup { name, email, password }`
- `login()` → `POST /api/auth/login { email, password }` → returns `{ token, user }`
- `logout()` → clear the token client-side

Once real, store only the JWT and attach it as `Authorization: Bearer <token>` on every IoT/ML API call so each user only sees their own fields.

Running on mock data (`src/data/mock.js`). To connect the real backend:

- `depthSensors` / `sensorReadings` → `GET /api/readings`
- `recommendation` → `GET /api/predict`
- `weather` → Open-Meteo API
- `Recommendation.jsx`'s override handler → `POST /api/irrigate/override`

`vite.config.js` has a commented-out proxy for `/api` → `http://localhost:8000` (your FastAPI backend) — uncomment once that's running.

## Structure
- `src/App.jsx` — layout, assembles all panels
- `src/index.css` — design tokens (colors, type, spacing) in `:root`
- `src/components/` — SoilProfile (signature soil cross-section), TrendChart, Recommendation, Weather, SensorCards
- `src/data/mock.js` — mock data, swap for real fetches here
