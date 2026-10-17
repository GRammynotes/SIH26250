# SIH 2026 PS 26250 | AIR COMMAND

## Prototype implementation and submission evidence

**Problem statement:** Air Power — Dynamic Air Operations & Resource Optimisation (SIH26250)  
**Team:** AIR COMMAND · **Team ID:** 139613  
**Category:** Software  
**Prototype:** https://ps2-sih-26250.vercel.app/  
**Repository:** https://github.com/GRammynotes/SIH26250

## What the prototype implements

AIR COMMAND is a browser based decision-support exercise. It loads seeded aircraft, crew, weapon, mission, threat, airspace and weather data into a tactical console. The user can inspect the force roster and map, request three ranked courses of action, review a mission briefing, approve a local exercise simulation, respond to decision prompts, and inspect the event trail and after-action review.

The planner in `src/lib/engine/optimisation.ts` uses weighted rules. It checks aircraft status, fuel, crew rest, compatible weapon and range, route exposure, closed airspace and weather thresholds. It ranks aggressive, balanced and conservative postures and explains selected assignments or blockers. `weaponeering.ts` assesses platform and weapon fit; `gameTheory.ts` derives a rule-based adversary response for RED VIEW; `missionExecutor.ts` and related simulation modules drive the local exercise flow.

The interface uses Svelte 5 and TypeScript, MapLibre GL JS for the map, and Three.js / Threlte for optional 3D entity views. The browser app uses scenario data in the repository. The optional Express endpoint is a health endpoint, not a data integration service.

## How this maps to the problem

| Need represented in the exercise | Implemented prototype behavior | Evidence |
| --- | --- | --- |
| Review available force and mission context | Force roster, mission queue, map overlays and scenario filters | `src/lib/components/panels/AircraftPanel.svelte`, `MissionPanel.svelte`, `src/lib/components/map/TacticalMap.svelte` |
| Compare planning options | Three weighted-rule COAs with assignments, risk, estimated success, time-to-effect and explanation | `src/lib/engine/optimisation.ts`, `src/lib/components/panels/COAPanel.svelte` |
| Check compatibility and constraints | Weapon-target fit, range, route risk, closed airspace and weather thresholds | `src/lib/engine/weaponeering.ts`, `optimisation.ts` |
| Keep a human in the loop | Briefing review, local approval, decision prompts and decision history | `src/lib/components/panels/CommanderBriefing.svelte`, `DecisionPrompt.svelte`, `src/lib/engine/missionExecutor.ts` |
| Review the exercise | Animated route, event trail, simulated outcome and AAR/metrics views | `src/lib/components/panels/ExecutionPanel.svelte`, `AfterActionReview.svelte`, `MetricsDashboard.svelte` |

## What is simulated or not implemented

- Aircraft readiness, crew, inventory, weather, airspace, threats, feed status and mission outcomes are seeded or generated exercise data.
- IACCS, radar, AWACS, UAV, satellite and base systems do not connect to this application. The IACCS indicator is an exercise status label.
- The success and risk values are illustrative outputs from heuristics. They are not calibrated operational forecasts or measured performance claims.
- RED VIEW is a deterministic rule-based response model, not an adversary AI model.
- The application does not create or export an operational Air Tasking Order. A mission briefing in the exercise is local and does not transmit tasking.
- No live user authentication, role-based authorization, production audit service or operational deployment is claimed.

## Future scope, subject to review and authorization

1. Validate requirements and scoring rules with qualified domain reviewers using approved, synthetic exercise cases.
2. Add data provenance, confidence/uncertainty handling and an auditable explanation for each recommendation.
3. Define secure, authorized test adapters for external data only after interface ownership, data policy and safety review are established.
4. Add role-based access, event auditing, resilient offline behavior and performance testing before any controlled pilot.
5. Evaluate usability and decision quality with representative users. Publish measured results only after a documented study.

## Submission files

- [SIH template presentation](SIH2026-PS26250-AIR-COMMAND.pptx)
- [Implementation and scope brief](IMPLEMENTATION_AND_SCOPE.md)
- [Demo shot list](../demo/SHOT_LIST.md)
- [Narration script](../demo/NARRATION.md)
