# UI INVENTORY AND PANEL BUDGET PROPOSAL

## 1. CONSOLE VIEW PANEL COUNT

| Panel | Grid Size | Information Shown | Priority |
|-------|-----------|------------------|----------|
| TopBar | 32px height | Classification, system status, metrics (AC/MSN/THR), menu access, time, operator ID | PRIMARY |
| ScenarioBar | 40px height | Scenario filter buttons (GLOBAL VIEW, deep_strike, sead_campaign, radar_loss, aircraft_nmc) | PRIMARY |
| Left Panel (FORCE ROSTER tab) | 15% width (default) | Aircraft list with tail number, status, fuel, type, loadout, crew rest, heading, quick actions (LOADOUT/ASSIGN/DETAILS) | PRIMARY |
| Left Panel (MISSIONS tab) | 15% width (default) | Mission list with name, priority, target type, risk level, status, coordinates, quick actions (BRIEF/EXECUTE/DETAILS) | PRIMARY |
| BaseDetailPanel | Replaces left panel when base selected | Base metadata (name, coords, elevation, roster), assigned aircraft cards with loadout diagrams, compatible weapons, mission fit | SECONDARY |
| TacticalMap (Center) | 57% width (default) | Interactive map with aircraft, bases, missions, threats, ground assets, enemy assets, trails, airspace zones, weather systems, terrain toggle | PRIMARY |
| Right Panel (COA tab) | 28% width (default) | Course of Action options with success probability, risk score, time to effect, mission assignments, explanation, BLUE/RED view toggle | PRIMARY |
| Right Panel (RED VIEW tab) | 28% width (default) | Enemy response prediction, confidence, expected damage, rationale | SECONDARY |
| Right Panel (WEAPONS tab) | 28% width (default) | Weapon matrix (platform × target), mission coverage by priority, weapon prioritization slider | SECONDARY |
| Right Panel (CYBER tab) | 28% width (default) | Link status, encryption, sensor mesh state, spoofed track count, security indicators | SECONDARY |
| Right Panel (METRICS tab) | 28% width (default) | Analytics dashboard (deferred load - MetricsDashboard component) | SECONDARY |
| Right Panel (EXECUTION tab) | 28% width (default) | Active missions with phase timeline (INGRESS/WEZ/RELEASE/EGRESS/RTB), decision chips, aircraft tags, narrative logs | SECONDARY |
| Right Panel (MISSION FLOW tab) | 28% width (default) | Input sources, system processing engines, commander outputs, mission execution timeline | SECONDARY |
| EventLog (Bottom) | 15% height (default) | Timestamped event log with source classification, message, unread count | PRIMARY |
| CommandStatus (Bottom) | 22% width (default) | Threat level, next decision, comms status, security status | SECONDARY |

## 2. PANEL DUPLICATE ANALYSIS

| Panel | Same Data Shown Elsewhere? | Minimum Useful Content | Can Move to Tab? |
|-------|---------------------------|----------------------|-----------------|
| FORCE ROSTER | Aircraft details shown in BaseDetailPanel when base selected; aircraft shown on map | Tail number, status, fuel bar only | No - primary tasking panel |
| MISSIONS | Mission details shown in ExecutionPanel when active; shown on map; shown in COA assignments | Name, priority, status badge only | No - primary planning panel |
| BaseDetailPanel | Aircraft roster subset of FORCE ROSTER; base shown on map | Base code, assigned aircraft count only | Could merge into FORCE ROSTER as detail view |
| COA | Assignments shown in WEAPONS matrix; routes shown on map | Success %, risk, option rank only | No - primary decision panel |
| RED VIEW | Not duplicated | Expected damage, action only | Move to tab within COA panel |
| WEAPONS | Coverage stats duplicated in COA explanation | Matrix grid only | Could move to tab within COA panel |
| CYBER | Status shown in TopBar security indicator; CommandStatus has security row | Link status glyph only | Move to tab within CommandStatus |
| METRICS | Not duplicated | Key performance indicators only | Move to modal (already modal-capable) |
| EXECUTION | Narrative duplicates EventLog; phases shown in MISSION FLOW | Mission name, phase only | Move to tab within MISSIONS panel |
| MISSION FLOW | Phases shown in ExecutionPanel timeline | Timeline steps only | Move to modal (already modal-capable) |
| EventLog | Narrative duplicates ExecutionPanel | Latest 3 entries only | No - primary monitoring panel |
| CommandStatus | Threat level shown in TopBar; security in CYBER panel | Threat level glyph only | Could merge into TopBar |

