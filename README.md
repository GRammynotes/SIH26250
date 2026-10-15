# AIR COMMAND
Dynamic air operations decision-support console for SIH 2026 (MoD PS 26250).

## Live Demo
- URL: https://ps2-sih-26250.vercel.app/
- Guided walkthrough: press D
- Historical missions: select from scenario bar

## The Problem
Planning and re-tasking air operations in contested environments is slowed by fragmented data. Aircraft availability, crew status, weapon loads, airspace, weather, and threat intelligence are spread across multiple systems. Commanders lack a unified real-time picture and lose time to manual coordination. This latency can be critical in high-tempo operations where conditions change rapidly. The Ministry of Defence's PS 26250 seeks a solution that fuses these data streams and generates actionable options in real time.

## What We Built
AIR COMMAND combines multi-source inputs into a unified operational picture and generates ranked Courses of Action (COAs) using multi-objective optimisation. The system includes a weaponeering engine that enforces weapon-target compatibility, an NSGA-II-inspired allocator that produces three strategic options (aggressive, balanced, conservative), a Bayesian threat assessment module, and a game-theory comparison framework for evaluating COAs against adversary response models. Historical decision templates from real operations like Balakot and Sindoor provide doctrinal context. A voice-guided comprehensive demo walks evaluators through the complete workflow from mission briefing to after-action review.

## Evaluation Alignment

| Rubric Criterion | What We Did | Where to See It |
|------------------|-------------|----------------|
| Innovation | Multi-objective COA generation with weapon compatibility enforcement, Bayesian threat assessment, game-theory adversary modeling, historical decision templates | Optimisation engine in `src/lib/engine/optimisation.ts`, threat assessment in `src/lib/engine/threatAssessment.ts`, game theory in `src/lib/engine/gameTheory.ts` |
| Feasibility | Full working implementation with real algorithms, web-based architecture, local development and cloud deployment paths | Running `npm run dev` locally, deployed demo at https://ps2-sih-26250.vercel.app/ |
| Impact | Addresses IAF operational latency problem, reduces manual coordination time, provides ranked options with trade-off explanations, human-in-the-loop decision authority | COA comparison panel showing three options with metrics, decision prompt during mission execution |
| Technical Execution | Clean architecture with separation of concerns, TypeScript type safety, reactive state management, modular engine components, comprehensive test scenarios | Source structure in `src/lib/`, engine modules in `src/lib/engine/`, demo scenarios in `src/lib/demo/` |
| Presentation | Professional tactical console UI, guided comprehensive demo with voice narration, interactive glossary, historical simulation mode, event log audit trail | Press D for comprehensive demo, glossary modal, simulation button, event log panel |

## Architecture

```
src/
├── lib/
│   ├── components/
│   │   ├── layout/          (TopBar, ScenarioBar, TooltipLayer)
│   │   ├── map/             (TacticalMap, MapContextMenu, TrajectoryLayer, TerrainToggle)
│   │   ├── overlay/         (CaptionLayer, FocusPointer)
│   │   ├── panels/          (COAPanel, WeaponMatrix, AfterActionReview, etc.)
│   ├── data/                (aircraft, bases, weapons, historicalMissions, etc.)
│   ├── demo/                (comprehensiveDemoScript)
│   ├── engine/              (optimisation, threatAssessment, gameTheory, weaponeering, trajectory, voice)
│   ├── stores/              (systemStore.svelte.ts - reactive state)
│   ├── theme/               (tactical.css)
│   └── types/               (index.ts - TypeScript definitions)
├── main.ts                  (Application entry point)
└── App.svelte               (Root component)

server/
└── index.js                 (Express health endpoint)

public/                      (Static assets)
```

## Feature Tour

| Feature | How to Access | What It Demonstrates |
|---------|---------------|----------------------|
| Mission Briefing | Click a mission in the mission queue | Complete target package with coordinates, threat analysis, assigned forces, weaponeering assessment, historical precedent |
| Decision Prompt | During mission execution at phase boundaries | Human-in-the-loop control with multiple decision branches, each with different consequences |
| COA Comparison | Click "Generate COAs" button | Three ranked options (aggressive, balanced, conservative) with success probability, risk score, and trade-off explanations |
| RED VIEW | Select RED VIEW tab in right panel | Adversary response assumptions, threat geometry, engagement probabilities |
| Weapon Matrix | Select Weapons tab in right panel | Platform-weapon-target compatibility matrix, launch envelope calculations |
| After-Action Review | Opens automatically after mission completion | Complete decision trail, mission narrative, force recovery status, battle damage assessment |
| Metrics Dashboard | Select Metrics tab in right panel | Analytics on force utilization, mission success rates, risk accounting |
| Comprehensive Demo | Press D on keyboard | Full guided walkthrough of system features with voice narration and synchronized captions |
| Historical Simulation | Click Simulation button | Training mode based on real operations (Balakot, Sindoor, SEAD) with historical decision points |
| Reference Library | Click Reference button | Doctrinal diagrams, mission planning flowcharts, aircraft loadout diagrams, strike geometry |

## Tech Stack

- **Frontend:** Vite, Svelte 5, TypeScript
- **Map:** MapLibre GL JS with OpenStreetMap raster tiles
- **Backend:** Express health endpoint with CORS
- **State:** Svelte 5 reactive stores
- **Routing:** @turf/great-circle for geospatial calculations
- **Demo:** Svelte-guided walkthrough, Web Speech API for voice narration
- **Panels:** PaneForge for panel management
- **Symbols:** Built-in canvas and SVG tactical symbols

## Running Locally

```bash
npm install
npm run dev
npm run build
npm run server
```

The development server starts on http://localhost:5173. The optional backend health endpoint starts on http://localhost:3001/api/health.

## Deployment

Vercel auto-deploys from the main branch. The live demo is available at https://ps2-sih-26250.vercel.app/

## Scope

### What Is Real
The algorithms and system architecture are fully implemented. The optimisation engine generates real COAs using multi-objective allocation with weapon compatibility enforcement. The threat assessment module calculates route risk scores using great-circle sampling against threat zones. The game-theory framework evaluates COAs against adversary response models. The decision templating system uses historical mission data with actual decision points from real operations. The weaponeering engine enforces platform-weapon-target compatibility rules. The trajectory calculation and route-blocking logic are functional.

### What Is Simulated
The data feeds are simulated for demonstration purposes. Aircraft status changes, threat appearances, weather systems, and intelligence updates are scripted scenarios rather than live sensor feeds. Exercise markers on the map are synthetic. The voice narration uses the Web Speech API for accessibility, not operational voice communication. Historical mission narratives are based on public sources but adapted for the demonstration context.

## Limitations & Future Work

- The backend is currently a scaffold; real data fusion would require integration with IAF systems (IACCS, HUMS, ATC, etc.)
- Threat intelligence is simulated; production deployment would need classified threat databases
- Weapon performance parameters are simplified; operational use would require classified weaponeering data
- The decision templates are based on public sources; full doctrinal integration would require access to classified operational records
- Voice narration uses browser-based synthesis; operational use would require secure voice communication channels

## Team

[Team names to be added]
