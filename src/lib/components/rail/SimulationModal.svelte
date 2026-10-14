<script lang="ts">
  import { onDestroy } from 'svelte';
  import { system } from '../../stores/systemStore.svelte';
  import { narrateUtterance } from '../../engine/voice';
  import { parseMapNarrative } from '../../engine/mapNarrative';
  import type { DecisionBranch } from '../../data/historicalMissions';
  import { HISTORICAL_MISSIONS } from '../../data/historicalMissions';
  import { distanceKm, focusMapElements } from '../../engine/mapNarrative';

  let { open = false, simSpeed = 1, onSpeedChange, onClose }: { open?: boolean; simSpeed?: 0 | 1 | 2 | 4; onSpeedChange?: (speed: 0 | 1 | 2 | 4) => void; onClose?: () => void } = $props();
  const scaledDelay = (base: number) => simSpeed === 0 ? 2147483647 : base / simSpeed;
  type Dialogue = { speaker: 'COMMANDER' | 'OPS AGENT' | 'SYSTEM'; text: string };
  let started = $state(false);
  let paused = $state(false);
  let busy = $state(false);
  let turns = $state<Dialogue[]>([]);
  let simMissionId = $state('');
  let decisionTimer: ReturnType<typeof setTimeout> | undefined;
  let runner: ReturnType<typeof setTimeout> | undefined;
  let autoDecision = $state(true);
  const history = HISTORICAL_MISSIONS.sindoor_deep;
  let active = $derived(system.activeMissions.find((mission) => mission.missionId === simMissionId) ?? null);
  let pending = $derived(active?.pendingDecision ?? null);

  function say(speaker: Dialogue['speaker'], text: string) {
    const narrative = parseMapNarrative(text);
    turns = [...turns, { speaker, text: narrative.text }].slice(-30);
    narrateUtterance(narrative.text, { source: speaker, speaker: speaker === 'COMMANDER' ? 'commander' : 'agent', priority: speaker === 'SYSTEM' ? 'critical' : 'info' });
    window.dispatchEvent(new CustomEvent('aircommand:caption', { detail: { source: speaker, text: narrative.text } }));
  }
  function startExercise() {
    if (started) return;
    started = true;
    busy = true;
    say('SYSTEM', 'TRAINING MODE. This runs a historical IAF mission with scripted decision points. You act as commander. Pick branches. See how choices change the outcome. Purpose: practice decision-making under operational pressure.');
    say('SYSTEM', `HISTORICAL TRAINING CASE · ${history.reference} · ${history.date}. Simulation values are illustrative.`);
    say('OPS AGENT', history.narrative);
    system.runScenario('deep_strike');
    system.generateCOAs();
    window.dispatchEvent(new CustomEvent('aircommand:select-right-tab', { detail: 'coa' }));
    runner = setTimeout(() => {
      const mission = system.scenarioMissions.find((item) => item.targetType === history.targetType) ?? system.scenarioMissions[0];
      const aircraft = system.scenarioAircraft.filter((item) => item.status === 'FMC' || item.status === 'PMC').slice(0, 2);
      if (!mission || aircraft.length === 0) {
        say('OPS AGENT', 'The current scenario has no eligible mission and aircraft pair. Choose DEEP STRIKE and check force readiness, then restart the exercise.');
        busy = false;
        return;
      }
      simMissionId = mission.id;
      focusMapElements([{ type: 'aircraft', id: aircraft[0].tailNumber, label: `${aircraft[0].tailNumber} · ${distanceKm(aircraft[0].position, mission.target)} km` }, { type: 'target', id: mission.name, label: mission.name }]);
      say('OPS AGENT', `Review ${aircraft[0].tailNumber} and target ${mission.name} on the map before choosing a branch.`);
      say('COMMANDER', `Review the ${mission.name} package. What is the system recommendation?`);
      say('OPS AGENT', `Course of action generated. ${aircraft.length} available aircraft assigned for this training run. AUTO is ${autoDecision ? 'on' : 'off'}; decision points pause for your review when AUTO is off.`);
      system.startMission(mission.id, aircraft.map((item) => item.id), 'sindoor_deep');
      say('OPS AGENT', `Track @aircraft:${aircraft[0].tailNumber} is moving toward @target:${mission.name}. Monitor the package and target geometry on the tactical picture.`);
      busy = false;
      advanceToDecision();
    }, 900);
  }
  function advanceToDecision() {
    if (paused || busy || !active || active.phase === 'COMPLETE' || active.phase === 'ABORTED') return;
    busy = true;
    say('OPS AGENT', `${active.phase}: advancing the exercise timeline and monitoring fuel, threat geometry, and mission status.`);
    runner = setTimeout(() => {
      system.advanceSimulationClock(0.5);
      busy = false;
      const now = system.activeMissions.find((mission) => mission.missionId === simMissionId);
      if (now?.pendingDecision) {
        say('OPS AGENT', `Decision required: ${now.pendingDecision.title}. I recommend ${now.pendingDecision.branches.find((branch) => /optimal|recommended/i.test(branch.tag))?.label ?? 'the lowest-risk successful option'} based on the displayed course of action.`);
      } else if (now && now.phase !== 'COMPLETE' && now.phase !== 'ABORTED') advanceToDecision();
      else if (now?.phase === 'COMPLETE') say('OPS AGENT', 'Exercise complete. Review the mission log and after-action report for outcomes and decision consequences.');
    }, scaledDelay(6000));
  }
  function weightedBranch(branches: DecisionBranch[]) {
    const weighted = branches.map((branch) => ({ branch, weight: /recommended|optimal/i.test(branch.tag) ? 0.55 : branch.outcome === 'success' ? 0.24 : branch.outcome === 'partial' ? 0.13 : 0.08 }));
    const total = weighted.reduce((sum, item) => sum + item.weight, 0); let roll = Math.random() * total;
    return weighted.find((item) => (roll -= item.weight) <= 0)?.branch ?? branches[0];
  }
  function choose(branchId: string) {
    if (!pending || !branchId) return;
    if (decisionTimer) clearTimeout(decisionTimer);
    const branch = pending.branches.find((item) => item.id === branchId);
    if (!branch) return;
    turns = turns.filter((turn) => !turn.text.startsWith('Decision required:'));
    say('COMMANDER', `Decision: ${branch.label}.`);
    system.resolveDecision(active!.id, branch.id);
    system.pushEvent('SIMULATION', `TRAINING BRANCH · ${branch.label} · ${branch.outcome.toUpperCase()}`, branch.outcome === 'success' ? 'ok' : 'warn');
    say('OPS AGENT', branch.consequence);
    runner = setTimeout(advanceToDecision, scaledDelay(800));
  }
  function togglePause() { paused = !paused; say('OPS AGENT', paused ? 'Simulation paused. The map and mission state remain available for inspection.' : 'Simulation resumed.'); if (!paused) advanceToDecision(); }
  function jumpToMap() { window.dispatchEvent(new CustomEvent('aircommand:diagram-focus', { detail: { bounds: [[72.7, 29.5], [77.2, 34.3]], text: 'Historical training area focused. Track the package route, target marker, and threat geometry as the exercise progresses.' } })); }
  function handleRailDecision(event: Event) {
    const detail = (event as CustomEvent<{ missionId: string }>).detail;
    if (detail.missionId !== active?.missionId) return;
    if (decisionTimer) clearTimeout(decisionTimer);
    runner = setTimeout(advanceToDecision, scaledDelay(800));
  }
  $effect(() => {
    if (open) window.addEventListener('aircommand:rail-decision-resolved', handleRailDecision);
    return () => window.removeEventListener('aircommand:rail-decision-resolved', handleRailDecision);
  });
  $effect(() => {
    const waiting = pending;
    const auto = autoDecision;
    const speed = simSpeed;
    if (decisionTimer) clearTimeout(decisionTimer);
    if (open && auto && waiting && speed !== 0) {
      decisionTimer = setTimeout(() => {
        const latest = system.activeMissions.find((mission) => mission.missionId === simMissionId);
        if (latest?.pendingDecision) choose(weightedBranch(latest.pendingDecision.branches).id);
      }, scaledDelay(6000));
    }
    return () => { if (decisionTimer) clearTimeout(decisionTimer); };
  });
  onDestroy(() => { if (decisionTimer) clearTimeout(decisionTimer); if (runner) clearTimeout(runner); });
  $effect(() => { if (open && !started) startExercise(); });
