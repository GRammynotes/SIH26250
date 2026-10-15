# AIR COMMAND · 35-Shot Recorder Checklist

Target runtime: **2:55**. Each shot is five seconds. Record the live application at 1920×1080 with no music and team-member voiceover. The opening and closing cards are simple text overlays; the remaining shots use the running console. AIR COMMAND is an exercise decision-support prototype: present simulated inputs as simulated and avoid claiming a live IACCS connection, ATO export, or operational approval.

| Done | Time | UI / framing | Action | Narration cue |
|---|---|---|---|---|
| [ ] | 0:00–0:05 | Text card: “Fragmented data slows air operations planning” | Fade directly into the application | Planning depends on bringing operational data together quickly. |
| [ ] | 0:05–0:10 | Welcome screen | Hold on the four entry choices | AIR COMMAND is a decision-support prototype for SIH problem statement 26250. |
| [ ] | 0:10–0:15 | Welcome screen | Select EXPLORE | This is an exercise environment; its data and outcomes are simulated. |
| [ ] | 0:15–0:20 | Full console | Hold the four-region layout | The console places force, map, planning, and event status in one view. |
| [ ] | 0:20–0:25 | TopBar close-up | Point to classification and IACCS exercise status | The IACCS indicator describes the exercise feed state, not a live connection. |
| [ ] | 0:25–0:30 | TopBar IACCS popover | Open the status button | Radar, AWACS, and supporting feeds are simulated or locally represented. |
| [ ] | 0:30–0:35 | Force Roster | Point to FMC / PMC / NMC counts | The roster shows aircraft readiness and fuel state. |
| [ ] | 0:35–0:40 | Aircraft row | Expand a row to show crew-rest and weapon badges | Crew-rest hours and loaded weapon types are visible on each row. |
| [ ] | 0:40–0:45 | Tactical map | Pan or hold over the Kashmir / Punjab exercise area | The map combines exercise aircraft, mission, and threat symbols. |
| [ ] | 0:45–0:50 | Tactical Picture card | Open ◈ LEGEND | Shape and symbol are used alongside colour to distinguish map entities. |
| [ ] | 0:50–0:55 | Map layers | Turn on AIRSPACE and WEATHER | Airspace and weather layers show the scenario’s geographic constraints. |
| [ ] | 0:55–1:00 | Scenario bar | Select DEEP STRIKE | We’ll use the supplied deep-strike exercise scenario. |
| [ ] | 1:00–1:05 | Right COA tab | Point to “GENERATE COA to begin planning” | Before planning, the console makes the next action explicit. |
| [ ] | 1:05–1:10 | COA tab | Press GENERATE COA | A rules-based weighted allocator ranks three force options. |
| [ ] | 1:10–1:15 | COA results | Hold on success and risk measures | These are model estimates from the exercise inputs, not operational forecasts. |
| [ ] | 1:15–1:20 | Option 2 card | Select OPTION 2 | Each option changes assignments and the picture used for comparison. |
| [ ] | 1:20–1:25 | RED VIEW | Show all three response cards | RED VIEW presents a distinct modeled response for each COA. |
| [ ] | 1:25–1:30 | WEAPONS tab | Open the weapon matrix | Weapon-target compatibility and range are checked against the scenario. |
| [ ] | 1:30–1:35 | Force Roster | Point to weapon count, then open a loadout | Weapon details are available from the aircraft roster and loadout view. |
| [ ] | 1:35–1:40 | Missions tab | Point to priority badges | Mission priority is visible in both the mission queue and COA planning. |
| [ ] | 1:40–1:45 | Mission briefing | Open a planned mission | The briefing brings target, assignment, and constraints together. |
| [ ] | 1:45–1:50 | Briefing ROE strip | Hold on positive ID and collateral limit | Every mission briefing displays the exercise ROE before approval. |
| [ ] | 1:50–1:55 | Briefing authority line | Hold on AOC-in-C and Wing Cdr roles | The interface distinguishes operational tasking from mission execution roles. |
| [ ] | 1:55–2:00 | Approve briefing | Approve the selected exercise tasking | Approval begins a local simulation; it does not transmit a tasking order. |
| [ ] | 2:00–2:05 | Execution map | Show route and moving aircraft | The map animates the exercise mission along its route. |
| [ ] | 2:05–2:10 | Decision prompt | Hold on ROE strip and decision choices | A decision prompt repeats the ROE and presents the modeled consequences. |
| [ ] | 2:10–2:15 | Select an option | Choose one branch and show impact | The selected branch updates the simulation and records the decision trail. |
| [ ] | 2:15–2:20 | Mission timeline / event log | Show phase and event sequence | Events and mission phases remain visible for review. |
| [ ] | 2:20–2:25 | After-Action Review | Open the AAR | The AAR summarizes the simulated mission outcome and decisions. |
| [ ] | 2:25–2:30 | BDA panel | Hold on outcome evidence | Battle-damage results shown here are exercise outcomes, not real intelligence. |
| [ ] | 2:30–2:35 | Metrics | Open METRICS | Metrics summarize the current fleet, COA estimates, and recorded decisions. |
| [ ] | 2:35–2:40 | 3D expanded view | Open a model and rotate once | Aircraft and loadout models provide a visual reference with orbit controls. |
| [ ] | 2:40–2:45 | Architecture / scope text card | Show a short “rules-based · simulated feeds” overlay | The current prototype uses rules and local exercise data. |
| [ ] | 2:45–2:50 | Live URL card | Show the deployed address | It is a browser-based demonstration; operational integrations remain future work. |
| [ ] | 2:50–2:55 | End card | Fade to AIR COMMAND and PS 26250 | AIR COMMAND — SIH 2026, problem statement 26250. |

**Recording notes:** run the entire path once before recording; use a team member’s voice, no music, and trim only dead time. If a selector or UI state is unavailable in the current build, record the reason in `docs/screenshots/submission/FAILED.txt` rather than implying that the feature worked.
