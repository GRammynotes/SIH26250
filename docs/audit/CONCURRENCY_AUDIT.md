# Concurrency Audit Report

## Stateful Subsystems Analysis

### 1. Mission Executor (systemStore.svelte.ts)

**$state fields written:**
- `activeMissions` (full array replacement and per-mission mutation)
- `aircraft` (position updates during flight, status changes)
- `missions` (status updates to ACTIVE/COMPLETE/ABORTED)
- `events` (pushEvent calls)
- `aarQueue` (add on completion)

**setInterval / setTimeout:**
- `tickHandle` (setInterval, 1000ms, started in `startTicker()`)
- `window.setTimeout` for weapon impact confirmation (5000ms, in tickExecutions)
- `window.setTimeout` for spoofed track expiration (5000ms, 3000ms, in execute 'data_poisoning')

**Functions that mutate global state:**
- `tickExecutions()` - updates activeMissions, aircraft positions, mission status
- `startMission()` - adds to activeMissions, updates aircraft status, mission status
- `resolveDecision()` - updates activeMissions, aircraft status, missions, threats
- `dismissDecision()` - updates activeMissions
- `advanceSimulationClock()` - updates activeMissions phaseStartTime

**Event listeners registered:**
- None (pure store methods)

**What stops it:**
- `simSpeed === 0` pauses tickExecutions
- `activeMissions.length === 0` skips tickExecutions
- `reset()` clears activeMissions

---

### 2. Comprehensive Demo (ComprehensiveDemo.svelte)

**$state fields written:**
- `currentStepIndex` (local component state)
- `isPlaying`, `isPaused`, `isComplete` (local component state)
- `voiceEnabled` (local component state)
- `autoAdvance` (local component state)

**setInterval / setTimeout:**
- `stepTimer` (setTimeout for auto-advance, duration scaled by simSpeed)
- `actionTimer` (setTimeout for actionDelay, scaled by simSpeed)
- Multiple setTimeout in `sequenceStepFocus` for timed reveals

**Functions that mutate global state:**
- Calls `system.generateCOAs()` (writes coas, selectedCoaId, computing)
- Calls `system.revealElement()` (writes focusMode)
- Calls `narrateUtterance()` (writes voice queue)

**Event listeners registered:**
- `keydown` (global, for ESC, SPACE, Arrow keys)
- Dispatches: `aircommand:focus-clear`, `aircommand:tour-target`, `aircommand:focus`, `aircommand:caption`

**What stops it:**
- ESC key calls `stopDemo()`
- `open` prop becomes false
- User clicks stop button
- Component unmount

---

### 3. Training Simulation (SimulationModal.svelte)

**$state fields written:**
- `started`, `paused`, `busy` (local component state)
- `turns` (local dialogue array)
- `simMissionId` (local component state)
- `autoDecision` (local component state)

**setInterval / setTimeout:**
- `runner` (setTimeout for advanceToDecision loop, scaled by simSpeed)
- `decisionTimer` (setTimeout for auto-branch selection, scaled by simSpeed)
- `exitTimer` (setTimeout for auto-close, 5000ms)

**Functions that mutate global state:**
- `system.runScenario()` (writes activeScenario, activeScenarioFilter, scenarioTimers, missions, coas)
- `system.generateCOAs()` (writes coas, selectedCoaId, computing)
- `system.enterFocusMode()` (writes focusMode)
- `system.revealElement()` (writes focusMode)
- `system.startMission()` (writes activeMissions, aircraft, missions)
- `system.resolveDecision()` (writes activeMissions, aircraft, missions, threats)
- `system.advanceSimulationClock()` (writes activeMissions)
- `system.pushEvent()` (writes events)

**Event listeners registered:**
- `aircommand:rail-decision-resolved` (global)

**What stops it:**
- `open` prop becomes false
- Component unmount (onDestroy clears timers)
- User clicks close button

---

### 4. Probabilistic Simulation (ProbabilisticSimulation.svelte)

**$state fields written:**
- `autoEnabled` (local component state)
- `caseId` (local component state)
- `selectedOutcome` (local component state)
- `runCount` (local component state)
- `pastDecisions` (local component state)
- `introAnnounced` (local component state)