## 3. TEXT WALLS (>40 CHARACTERS) IN PANELS

| Panel | Text String | Location |
|-------|-------------|----------|
| AircraftPanel | `{ac.callsign ?? 'EXERCISE FLIGHT'} · {ac.type} · BASE {ac.base.toUpperCase()} · FUEL {ac.fuel}% · CREW REST {ac.crewRest}H · HEADING {ac.heading}° · EXERCISE LOAD {ac.weapons.join(', ')}` | Line 51 (DETAILS expansion) |
| MissionPanel | `ID {m.id} · STATUS {m.status} · TARGET {m.targetType.toUpperCase()} · FEASIBLE {m.feasible ? 'YES' : 'NO'}` | Line 80 (DETAILS expansion) |
| BaseDetailPanel | `COMPATIBLE LOADOUT` (label) - weapons list | Line 54 |
| BaseDetailPanel | `MISSION FIT ({missionFit(ac.type).length}/{system.missions.length})` | Line 64 |
| COAPanel | `DEGRADED · SINGLE-SOURCE MODE` | Line 24 (header) |
| COAPanel | `AWAITING GENERATION` | Line 47 |
| COAPanel | `NSGA-II MULTI-OBJECTIVE · 4 OBJECTIVES` | Line 61 |
| COAPanel | `ENTER / SELECT FOR BREAKDOWN` | Line 104 |
| ExecutionPanel | `AWAITING COMMAND · {am.pendingDecision.title}` | Line 75 |
| WeaponMatrix | `HOVER / FOCUS TO LOCATE` | Line 34 |
| WeaponMatrix | `PLATFORM × TARGET` | Line 34 |
| WeaponMatrix | `MISSION PRIORITY` | Line 25 |
| WeaponMatrix | `SELECTED PLAN · OPTION {selectedCoa.rank}` | Line 25 |
| CyberPanel | `CYBER / LINK ASSURANCE` | Line 11 |
| CyberPanel | `SIMULATED · UNCLASSIFIED` | Line 11 |
| CyberPanel | `LINK COMPROMISED` / `KEY ROTATION DUE` / `LINK SECURE` | Line 13 |
| CyberPanel | `SIMULATED · AES-GCM` | Line 15 |
| CyberPanel | `SINGLE-SOURCE · VALIDATION DISABLED` / `CROSS-SENSOR VALIDATION NOMINAL` | Line 16 |
| CyberPanel | `EXERCISE INDICATORS ONLY · NO LIVE NETWORK OR SENSOR CONNECTION` | Line 18 |
| MissionIOFlow | `MISSION SYSTEM FLOW` | Line 32 |
| MissionIOFlow | `INPUT SOURCES 6 CONNECTED` | Line 33 |
| MissionIOFlow | `IACCS FEED · RADAR + AWACS + UAV` | Line 6 (input data) |
| MissionIOFlow | `SATELLITE INTEL · IMAGERY + SIGINT` | Line 6 (input data) |
| MissionIOFlow | `WEATHER SERVICE · METOC DATA` | Line 7 (input data) |
| MissionIOFlow | `AIRSPACE AUTHORITY · CORRIDOR STATUS` | Line 7 (input data) |
| MissionIOFlow | `BASE OPS · AIRCRAFT STATUS` | Line 8 (input data) |
| MissionIOFlow | `CREW SCHEDULING · REST + QUALIFICATION` | Line 8 (input data) |
| MissionIOFlow | `MULTI-SOURCE FUSION · 6 → 1 unified picture` | Line 11 (processing data) |
| MissionIOFlow | `WEAPONEERING ENGINE · 14 weapons × 6 platforms` | Line 11 (processing data) |
| MissionIOFlow | `NSGA-II OPTIMISATION · 3 Pareto-optimal COAs` | Line 12 (processing data) |
| MissionIOFlow | `BAYESIAN THREAT ASSESS · enemy intent posterior` | Line 12 (processing data) |
| MissionIOFlow | `GAME-THEORY COMPARISON · enemy best-response` | Line 13 (processing data) |
| MissionIOFlow | `RANKED COAs · 3 options · trade-offs explained` | Line 16 (output data) |
| MissionIOFlow | `MISSION TASKING · aircraft-to-target assignment` | Line 16 (output data) |
| MissionIOFlow | `EXECUTION ORDER · ATO-like briefing` | Line 17 (output data) |
| MissionIOFlow | `AFTER-ACTION · decisions · BDA · metrics` | Line 17 (output data) |
| MissionIOFlow | `MISSION EXECUTION TIMELINE` | Line 36 |
| MissionIOFlow | `SIMULATED TRAINING DATA · ACTIVE SCENARIO: {SCENARIO_LABELS[system.activeScenarioFilter ?? ''] ?? 'GLOBAL VIEW'}` | Line 37 |
| TopBar | `UNCLASSIFIED // EXERCISE // SIMULATED DATA` | Line 61 |
| TopBar | `COMPREHENSIVE DEMO` | Line 82 |
| TopBar | `TRAINING SIMULATION` | Line 83 |
| TopBar | `KEYBOARD SHORTCUTS` | Line 85 |
| TopBar | `DEGRADED MODE ON/OFF` | Line 89 |
| ScenarioBar | `SCENARIO FILTER` | Line 18, 26 |
| CommandStatus | `AWAITING COMMANDER TASKING` / `MONITOR ACTIVE TASKING` | Line 6 (derived) |
| CommandStatus | `LINK COMPROMISED` / `KEY ROTATION DUE` / `SIMULATED · SECURE` | Line 7 (derived) |
| CommandStatus | `LINK SECURE` / `LINK COMPROMISED` | Line 15 |

