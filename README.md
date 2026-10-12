# AIR COMMAND

Dynamic air operations decision-support system. Built for SIH 2026 Problem Statement 26250.

## Problem

Planning and re-tasking air operations in contested environments is slowed by fragmented data. Aircraft availability, crew status, weapon loads, airspace, weather, and threat intelligence are spread across multiple systems. Commanders lack a unified real-time picture and lose hours to manual coordination.

## Solution

AIR COMMAND fuses multi-source inputs into a single operational picture and continuously generates ranked Courses of Action (COAs) using multi-objective optimisation. When conditions change — an aircraft goes unserviceable, a new threat appears, communications degrade — the system automatically recomputes and presents new options with trade-off explanations.

## Architecture


Data Layer → Fusion Layer → Optimisation Layer → Presentation
────────────────── ────────────────── ────────────────── ──────────────────
Aircraft Health Knowledge fusion NSGA-II multi-obj Command console
Crew Status Geospatial reasoning Pareto front Ranked COAs
Weapon Loadout Route risk scoring 3 modes: aggressive Trade-off view
Threat Picture Confidence weighting balanced/conservative Event narrative
Airspace & Weather Re-tasking on change Degraded-mode UI

### Stack

- **Frontend:** Svelte 5 (runes mode) + TypeScript + Tailwind v3
- **Map:** maplibre-gl v5 with OpenStreetMap raster tiles, CSS-inverted for tactical dark palette
- **Backend:** Express (health endpoint, SSE-ready scaffold)
- **State:** Rune-based reactive store (`systemStore.svelte.ts`)
- **Optimisation:** Custom NSGA-II inspired multi-objective allocator

### Core Algorithms

**Aircraft-to-mission scoring.** Each aircraft is scored against each mission using weighted factors: weapon compatibility, geospatial distance, route risk exposure through threat radii, fuel reserve, crew rest compliance, and status (FMC/PMC/NMC). See `src/lib/engine/optimisation.ts`.

**Route risk estimation.** Great-circle routes are sampled at 24 points and checked against each threat zone's radius. Exposure is aggregated and normalised to a 0-100 risk score. See `routeRisk()` in `optimisation.ts`.

**Multi-objective allocation.** Three strategic modes produce three distinct Pareto-optimal allocations:

| Mode | Objective | Coverage | Typical Result |
|---|---|---|---|
| AGGRESSIVE | Max mission throughput | Dual-task all missions | High success, high risk, fastest |
| BALANCED | Pareto compromise | Dual P1, single others | Recommended default |
| CONSERVATIVE | Airframe preservation | Single-task P1/P2 only | Low success, low risk, slowest |

## Scenarios

Three scenarios demonstrate dynamic re-tasking. Each is a timed sequence of events that mutates system state and triggers re-optimisation.

1. **AIRCRAFT NMC** — HUMS detects engine anomaly on AMB-101; aircraft reclassified PMC; COAs auto-recompute.
2. **MULTI-CRISIS** — New SAM site detected, ingress corridor closed, second aircraft goes PMC. Two aircraft become ineligible simultaneously.
3. **RADAR LOSS** — AWACS link degraded; system enters EDGE MODE; threat picture confidence drops; human verification flag raised.

The system supports RESET at any time to restore the baseline state for repeat demonstrations.

## Running Locally

npm install
npm run dev # frontend on localhost:5173
node server/index.js # backend on localhost:3001 (health endpoint)



## Deployment

Built for static hosting of the frontend and optional Node backend.

**Frontend (any static host):**

npm run build




**Replit:**
- Import this repository
- Set run command to `npm run dev -- --host 0.0.0.0 --port 5173`
- Publish — Replit serves the exposed port

## Design Notes

- Desktop-first, 1440px+ viewport. Not a mobile app.
- Colour palette anchored on `#050608` (base) with cyan `#00f0ff`, amber `#ffaa00`, red `#ff3366`, green `#00ff88` accents.
- Monospace-driven typography (JetBrains Mono) for all data surfaces.
- No rounded corners, no gradients, no decorative animations. Motion is reserved for signalling (pulsing LIVE, active scenario, computing).
- Map tiles are OSM raster, inverted and hue-shifted in CSS to produce a dark tactical basemap without requiring a paid tile key.

## Evaluation Alignment

Maps to the four capability pillars named in the problem statement:

- **AI-enabled decision support** — ranked COAs with trade-off explanations and confidence signals
- **Multi-source data fusion** — unified aircraft, mission, threat, weather, and airspace model
- **Predictive analytics** — route risk scoring under probabilistic threat exposure
- **Optimisation algorithms** — multi-objective Pareto allocation across three strategic postures

## Limitations & Future Work

- Synthetic data only. Real integration requires IACCS/IMMOLS adapter layer.
- Route risk uses straight-line sampling, not Dykstra or A* over terrain-aware graph.
- Prediction of aircraft future availability uses static status, not time-series forecasting. Extending with LSTM on HUMS telemetry is the natural next step.
- No authentication layer. Deployment in an operational environment requires RBAC and audit logging.