**setInterval / setTimeout:**
- `timer` (setTimeout for auto-simulate, 6000ms scaled by simSpeed)

**Functions that mutate global state:**
- `system.enterFocusMode()` (writes focusMode)
- `system.revealElement()` (writes focusMode)
- `system.pushEvent()` (writes events)
- `narrateUtterance()` (writes voice queue)

**Event listeners registered:**
- None

**What stops it:**
- `open` prop becomes false
- Component unmount (onDestroy clears timer)
- User toggles autoEnabled off

---

### 5. Scenarios (systemStore.svelte.ts)

**$state fields written:**
- `activeScenario` (scenario name)
- `activeScenarioFilter` (scenario name)
- `scenarioOnlyMissionIds` (array of mission IDs)
- `missions` (adds scenario-specific missions)
- `scenarioTimers` (array of timer IDs)

**setInterval / setTimeout:**
- `scenarioTimers` array (multiple setTimeout for scenario steps, delays from SCENARIOS config)
- `window.setTimeout` in `execute` 'data_poisoning' (2000ms, 3000ms, 5000ms)

**Functions that mutate global state:**
- `runScenario()` - writes activeScenario, activeScenarioFilter, scenarioOnlyMissionIds, missions, coas
- `execute()` - calls pushEvent, setAircraftStatus, addThreat, closeAirspace, addWeather, generateCOAs, setMode

**Event listeners registered:**
- None

**What stops it:**
- `clearScenarioTimers()` clears all scenarioTimers
- `reset()` clears all scenario state
- Timer expires (lastDelay + 2000ms sets activeScenario to null)

---

### 6. Continuous Reoptimization (systemStore.svelte.ts)

**$state fields written:**
- `coas` (full array replacement)
- `reoptimizing` (boolean flag)
- `coaGenerationCount` (increment)
- `lastCoaComputeMs` (timestamp)
- `computing` (boolean flag)

**setInterval / setTimeout:**
- `reoptimizationInterval` (setInterval, 30000ms, started in startContinuousReoptimization)
- `reoptimizationDebounce` (setTimeout, 2000ms or 250ms for force)

**Functions that mutate global state:**
- `silentReoptimize()` - writes coas, coaGenerationCount, lastCoaComputeMs
- `generateCOAs()` - writes coas, selectedCoaId, computing, coaGenerationCount, lastCoaComputeMs, events

**Event listeners registered:**
- None

**What stops it:**
- `toggleContinuousReoptimization()` clears interval and debounce
- `continuousReoptimization = false` prevents silentReoptimize
- `reset()` does NOT clear reoptimizationInterval (BUG: persists across reset)

---

### 7. Voice (voice.ts)

**$state fields written:**
- Module-level (not Svelte $state): `queue`, `speaking`, `speakingPriority`, `generation`, `lastSpoken`

**setInterval / setTimeout:**
- None (uses async/await with AudioContext timing)

**Functions that mutate global state:**
- `narrateUtterance()` - writes queue, may cancel speech
- `narrateEvent()` - writes queue, may cancel speech
- `stopVoice()` - clears queue, resets speaking state
- `clearVoiceDedupe()` - clears lastSpoken map

**Event listeners registered:**
- Dispatches: `aircommand:voice-state`, `aircommand:caption`, `aircommand:focus`

**What stops it:**
- `setVoiceEnabled(false)` clears queue and cancels speech
- `stopVoice()` clears queue and cancels speech
- Generation increment cancels in-flight utterances

---

### 8. Focus Mode (systemStore.svelte.ts)

**$state fields written:**
- `focusMode` (object with active, missionId, visibleAircraftIds, visibleThreatIds, visibleTargetIds, revealedLayers, originBaseId, assignedAircraftIds, routeThreatIds, visibleGroundIds, visibleEnemyIds)

**setInterval / setTimeout:**
- None

**Functions that mutate global state:**
- `enterFocusMode()` - writes focusMode
- `exitFocusMode()` - clears focusMode
- `revealElement()` - mutates focusMode arrays

**Event listeners registered:**
- None (receives events from other components)