</script>

{#if open}
  <div class="mode-chip" title="Practice a historical mission and make commander decisions.">[TRAINING]</div>
  <section class="sim" aria-labelledby="sim-title">
      <header><div><span class="eyebrow">AUTONOMOUS TRAINING RUN · HISTORICAL CASE STUDY</span><h2 id="sim-title">OP SINDOOR · DEEP STRIKE</h2><p>{history.date} · {history.targetType.toUpperCase()} · SIMULATED, NOT LIVE DATA</p></div><div class="rail-controls"><button class:active={autoDecision} onclick={() => { autoDecision = !autoDecision; if (!autoDecision && decisionTimer) clearTimeout(decisionTimer); }}>AUTO {autoDecision ? 'ON' : 'OFF'}</button><button class:active={simSpeed === 2} onclick={() => onSpeedChange?.(simSpeed === 2 ? 1 : 2)} aria-label="Toggle 2x speed">⏩ {simSpeed === 2 ? '2x ON' : '2x'}</button><button class="close" aria-label="Close simulation" onclick={() => onClose?.()}>×</button></div></header>
      <div class="story"><strong>MISSION BRIEF</strong><p>{history.narrative}</p><button onclick={jumpToMap}>⌖ FOCUS TRAINING AREA</button></div>
      <div class="body">
        <section class="dialogue" aria-label="Commander and operations agent dialogue">
            {#each turns as turn, index (`${index}-${turn.speaker}`)}<article class:commander={turn.speaker === 'COMMANDER'} class:system={turn.speaker === 'SYSTEM'}><small>{turn.speaker}</small><p>{turn.text}</p></article>{/each}
            {#if pending}<article class="decision-status"><small>DECISION REQUESTED · {pending.atPhase}</small><h3>{pending.title}</h3><p>{pending.message}</p><small class="auto">{autoDecision ? `AUTO SELECTS A WEIGHTED BRANCH IN ${simSpeed === 0 ? 'PAUSED' : `${6 / simSpeed} SECONDS`}` : 'AUTO OFF · SELECT AN OPTION IN THE DECISION PANEL BELOW'}</small></article>{/if}
            {#if active?.phase === 'COMPLETE'}<article class="decision"><small>AFTER ACTION</small><h3>EXERCISE COMPLETE · {active.outcome}</h3><p>Review the map, event log, and mission review for the recorded result.</p></article>{/if}
        </section>
        <aside class="state" role="group" aria-label="Live exercise state"><span>LIVE EXERCISE STATE</span><b>{active?.phase ?? 'BRIEFING'}</b><div class="state-row">SCENARIO <strong>{system.activeScenarioFilter?.replaceAll('_', ' ').toUpperCase() ?? 'GLOBAL'}</strong></div><div class="state-row">AIRCRAFT <strong>{active?.aircraftIds.length ?? '—'}</strong></div><div class="state-row">THREATS <strong>{system.scenarioThreats.length}</strong></div><button onclick={togglePause}>{paused ? '▶ RESUME' : 'Ⅱ PAUSE'}</button><button onclick={advanceToDecision} disabled={!started || busy || !!pending}>ADVANCE EXERCISE</button></aside>
      </div>
      <footer><span>◈ SYSTEM-GUIDED · DECISIONS ARE REVERSIBLE WITHIN THIS TRAINING SESSION</span><button onclick={togglePause}>{paused ? '▶ RESUME' : 'Ⅱ PAUSE'}</button><button onclick={() => onClose?.()}>CLOSE EXERCISE</button></footer>
  </section>
{/if}

<style>
  .mode-chip { width:max-content; margin:6px 12px 0; padding:4px 7px; color:var(--accent-green); border:1px solid var(--accent-green); font:8px var(--font-mono); letter-spacing:.1em; }
  .sim { width:100%; min-height:100%; display:flex; flex-direction:column; overflow:visible; color:var(--text-primary); background:var(--bg-panel); font-family:var(--font-mono); }
  header { display:flex; justify-content:space-between; align-items:start; gap:8px; padding:12px; border-bottom:1px solid var(--border-subtle); background:color-mix(in srgb, var(--accent-cyan) 3%, transparent); } .eyebrow, .state>span { color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.12em; } h2 { margin:7px 0 2px; font:600 15px var(--font-mono); letter-spacing:.05em; } header p { margin:0; color:var(--text-muted); font:8px var(--font-mono); letter-spacing:.08em; } .close { border:0; color:var(--text-muted); background:transparent; font-size:20px; cursor:pointer; }
  .rail-controls { flex:none; display:flex; gap:4px; }
  .rail-controls button { padding:5px; background:transparent; border:1px solid var(--border-subtle); color:var(--text-muted); font:7px var(--font-mono); cursor:pointer; }
  .rail-controls button.active { color:var(--accent-green); border-color:var(--accent-green); }
  .story { padding:12px 20px; border-bottom:1px solid var(--border-subtle); background:color-mix(in srgb, var(--accent-amber) 3.5000000000000004%, transparent); } .story strong { color:var(--accent-amber); font:9px var(--font-mono); letter-spacing:.16em; } .story p { max-width:1000px; margin:5px 0 8px; color:var(--text-secondary); font:12px/1.5 var(--font-sans); } button { cursor:pointer; } .story button,.state button,.sim footer button { padding:7px 9px; border:1px solid var(--border-strong); background:transparent; color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.08em; }
  .body { flex:1; min-height:0; display:flex; flex-direction:column; } .dialogue { overflow:visible; padding:12px; } article { margin:0 0 8px; padding:9px 10px; border-left:2px solid var(--accent-cyan); background:color-mix(in srgb, var(--accent-cyan) 3%, transparent); } article.commander { margin-left:auto; border-left:0; border-right:2px solid var(--accent-amber); background:color-mix(in srgb, var(--accent-amber) 3%, transparent); } article.system { border-color:var(--accent-amber); } article small { color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.14em; } article.commander small { color:var(--accent-amber); } article p { margin:5px 0 0; color:var(--text-secondary); font:11px/1.45 var(--font-sans); } h3 { margin:5px 0; font:600 14px var(--font-mono); } .auto { display:block; margin:8px 10px; color:var(--accent-amber); font:8px/1.4 var(--font-mono); }
  .state { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; padding:12px; border-top:1px solid var(--border-subtle); background:rgba(0,0,0,.14); } .state>span,.state>b { grid-column:1/-1; } .state>b { font:600 16px var(--font-mono); color:var(--accent-green); } .state-row { display:flex; justify-content:space-between; gap:5px; color:var(--text-muted); font:7px var(--font-mono); } .state-row strong { color:var(--text-primary); text-align:right; } .state button:disabled { opacity:.4; cursor:not-allowed; }
  .view-3d { flex:1; min-height:0; display:flex; flex-direction:column; position:relative; }
  .view-3d-controls { position:absolute; top:12px; left:12px; right:12px; display:flex; justify-content:space-between; align-items:center; gap:12px; z-index:10; }
  .view-3d-controls button { padding:8px 12px; background:rgba(5,8,15,.9); border:1px solid var(--accent-cyan); color:var(--accent-cyan); font:9px var(--font-mono); cursor:pointer; }
  .view-3d-info { display:flex; gap:16px; padding:8px 12px; background:rgba(5,8,15,.9); border:1px solid var(--border-subtle); font:9px var(--font-mono); color:var(--text-secondary); }
  .view-3d-info span { color:var(--accent-cyan); }
  footer { display:flex; justify-content:space-between; align-items:center; gap:5px; padding:9px 10px; border-top:1px solid var(--border-subtle); } footer span { margin-right:auto; color:var(--text-muted); font:7px var(--font-mono); letter-spacing:.05em; }
  @media(max-width:760px) { footer { flex-wrap:wrap; } footer span { width:100%; } }
</style>

