# AIR COMMAND — 3-Minute Demo Script

## Setup (before demo starts)
- Open https://ps2-sih-26250.vercel.app/
- Confirm voice toggle is ON (top bar)
- Press ESC to ensure no modal is open

## [0:00-0:15] Opening
State: Global view, no scenario active.
Say: "AIR COMMAND is a decision-support system for IAF air operations planning. PS 26250 asks for a unified framework to reduce planning latency and improve resource allocation."
Action: None — let judges absorb the console.

## [0:15-0:45] Scenario Selection
Say: "We're running Exercise Iron Veil — a SEAD mission against a radar site in Kashmir."
Action: Click scenario bar → DEEP STRIKE. Map flies to AO.

## [0:45-1:15] Mission Briefing
Say: "The system fuses six IAF data sources into a unified picture. Watch what appears when I open the briefing."
Action: Click IRON VEIL → BRIEFING opens. Point to each section as you speak.

## [1:15-1:45] Commander Decision
Say: "The system pauses for command input at every decision gate. Here the target radar went silent — the commander must choose."
Action: Show the 3 options. Click OPTION B. Watch the map react.

## [1:45-2:15] Execution
Say: "Trajectories draw on the map. The mission walks through INGRESS-WEZ-RELEASE-EGRESS-RTB. Voice narration announces each phase."
Action: Let the mission run 30 seconds. Point to trajectory arcs, caption, focus pointer.

## [2:15-2:45] After-Action Review
Say: "When the mission completes, we see the decision trail, force recovery, and BDA."
Action: AAR opens automatically. Walk through sections.

## [2:45-3:00] Impact
Say: "What used to take 90 minutes of manual coordination now takes 2 seconds of computation, with human decision authority preserved at every step. Press D to run the guided walkthrough yourself."
Action: Close AAR. Click DEMO button.

## Q&A Preparation
Common questions with answers:
- "How is this different from IACCS?" → We complement it — IACCS is tactical air defence, we're offensive ops planning and re-tasking.
- "Where does the data come from?" → Simulated exercise data mimicking IACCS/Satellite/METOC feeds.
- "What algorithms?" → NSGA-II multi-objective, Bayesian threat, Bayesian game COA comparison.
- "Is it deployable?" → Frontend is deployment-ready; backend integration with IACCS/IMMOLS is the next step.