## 4. NAME/LABEL/WEAPON REPLACEMENT OPPORTUNITIES

| Current Text | Location | Replacement Suggestion |
|--------------|----------|------------------------|
| Aircraft type labels (Su-30MKI, Rafale, etc.) | AircraftPanel line 48, BaseDetailPanel line 50 | 3D model thumbnail (icon view) + hover tooltip |
| Weapon names (Brahmos, R-73, etc.) | AircraftPanel line 51, BaseDetailPanel lines 56-59, ExecutionPanel line 49 | Icon + hover tooltip |
| Mission target type (hardened-bunker, radar-site, etc.) | MissionPanel line 78, ExecutionPanel line 48 | Icon (bunker/radar/troop/bridge/ship) + hover tooltip |
| Base names (Srinagar, Pathankot, etc.) | ScenarioBar buttons, BaseDetailPanel line 35 | 3D model thumbnail of base infrastructure + hover tooltip |
| Aircraft tail numbers | AircraftPanel line 47, map labels, ExecutionPanel line 69 | Aircraft silhouette icon + tail number on hover |
| Status labels (FMC/PMC/NMC) | AircraftPanel line 47, BaseDetailPanel line 48 | Color-coded glyph (✓/◐/×) already implemented - keep |
| Priority labels (P1/P2/P3) | MissionPanel line 77, WeaponMatrix | Color-coded border already implemented - keep |
| Scenario labels (deep_strike, sead_campaign, etc.) | ScenarioBar buttons | Scenario icon (bomb/target/aircraft) + label |
| Threat type labels (RADAR, SAM, etc.) | Threat polygons on map, tooltips | Icon based on threat type + hover tooltip |
| Encryption type (AES-GCM) | CyberPanel line 15 | Lock icon - remove text |
| Sensor mesh state | CyberPanel line 16 | Network icon with status color - remove text |

