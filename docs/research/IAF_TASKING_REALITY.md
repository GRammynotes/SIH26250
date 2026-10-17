# Public-source context for SIH 26250

**Reviewed:** 17 October 2026
**Purpose:** Frame AIR COMMAND’s prototype against public material on air command-and-control and planning. This note is a research aid, not an authoritative description of classified or unit-level IAF procedures.

## Executive summary

Public Ministry of Defence reporting describes IACCS as an IAF command-and-control capability that supports networked operations and situational awareness. Public material does not establish the full operational planning sequence, detailed decision authorities, targeting workflow, rules, or interfaces that this student prototype would need to match.

AIR COMMAND therefore models a limited, local exercise workflow. Its inputs and outcomes are synthetic; its COA ranking uses weighted rules; and its briefing and mission execution remain in the browser. The prototype is not IACCS-connected, does not produce an operational Air Tasking Order (ATO), and has not been validated by the IAF or domain subject matter experts.

## What the public sources support

- A 2022 Ministry of Defence / Press Information Bureau (PIB) report describes a demonstration of IACCS at an IAF radar station and says it supports network-centric operations, situational awareness, and networked operations involving fighter, transport, and remotely piloted aircraft. This is a public description of system purpose, not an interface specification or a complete operational workflow.
- PIB’s 2010 AFNET release describes a secure communications network and planned integration with IACCS. It is historical context and should not be used to assert the current network topology or deployment status.
- A 2025 PIB background document discusses jointness and IACCS in the context of public reporting. It does not provide technical integration requirements for this prototype.
- USAF ATO and planning publications can inform general comparison of planning concepts. They describe US doctrine and must not be presented as IAF procedure.

## What remains unverified

The public sources reviewed here do not verify:

- A complete, current IAF tasking chain or the exact responsibilities of individual command levels for this problem.
- Detailed IACCS data schemas, access controls, sensor interfaces, latency, security requirements, or external integration procedures.
- Specific IAF ATO generation, dynamic retasking, targeting, ROE, or deconfliction workflows.
- Any operational accuracy, safety, decision-time benefit, or readiness of AIR COMMAND.

Earlier drafts stated some of these items as settled facts. They are removed from this note unless they are directly supported by a cited public source. Validate operational specifics with an authorized domain reviewer before making them product requirements.

## Prototype mapping to the problem

| Problem-facing need | Current prototype behavior | Evidence and limit |
| --- | --- | --- |
| See exercise force and mission context together | Seeded aircraft roster, mission queue, map overlays, scenario and exercise status | `src/lib/data/`, `src/lib/components/panels/AircraftPanel.svelte`, `MissionPanel.svelte`, `src/lib/components/map/TacticalMap.svelte`. These are local exercise data, not live feeds. |
| Compare resource plans | Weighted rules rank aggressive, balanced, and conservative COAs with assignments, risk, estimated success, time-to-effect and explanation | `src/lib/engine/optimisation.ts`. The results are heuristic illustrations, not calibrated predictions. |
| Check platform and weapon fit | Compatibility and range checks inform candidate assignment and mission feasibility | `src/lib/engine/weaponeering.ts`, `src/lib/data/weapons.ts`. This is not a certified weapons or operational safety system. |
| Explore changing conditions | Local scenarios can change statuses, add exercise threats, close airspace, change weather, or degrade a track | `src/lib/engine/scenario.ts`, `trackLossEngine.ts`. Events are scripted/generated in the application. |
| Keep a human review step | User reviews a mission briefing, approves local exercise execution, and responds to decision prompts | `src/lib/components/panels/CommanderBriefing.svelte`, `DecisionPrompt.svelte`, `src/lib/engine/missionExecutor.ts`. Approval transmits no tasking. |
| Review the simulated run | Event history, execution phases, AAR and metrics summarize local exercise state | `src/lib/components/panels/ExecutionPanel.svelte`, `AfterActionReview.svelte`, `MetricsDashboard.svelte`. Outcomes are not operational evidence. |

RED VIEW derives a rule-based response from exercise assets and the selected COA (`src/lib/engine/gameTheory.ts`). It is not machine learning or a live adversary model. The app does not export an ATO or connect to IACCS, radar, AWACS, UAV, satellite, or base systems.

## Research implications and next steps

1. Keep the exercise boundary visible in the UI, deck, and recording. Call local inputs and outputs “simulated” or “exercise data.”
2. Keep recommendation explanations and blockers inspectable. Treat success and risk values as illustrative until a documented evaluation calibrates them.
3. Ask a qualified reviewer to validate terminology, workflow assumptions, constraints, and scenario design. Record the reviewer’s scope and approval before changing claims.
4. Define data ownership, interface contracts, access control, logging, and security requirements before designing any external connector. Do not infer an IACCS integration from public descriptions.
5. Test usability and decision quality with representative users and approved exercise data. Report measured benefits only after a documented study.

## References

### Indian public-sector sources

1. Ministry of Defence, PIB, “Hon’ble Raksha Mantri Shri Rajnath Singh visits premier radar station of IAF,” 29 August 2022. Public account of an IACCS demonstration and networked operations. [PIB release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1855242&lang=2&reg=48)
2. Ministry of Defence, PIB, “AFNET to Herald Network Centric Operations in IAF,” 8 September 2010. Historical network context; not a current architecture document. [PIB release](https://www.pib.gov.in/newsite/PrintRelease.aspx?lang=2&reg=48&relid=65621)
3. Press Information Bureau, “Year of Reforms 2025” background document, section on technology integration and network-centric warfare. Public context only. [PDF](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/may/doc2025518557001.pdf)
4. SIH 2026 problem statement listing for SIH26250. The linked page is a third-party viewer, not the SIH submission portal. Confirm exact submission wording in the team’s registered portal. [Listing](https://sih2026-ps-viewer.vercel.app/)

### Comparative planning references

5. Pacific Air Forces, “ATO 101: What every Airman should know about an Air Tasking Order.” USAF context only. [USAF article](https://www.pacaf.af.mil/News/Article-Display/Article/593899/ato-101-what-every-airman-should-know-about-an-air-tasking-order/)
6. US Air Force, *Air Force Doctrine Publication 5-0, Planning*. Comparative planning doctrine; not a statement of IAF practice. [USAF doctrine PDF](https://www.doctrine.af.mil/Portals/61/documents/AFDP_5-0/AFDP5-0Planning.pdf)
7. RAND, *A Strategies-to-Tasks Framework for Planning and Executing ISR Operations*. General research framework. [RAND report](https://www.rand.org/content/dam/rand/pubs/technical_reports/2007/RAND_TR434.pdf)

### Project evidence

8. AIR COMMAND source repository. Use the current code and [implementation and scope brief](../submission/IMPLEMENTATION_AND_SCOPE.md) as evidence of what this prototype implements. [GitHub repository](https://github.com/GRammynotes/SIH26250)
