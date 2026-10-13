# AIR COMMAND — SIH 2026 Problem Statement 26250

Dynamic air operations decision-support system.

## Problem

Planning and re-tasking air operations in contested environments is slowed by fragmented data. Aircraft availability, crew status, weapon loads, airspace, weather, and threat intelligence are spread across multiple systems. Commanders lack a unified real-time picture and lose time to manual coordination.

## Solution

AIR COMMAND combines multi-source inputs into a unified operational picture and generates ranked Courses of Action (COAs) using multi-objective optimisation. When conditions change, the system recomputes options and presents trade-off explanations.

## Architecture

Data Layer → Fusion Layer → Optimisation Layer → Presentation

- **Data:** Aircraft health, crew status, weapon loadout, threat picture, airspace and weather.
- **Fusion:** Knowledge fusion, geospatial reasoning, route-risk scoring and confidence weighting.
- **Optimisation:** NSGA-II-inspired multi-objective allocation with aggressive, balanced and conservative modes.
- **Presentation:** Command console, ranked COAs, trade-off view and event narrative.

## Technology Stack

- **Frontend:** Svelte 5, TypeScript and Tailwind CSS
- **Map:** MapLibre GL JS and OpenStreetMap raster tiles
- **Backend:** Express with a health endpoint and SSE-ready scaffold
- **State:** Svelte reactive store
- **Optimisation:** Custom NSGA-II-inspired multi-objective allocator

## Core Algorithms

### Aircraft-to-Mission Scoring

Aircraft are scored against missions using weapon compatibility, geospatial distance, route-risk exposure, fuel reserve, crew-rest compliance and aircraft serviceability status.

### Route-Risk Estimation

Great-circle routes are sampled at 24 points and checked against threat-zone radii. Exposure is aggregated into a normalised 0–100 risk score.

### Multi-Objective Allocation

| Mode | Objective | Typical Result |
|---|---|---|
| Aggressive | Maximise mission throughput | High success, higher risk |
| Balanced | Balance success and risk | Recommended default |
| Conservative | Preserve airframes | Lower risk, slower throughput |

## Demonstration Scenarios

1. **Aircraft NMC:** An engine anomaly changes aircraft availability and triggers re-optimisation.
2. **Multi-Crisis:** A new SAM site, closed ingress corridor and aircraft availability changes trigger re-optimisation.
3. **Radar Loss:** Degraded AWACS communications lower threat-picture confidence and raise a human-verification flag.

A reset restores the baseline state for repeat demonstrations.

## Running Locally

Install dependencies:

```bash
npm install