## 5. 3D MODEL INVENTORY

| Model | Current Usage | Primary Visual Role? | Buried? |
|-------|---------------|---------------------|---------|
| su30mki.glb | ModelViewer3D, ModelScene, ArcViewer (rail components) | PRIMARY in rail EntityDetail/ArcViewer | BURIED in console view |
| rafale.glb | ModelViewer3D, ModelScene, ArcViewer (rail components) | PRIMARY in rail EntityDetail/ArcViewer | BURIED in console view |
| mig29.glb | ModelViewer3D, ModelScene, ArcViewer (rail components) | PRIMARY in rail EntityDetail/ArcViewer | BURIED in console view |
| mirage2000.glb | ModelViewer3D, ModelScene, ArcViewer (rail components) | PRIMARY in rail EntityDetail/ArcViewer | BURIED in console view |
| brahmos.glb | ModelViewer3D, ModelScene, ArcViewer (rail components) | PRIMARY in rail EntityDetail/ArcViewer | BURIED in console view |
| t90.glb | ModelViewer3D, ModelScene, ArcViewer (rail components) | PRIMARY in rail EntityDetail/ArcViewer | BURIED in console view |

**Note:** All 3D models are ONLY rendered in the rail component (ComprehensiveDemo/Training/Sim modes) through ModelViewer3D, ModelScene, and ArcViewer. They are NEVER visible in the default console view panels. The console uses 2D map symbols and text labels exclusively.

## 6. MAXIMUM PANEL BUDGET PROPOSAL

### RECOMMENDED: 4 PANELS MAXIMUM

| Panel | Why Keep | Action for Others |
|-------|----------|-------------------|
| **FORCE ROSTER** | Primary tasking interface - essential for aircraft assignment | Keep |
| **MISSIONS** | Primary planning interface - essential for mission selection | Keep |
| **TACTICAL MAP** | Primary situational awareness - central visual reference | Keep |
| **COA** | Primary decision interface - essential for plan selection | Keep |

### PANEL REORGANIZATION PLAN

| Panel | Proposed Action | Rationale |
|-------|----------------|-----------|
| **BaseDetailPanel** | Merge into FORCE ROSTER as tabbed detail view | Redundant - shows subset of roster data |
| **RED VIEW** | Move to tab within COA panel | Secondary view - not primary decision flow |
| **WEAPONS** | Move to tab within COA panel | Secondary analysis - only needed during COA review |
| **CYBER** | Move to tab within CommandStatus or merge into TopBar security indicator | Secondary status - not critical for operations |
| **METRICS** | Keep as modal only (already modal-capable) | Analytics not needed during active operations |
| **EXECUTION** | Move to tab within MISSIONS panel | Active missions subset of mission list |
| **MISSION FLOW** | Keep as modal only (already modal-capable) | System documentation, not operational |
| **EventLog** | Keep but reduce to latest 3 entries in collapsed state, expand on demand | Primary monitoring but can be condensed |
| **CommandStatus** | Merge critical info (threat level) into TopBar, rest to modal/dock | Duplicates TopBar metrics and security |

### LAYOUT RECOMMENDATION

**Default Console View (4 panels):**
- Left: FORCE ROSTER (with base detail tab)
- Center: TACTICAL MAP (expanded width)
- Right: COA (with RED VIEW and WEAPONS as sub-tabs)
- Bottom: MISSIONS (with EXECUTION as sub-tab) + collapsed EventLog (latest 3)

**Panel Budget Justification:**
- Cognitive load: More than 4 concurrent panels causes split attention
- Screen real estate: 4 panels allows ~25% width per panel for readability
- Task flow: Roster → Map → COA → Missions covers the complete operational cycle
- Secondary panels accessible via tabs/modals when needed