**What stops it:**
- `exitFocusMode()` clears focusMode
- Demo/simulation stops (may call exitFocusMode)

---

### 9. Rail Content (ArcViewer.svelte, EntityDetail.svelte)

**$state fields written:**
- `viewer3D` (ArcViewer local state)
- `modelFailed` (ArcViewer local state)
- `modelFailed` (EntityDetail local state)

**setInterval / setTimeout:**
- None

**Functions that mutate global state:**
- READ-ONLY (read from system.aircraft, system.missions, system.threats, system.coas)

**Event listeners registered:**
- ArcViewer: none
- EntityDetail: dispatches `aircommand:mission-brief`

**What stops it:**
- Component unmount

---

## Conflict Matrix

| Subsystem | activeMissions | aircraft | missions | coas | selectedCoaId | events | focusMode | computing | reoptimizing | scenarioTimers | activeScenario | voice queue |
|-----------|---------------|----------|----------|------|---------------|--------|-----------|-----------|---------------|----------------|----------------|-------------|
| Mission Executor | WRITE | WRITE | WRITE | - | - | WRITE | - | - | - | - | - | - |
| Demo | - | - | - | WRITE (via generateCOAs) | WRITE (via generateCOAs) | - | WRITE (via revealElement) | WRITE (via generateCOAs) | - | - | - | WRITE (via narrateUtterance) |
| Training Sim | WRITE (via startMission) | WRITE (via startMission, resolveDecision) | WRITE (via startMission, resolveDecision) | WRITE (via generateCOAs) | WRITE (via generateCOAs) | WRITE (via pushEvent) | WRITE (via revealElement) | WRITE (via generateCOAs) | - | WRITE (via runScenario) | WRITE (via runScenario) | WRITE (via narrateUtterance) |
| Probabilistic Sim | - | - | - | - | - | WRITE (via pushEvent) | WRITE (via revealElement) | - | - | - | - | WRITE (via narrateUtterance) |
| Scenarios | - | WRITE (via setAircraftStatus) | WRITE (via add missions) | WRITE (via generateCOAs) | WRITE (via generateCOAs) | WRITE (via pushEvent) | - | WRITE (via generateCOAs) | - | WRITE | WRITE | - |
| Continuous Reopt | - | - | - | WRITE | WRITE | - | - | WRITE | WRITE | - | - | - |
| Voice | - | - | - | - | - | - | - | - | - | - | - | WRITE |
| Focus Mode | - | - | - | - | - | - | WRITE | - | - | - | - | - |

### Critical Conflicts (2+ subsystems WRITE to same field)

| State Field | Writing Subsystems | Conflict Severity |
|-------------|-------------------|-------------------|
| `coas` | Demo, Training Sim, Scenarios, Continuous Reopt | **HIGH** - Can overwrite commander's selected COA |
| `selectedCoaId` | Demo, Training Sim, Scenarios, Continuous Reopt | **HIGH** - Can overwrite commander's selection |
| `computing` | Demo, Training Sim, Scenarios, Continuous Reopt | **MEDIUM** - Flag contention possible |
| `aircraft` | Mission Executor, Training Sim, Scenarios | **HIGH** - Position/status conflicts |
| `missions` | Mission Executor, Training Sim, Scenarios | **HIGH** - Status/addition conflicts |
| `activeMissions` | Mission Executor, Training Sim | **HIGH** - Phase/decision conflicts |
| `events` | Mission Executor, Training Sim, Probabilistic Sim, Scenarios | **LOW** - Log is append-only, no critical state |
| `focusMode` | Demo, Training Sim, Probabilistic Sim, Focus Mode | **MEDIUM** - Visual focus contention |
| `scenarioTimers` | Training Sim, Scenarios | **HIGH** - Timer leak if both run |
| `activeScenario` | Training Sim, Scenarios | **HIGH** - Scenario state conflict |
| `voice queue` | Demo, Training Sim, Probabilistic Sim, Voice | **MEDIUM** - Queue has dedupe but priority system |

---

## Explicit Answers

### Can DEMO and SIM run simultaneously? What breaks?

**Yes, they can run simultaneously.**

