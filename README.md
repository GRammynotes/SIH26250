# AIR COMMAND

A browser based tactical air operations decision support exercise for SIH 2026 Ministry of Defence Problem Statement 26250.

**Live demonstration:** https://ps2-sih-26250.vercel.app/  
**Problem statement:** SIH 2026 · MoD PS 26250

## What it does

AIR COMMAND presents synthetic aircraft, crew, weapons, airspace, weather, and threat information in a tactical console. Its rule based weighted scoring and compatibility checks produce three courses of action (COAs) with estimated success and risk values, and a separate RED VIEW presents the selected COA’s modeled adversary response. A training exercise lets a user review a briefing, approve or reject mission execution, respond to decision gates, follow a simulated mission, and inspect an after action review.

## Architecture

```text
AIR COMMAND
├── Svelte 5 + TypeScript browser application
│   ├── Top bar: exercise mode, system status, voice and help
│   ├── Left panel: force roster and mission queue
│   ├── Center: MapLibre tactical map and overlays
│   └── Right panel: COA, RED VIEW, weapons, metrics, execution, PS MAP
├── src/lib/data/       Seeded exercise aircraft, bases, weapons, scenarios
├── src/lib/engine/     Weighted COA scoring, threat and route calculations,
│                      weapon compatibility, mission execution and simulation
├── src/lib/components/ User interface panels, dialogs, map and 3D views
└── server/index.js     Optional Express health endpoint
```

## Screenshots

The images below are captured from the local application at 1920×1080. They show exercise data and simulated states.

### 01 · Idle console

![Idle console](docs/screenshots/submission/01-idle-console.png)

### 02 · Deep strike scenario

![Deep strike scenario](docs/screenshots/submission/02-scenario-deep-strike.png)

### 03 · Force roster and PS category map

![Force roster](docs/screenshots/submission/03-force-roster.png)

### 04 · Mission briefing with ROE

![Mission briefing with ROE](docs/screenshots/submission/04-mission-briefing.png)

### 05 · Generated COAs

![Generated COAs](docs/screenshots/submission/05-coa-generated.png)

### 06 · Differentiated RED VIEW predictions

![RED VIEW predictions](docs/screenshots/submission/06-red-view-differentiated.png)

### 07 · Weapon compatibility matrix

![Weapon matrix](docs/screenshots/submission/07-weapon-matrix.png)

### 08 · Training active at 2×

![Training active](docs/screenshots/submission/08-training-active.png)

### 09 · In-flight decision prompt

![Decision prompt](docs/screenshots/submission/09-decision-prompt.png)

### 10 · Mission execution

![Mission executing](docs/screenshots/submission/10-mission-executing.png)

### 11 · Expanded 3D entity view

![3D entity view](docs/screenshots/submission/11-3d-expand-view.png)

### 12 · Tactical picture and legend

![Tactical picture](docs/screenshots/submission/12-tactical-picture.png)

### 13 · After action review

![After action review](docs/screenshots/submission/13-after-action-review.png)

### 14 · Metrics dashboard

![Metrics dashboard](docs/screenshots/submission/14-metrics-dashboard.png)

### 15 · IACCS exercise status panel

![IACCS status panel](docs/screenshots/submission/15-iaccs-panel.png)

## Run locally

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Vite prints the local development URL. To check the production build:

```bash
npm run build
```

The optional Express health endpoint can be started with `npm run server`; it is not the source of the exercise data or mission simulation.

## Deployment

The Vercel project deploys from the `main` branch. The public demonstration is at https://ps2-sih-26250.vercel.app/.

## Scope: implemented and simulated

### Implemented in this repository

- Rule based weighted scoring for three COA postures, with success estimates constrained to 40–80% and a risk score.
- Weapon and platform compatibility logic, route risk calculations against exercise threat zones, and scenario specific RED VIEW predictions.
- User controlled mission briefing and execution flow, decision prompts, trajectory display, exercise AAR, and a metrics dashboard.
- Crew rest and loaded weapon count badges in the force roster, plus a PS MAP tab linking the named problem statement categories to their UI surfaces.

### Simulated exercise inputs and outcomes

All aircraft readiness, crew, weapons inventory, airspace, weather, threat tracks, IACCS feed status, and mission outcomes are seeded or generated for the exercise. The IACCS label and feed list describe the simulated exercise status; the application does not connect to IACCS, radar, AWACS, UAV, satellite, or live base systems. Success values and battle damage outcomes are illustrative model results, not operational predictions or intelligence. The project does not generate or export an operational ATO, and it does not claim machine learning optimization.

## Technology

- Svelte 5 and TypeScript
- Vite
- MapLibre GL JS for the map
- Three.js with Threlte for 3D entity views
- Web Speech API for optional browser narration
- Express for the optional health endpoint
- Turf great-circle calculations for geospatial routes

## Team and contact

**Team:** AIR COMMAND, SIH 2026 submission team.  
**Contact:** Use the SIH 2026 submission channel associated with this problem statement; this repository does not publish individual contact details.

## Demo recording materials

See [the 35 shot list](docs/demo/SHOT_LIST.md) and [narration script](docs/demo/NARRATION.md). Both describe the application as an exercise prototype and distinguish simulated inputs from live integrations.


