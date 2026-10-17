# AIR COMMAND | demo narration (about 2:45–3:00)

AIR COMMAND is a browser based decision-support exercise built for SIH problem statement 26250, Air Power — Dynamic Air Operations & Resource Optimisation.

The console combines an exercise force roster, mission queue, tactical map and planning panel. All aircraft, crew, weapons, weather, airspace, threat tracks, feed indicators and mission outcomes are seeded or generated exercise data. The prototype does not connect to IACCS, radar, AWACS, UAV, satellite or base systems.

We select a scenario and generate three courses of action. A weighted rules engine compares aggressive, balanced and conservative postures. It checks aircraft status, fuel, crew rest, weapon compatibility and range, route exposure, closed airspace and weather thresholds. It returns assignments, risk and success estimates, time-to-effect and an explanation. These values are illustrative model outputs, not operational forecasts.

The weapon view makes platform and target compatibility easier to inspect. RED VIEW applies a rule-based response to each selected posture. It is a local exercise model, not machine learning and not a live adversary prediction.

A user can review the mission briefing and exercise rules before approving the local simulation. During the run, the map shows a modeled route and decision prompts record the selected branch. Approval does not transmit an order. The after-action review summarizes the simulated run and its event trail.

The working prototype demonstrates a connected planning and training workflow. It has not been validated for real-world tasking, and it reports no measured reduction in decision time. Future work includes domain review of the rules, better confidence and data provenance, and carefully authorized test integrations with security and audit controls.

AIR COMMAND, SIH 2026, problem statement 26250.
