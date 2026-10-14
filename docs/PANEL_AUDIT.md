# Dismiss and restore audit

This inventory covers interactive console surfaces in `src/` that can be hidden, closed, collapsed, or minimized. Restore controls are identified as implemented at the time of this audit; gaps are marked for the restore-affordance work.

| Element | File | Line | Dismiss method | Restore method | Verdict |
|---|---|---:|---|---|---|
| Force roster panel | `src/lib/components/panels/AircraftPanel.svelte` | 37 | Header visibility eye removes panel | VIEW → Force Roster | Restorable, indirect |
| Missions panel | `src/lib/components/panels/MissionPanel.svelte` | 31 | Header visibility eye removes panel | VIEW → Missions | Restorable, indirect |
| Left column | `src/App.svelte` | 536 | Collapse chevron / Ctrl+L | Narrow left collapsed rail chevron | Restorable, narrow target |
| COA panel | `src/lib/components/panels/COAPanel.svelte` | 28 | Header visibility eye removes COA | VIEW → COA | Restorable, indirect |
| Right column | `src/App.svelte` | 555 | Collapse chevron | Narrow right collapsed rail chevron | Restorable, narrow target |
| Theater data picture | `src/lib/components/map/TacticalMap.svelte` | 969 | Hide theater data button | Same map button / VIEW panel list | Restorable |
| Mission log visibility | `src/lib/components/panels/EventLog.svelte` | 20 | Header eye hides log | VIEW → Mission Log | Restorable, indirect |
| Mission log collapse | `src/lib/components/panels/EventLog.svelte` | 20 | Header chevron / Ctrl+B | Same header chevron / Ctrl+B | Restorable |
| Command status | `src/lib/components/panels/CommandStatus.svelte` | 13 | Header eye hides status | VIEW → Command Status | Restorable, indirect |
| Scenario bar | `src/lib/components/layout/ScenarioBar.svelte` | 18 | Eye hides scenario bar | VIEW → Scenario Bar | Restorable, indirect |
| Scenario dropdown | `src/lib/components/layout/ScenarioBar.svelte` | 11 | Summary closes dropdown | Click summary | Restorable |
| Experience rail | `src/App.svelte` | 603 | Close × exits rail | DEMO / TRAINING / SIM dock buttons | Restorable |
| Experience rail collapse | `src/App.svelte` | 608 | Chevron collapses rail | Collapsed vertical tabs | Restorable |
| Experience rail lock | `src/App.svelte` | 610 | Lock toggles map interaction | Lock button | Restorable |
| Decision prompt | `src/App.svelte` | 640 | Close dismisses pending decision | No reopen after dismissal | Intentional terminal action |
| Track-loss prompt | `src/App.svelte` | 658 | Close clears analysis | Re-run Track Loss scenario | Restorable by scenario |
| Mission flow modal | `src/App.svelte` | 662 | Modal close / Esc | TOOLS → Mission Flow | Restorable |
| Loadout modal | `src/App.svelte` | 663 | Modal close / Esc | Aircraft loadout action | Restorable |
| Reference modal | `src/App.svelte` | 664 | Modal close / Esc | TOOLS → Reference | Restorable |
| Commander briefing | `src/App.svelte` | 669 | Close / backdrop / Esc | Select mission and reopen briefing | Restorable |
| After-action review | `src/App.svelte` | 673 | Close / archive action | Mission review action / AAR queue | Restorable while queued |
| Metrics modal / tab | `src/App.svelte` | 679 | Close or switch tab | TOOLS → Metrics / Metrics tab | Restorable |
| Shortcuts modal | `src/App.svelte` | 680 | Close / Esc | ? shortcut | Restorable |
| Glossary modal | `src/App.svelte` | 681 | Close / Esc | HELP → Glossary | Restorable |
| Command palette | `src/App.svelte` | 682 | Close / Esc | Ctrl+K | Restorable |
| System guide | `src/App.svelte` | 683 | Close × | HELP → System Guide | Restorable |
| Map legend modal | `src/App.svelte` | 684 | Close × / Esc | HELP → Map Legend or L | Restorable |
| Demo completion modal | `src/App.svelte` | 687 | Generate / explore action | Run demo again | Restorable by demo |
| Decision modal minimize | `src/App.svelte` | 121 | Minimize button in modal layer | Bottom-right modal dock | Restorable |
| Modal stack overflow | `src/App.svelte` | 121 | More than three visible pushes older modal to dock | Bottom-right modal dock | Restorable |
| Top bar menus | `src/lib/components/layout/TopBar.svelte` | 22 | Click outside / Esc / choose item | Click menu trigger | Restorable |

## Audit notes

- The primary missing affordance is a persistent edge restore control when a panel has been hidden or a column has been collapsed.
- Minimized modals already have a dock; its capacity and visual stacking need verification against the requested five-icon presentation.
- The right rail's close action exits the rail while its collapse action leaves narrow tabs; the edge activity strip will make both states explicit.
- Some one-shot prompts (for example, a dismissed decision) intentionally terminate the current prompt and are restored only by a new system event.