**What breaks:**
- Both call `system.generateCOAs()` → `coas` and `selectedCoaId` contention
- Both call `system.revealElement()` → `focusMode` contention (visual focus jumps between demo steps and sim reveals)
- Both call `narrateUtterance()` → voice queue contention (demo narration and sim dialogue interleaved)
- Both dispatch `aircommand:focus` events → focus pointer jumps unpredictably
- Demo may trigger `system.generateCOAs()` while sim is mid-mission, potentially changing the COA the commander is viewing

**No protection exists** - no mutual exclusion flag prevents this.

---

### Can TRAINING and a Scenario run simultaneously? What breaks?

**Yes, they can run simultaneously.**

**What breaks:**
- Training Sim calls `system.runScenario('deep_strike')` which sets `activeScenario`, `activeScenarioFilter`, `scenarioTimers`
- If a user manually runs another scenario via scenario bar, it calls `system.runScenario()` which calls `clearScenarioTimers()` then sets new scenario
- If both run concurrently:
  - `scenarioTimers` array gets corrupted (mixed timers from both scenarios)
  - `activeScenario` and `activeScenarioFilter` flip-flop between values
  - Scenario steps execute out of order or overlap
  - Both call `generateCOAs()` → COA overwrite
  - Both may call `setAircraftStatus`, `addThreat`, `closeAirspace` → conflicting state mutations

**No protection exists** - `runScenario()` does not check if a scenario is already active.

---

### Can a Scenario start while SIM is active? What breaks?

**Yes, a scenario can start while Training Sim is active.**

**What breaks:**
- Scenario calls `generateCOAs()` → overwrites COA that sim may be using for branch decisions
- Scenario may call `setAircraftStatus` → changes aircraft status while sim mission is in flight
- Scenario may call `addThreat` → adds threats while sim is evaluating route risk
- Scenario calls `clearScenarioTimers()` → clears timers that Training Sim may have set via its own `runScenario()` call
- `activeScenario` conflicts between sim's 'deep_strike' and new scenario

**No protection exists** - no check for active missions or sim state before starting scenario.

---

### Can two voice narrators speak at once? How does the queue handle it?

**Yes, multiple narrators can queue simultaneously.**

**Queue handling:**
- Voice uses a single global queue with priority (`critical` vs `info`)
- `speaking` flag ensures only one utterance speaks at a time
- `generation` counter allows cancelling in-flight utterances (e.g., when `stopVoice()` is called)
- Critical priority (`interrupt=true` or priority='critical') will:
  - Cancel current speech if it's not critical
  - Clear the queue
  - Prepend the critical line to queue
- Dedupe via `lastSpoken` map (250 entry max, 2-second window) - prevents repeating the same text within 2 seconds

**What breaks:**
- If Demo and Sim both speak rapidly, the queue interleaves their utterances
- Demo uses `priority: 'info'`, Sim uses mixed priorities
- No narrator isolation - all subsystems share the same queue
- No subsystem-specific cancellation (e.g., stopping demo voice doesn't stop sim voice)

**Partial protection exists** via priority system, but no subsystem isolation.

---

### Can the continuous re-opt timer fire while a mission is mid-flight? Does it overwrite the COA the commander selected?

**Yes, the continuous re-opt timer fires every 30 seconds regardless of mission state.**

**Does it overwrite selected COA:**
- `silentReoptimize()` calls `optimise()` which returns new COA array
- Assigns `this.coas = optimise(...)`
- **Does NOT reassign `selectedCoaId`** - the commander's selection is preserved
- However, the COA object referenced by `selectedCoaId` is replaced in the `coas` array
- If the COA ID format changes or the re-optimization changes the set of COAs, the selected ID may become invalid or point to a different COA

**What breaks:**
- `generateCOAs()` is called, which sets `this.selectedCoaId = this.coas[0]?.id ?? null` in the normal flow
- But `silentReoptimize()` does NOT reset `selectedCoaId`
- So the commander's selection is preserved, but the underlying COA data changes
- If the commander is viewing a specific COA and re-opt fires, the COA metrics (success probability, risk score) may change without their knowledge
- If the commander approved a mission based on a specific COA, and re-opt changes that COA, the approved assignment may no longer match the displayed COA

**Partial protection exists** - selectedCoaId is not overwritten, but the COA object it references can change.

---

### Is there any single "systemBusy" flag? If yes, is it respected everywhere?

**No, there is no single "systemBusy" flag.**

**Existing flags:**
- `computing` (systemStore) - set during COA generation, checked in `silentReoptimize()` and `generateCOAs()`
- `reoptimizing` (systemStore) - set during silent re-opt, checked in `silentReoptimize()`
- `busy` (SimulationModal local state) - used only within that component
- `speaking` (voice.ts module-level) - used only within voice module
- `focusMode?.active` (systemStore) - indicates focus mode is active, but not used as a mutual exclusion flag

**Respect analysis:**
- `computing` is respected by:
  - `silentReoptimize()` - returns early if computing
  - `generateCOAs()` - returns early if computing
- `computing` is NOT respected by:
  - Demo (calls `generateCOAs()` without checking computing)
  - Training Sim (calls `generateCOAs()` without checking computing)
  - Scenarios (calls `generateCOAs()` without checking computing)
- `reoptimizing` is respected only by `silentReoptimize()` itself
- No other subsystem checks any busy flag before mutating state

**Conclusion:** No global busy flag exists. The partial `computing` flag is not universally respected.

---

## Summary of Concurrency Bugs

### Critical Bugs

1. **COA Overwrite During Active Mission**
   - Continuous re-opt, Demo, Training Sim, and Scenarios can all overwrite `coas` while a mission is in flight
   - Commander's `selectedCoaId` may become invalid or point to changed data
   - No protection for in-flight missions

2. **Scenario Timer Leak**
   - Training Sim calls `runScenario()` which sets `scenarioTimers`
   - User can manually run another scenario via scenario bar
   - Both sets of timers run concurrently, `scenarioTimers` array accumulates
   - No cleanup when switching scenarios

3. **Focus Mode Contention**
   - Demo, Training Sim, and Probabilistic Sim all write to `focusMode`
   - Visual focus jumps between subsystems
   - `revealSequenceToken` in Demo and Probabilistic Sim provides local cancellation but no cross-subsystem coordination

4. **Aircraft Status Conflict**
   - Mission Executor updates aircraft positions and status during flight
   - Scenarios can call `setAircraftStatus` simultaneously
   - Training Sim calls `resolveDecision()` which updates aircraft status
   - No mutual exclusion on aircraft mutations

5. **Voice Queue Interleaving**
   - Demo, Training Sim, and Probabilistic Sim all push to the same voice queue
   - No subsystem isolation
   - Priority system helps but doesn't prevent interleaving

### Medium Bugs

6. **Missing computing Flag Check**
   - Demo, Training Sim, and Scenarios call `generateCOAs()` without checking `computing` flag
   - Can trigger multiple simultaneous COA generations

7. **reset() Does Not Clear reoptimizationInterval**
   - Calling `reset()` does not stop the continuous re-opt timer
   - Re-opt continues firing on reset state

8. **activeScenario Not Protected**
   - Training Sim sets `activeScenario` via `runScenario()`
   - User can select scenario via scenario bar simultaneously
   - No mutual exclusion on scenario state

### Low-Risk Issues

9. **Events Log Contention**
   - Multiple subsystems write to `events` array
   - Append-only, no critical state impact
   - May cause log interleaving but no functional bug

10. **Mission Status Conflict**
    - Mission Executor updates mission status during execution
    - Training Sim calls `resolveDecision()` which updates mission status
    - Scenarios add missions to the array
    - Array mutations may conflict but less critical than COA conflicts

---

## Recommendations

1. **Add global `systemBusy` flag** that is checked before any state mutation
2. **Lock COA generation** during active missions (prevent re-opt when `activeMissions.length > 0`)
3. **Add scenario mutual exclusion** - `runScenario()` should check and clear existing scenario
4. **Subsystem isolation for voice** - separate queues or subsystem IDs to prevent interleaving
5. **Fix reset() to clear reoptimizationInterval**
6. **Add `computing` flag check** to all `generateCOAs()` callers
7. **Add aircraft mutation lock** during active mission execution
8. **Focus mode coordinator** - single source of truth for focus state
