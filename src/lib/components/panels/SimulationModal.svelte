<script lang="ts">
  import { onDestroy } from 'svelte';
  import { system } from '../../stores/systemStore.svelte';
  import { narrateUtterance } from '../../engine/voice';
  import { HISTORICAL_MISSIONS } from '../../data/historicalMissions';

  let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props();
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
  let selectedBranch = $derived(pending?.branches.find((branch) => /optimal|recommended/i.test(branch.tag)) ?? pending?.branches.find((branch) => branch.outcome === 'success') ?? pending?.branches[0] ?? null);

  function say(speaker: Dialogue['speaker'], text: string) {
    turns = [...turns, { speaker, text }].slice(-30);
    narrateUtterance(text, { source: speaker, speaker: speaker === 'COMMANDER' ? 'commander' : 'agent', priority: speaker === 'SYSTEM' ? 'critical' : 'info' });
  }
  function startExercise() {
    if (started) return;
    started = true;
    busy = true;
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
      say('COMMANDER', `Review the ${mission.name} package. What is the system recommendation?`);
      say('OPS AGENT', `Course of action generated. ${aircraft.length} available aircraft assigned for this training run. I will pause at each historical decision point for your review.`);
      system.startMission(mission.id, aircraft.map((item) => item.id), 'sindoor_deep');
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
        if (autoDecision) decisionTimer = setTimeout(() => { if (now.pendingDecision) choose(selectedBranch?.id ?? now.pendingDecision.branches[0]?.id); }, 4500);
      } else if (now && now.phase !== 'COMPLETE' && now.phase !== 'ABORTED') advanceToDecision();
      else if (now?.phase === 'COMPLETE') say('OPS AGENT', 'Exercise complete. Review the mission log and after-action report for outcomes and decision consequences.');
    }, 1150);
  }
  function choose(branchId: string) {
    if (!pending || !branchId) return;
    if (decisionTimer) clearTimeout(decisionTimer);
    const branch = pending.branches.find((item) => item.id === branchId);
    if (!branch) return;
    say('COMMANDER', `Decision: ${branch.label}.`);
    system.resolveDecision(active!.id, branch.id);
    say('OPS AGENT', branch.consequence);
    runner = setTimeout(advanceToDecision, 800);
  }
  function togglePause() { paused = !paused; say('OPS AGENT', paused ? 'Simulation paused. The map and mission state remain available for inspection.' : 'Simulation resumed.'); if (!paused) advanceToDecision(); }
  function jumpToMap() { window.dispatchEvent(new CustomEvent('aircommand:diagram-focus', { detail: { bounds: [[72.7, 29.5], [77.2, 34.3]], text: 'Historical training area focused. Track the package route, target marker, and threat geometry as the exercise progresses.' } })); }
  onDestroy(() => { if (decisionTimer) clearTimeout(decisionTimer); if (runner) clearTimeout(runner); });
</script>

{#if open}
  <div class="backdrop" role="presentation">
    <section class="sim" role="dialog" aria-modal="true" aria-labelledby="sim-title">
      <header><div><span class="eyebrow">AUTONOMOUS TRAINING RUN · HISTORICAL CASE STUDY</span><h2 id="sim-title">OP SINDOOR · DEEP STRIKE</h2><p>{history.date} · {history.targetType.toUpperCase()} · SIMULATED, NOT LIVE DATA</p></div><button class="close" aria-label="Close simulation" onclick={() => onClose?.()}>×</button></header>
      <div class="story"><strong>MISSION BRIEF</strong><p>{history.narrative}</p><button onclick={jumpToMap}>⌖ FOCUS TRAINING AREA</button></div>
      <div class="body">
        <section class="dialogue" aria-label="Commander and operations agent dialogue">
            {#each turns as turn, index (`${index}-${turn.speaker}`)}<article class:commander={turn.speaker === 'COMMANDER'} class:system={turn.speaker === 'SYSTEM'}><small>{turn.speaker}</small><p>{turn.text}</p></article>{/each}
            {#if pending}<article class="decision"><small>COMMANDER DECISION · {pending.atPhase}</small><h3>{pending.title}</h3><p>{pending.message}</p><div class="choices">{#each pending.branches as branch (branch.id)}<button class:recommended={branch.id === selectedBranch?.id} onclick={() => choose(branch.id)}><b>{branch.label}{branch.id === selectedBranch?.id ? ' · SYSTEM RECOMMENDATION' : ''}</b><span>{branch.description}</span></button>{/each}</div><small class="auto">{autoDecision ? 'AUTO-SELECTING RECOMMENDATION IN 4.5 SEC · CLICK TO OVERRIDE' : 'COMMANDER SELECTION REQUIRED'}</small></article>{/if}
            {#if active?.phase === 'COMPLETE'}<article class="decision"><small>AFTER ACTION</small><h3>EXERCISE COMPLETE · {active.outcome}</h3><p>Review the map, event log, and mission review for the recorded result.</p></article>{/if}
        </section>
        <aside class="state" role="group" aria-label="Live exercise state"><span>LIVE EXERCISE STATE</span><b>{active?.phase ?? 'BRIEFING'}</b><div class="state-row">SCENARIO <strong>{system.activeScenarioFilter?.replaceAll('_', ' ').toUpperCase() ?? 'GLOBAL'}</strong></div><div class="state-row">AIRCRAFT <strong>{active?.aircraftIds.length ?? '—'}</strong></div><div class="state-row">THREATS <strong>{system.scenarioThreats.length}</strong></div><button onclick={() => autoDecision = !autoDecision}>{autoDecision ? 'AUTO DECISIONS ON' : 'AUTO DECISIONS OFF'}</button><button onclick={togglePause}>{paused ? '▶ RESUME' : 'Ⅱ PAUSE'}</button><button onclick={advanceToDecision} disabled={!started || busy || !!pending}>ADVANCE EXERCISE</button></aside>
      </div>
      <footer><span>◈ SYSTEM-GUIDED · DECISIONS ARE REVERSIBLE WITHIN THIS TRAINING SESSION</span><button onclick={() => onClose?.()}>CLOSE EXERCISE</button>{#if !started}<button class="start" onclick={startExercise}>▶ START SIMULATION</button>{/if}</footer>
    </section>
  </div>
{/if}

<style>
  .backdrop { position:fixed; inset:0; z-index:310; display:grid; place-items:center; padding:16px; background:rgba(3,6,12,.88); backdrop-filter:blur(5px); }
  .sim { width:min(1180px,96vw); height:min(900px,94vh); display:flex; flex-direction:column; overflow:hidden; color:var(--text-primary); background:var(--bg-panel); border:1px solid var(--accent-cyan); box-shadow:0 0 55px rgba(0,212,255,.16); font-family:var(--font-sans); }
  header { display:flex; justify-content:space-between; align-items:start; padding:16px 20px; border-bottom:1px solid var(--border-subtle); background:rgba(0,212,255,.035); } .eyebrow, .state>span { color:var(--accent-cyan); font:9px var(--font-mono); letter-spacing:.18em; } h2 { margin:7px 0 2px; font:600 19px var(--font-mono); letter-spacing:.08em; } header p { margin:0; color:var(--text-muted); font:9px var(--font-mono); letter-spacing:.12em; } .close { border:0; color:var(--text-muted); background:transparent; font-size:26px; cursor:pointer; }
  .story { padding:12px 20px; border-bottom:1px solid var(--border-subtle); background:rgba(255,184,0,.035); } .story strong { color:var(--accent-amber); font:9px var(--font-mono); letter-spacing:.16em; } .story p { max-width:1000px; margin:5px 0 8px; color:var(--text-secondary); font:12px/1.5 var(--font-sans); } button { cursor:pointer; } .story button,.state button,.sim footer button { padding:7px 9px; border:1px solid var(--border-strong); background:transparent; color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.08em; }
  .body { flex:1; min-height:0; display:grid; grid-template-columns:minmax(0,1fr) 210px; } .dialogue { overflow:auto; padding:14px 18px; } article { max-width:860px; margin:0 0 10px; padding:10px 12px; border-left:2px solid var(--accent-cyan); background:rgba(0,212,255,.035); } article.commander { margin-left:auto; border-left:0; border-right:2px solid var(--accent-amber); background:rgba(255,184,0,.035); } article.system { border-color:var(--accent-amber); } article small { color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.14em; } article.commander small { color:var(--accent-amber); } article p { margin:5px 0 0; color:var(--text-secondary); font:12px/1.5 var(--font-sans); } article.decision { border:1px solid var(--accent-amber); background:rgba(255,184,0,.035); } h3 { margin:5px 0; font:600 14px var(--font-mono); } .choices { display:grid; gap:6px; margin-top:8px; } .choices button { display:flex; flex-direction:column; gap:5px; padding:8px; color:var(--text-secondary); text-align:left; background:rgba(5,8,15,.7); border:1px solid var(--border-subtle); } .choices button:hover,.choices button.recommended { border-color:var(--accent-green); } .choices b { font:9px var(--font-mono); color:var(--text-primary); } .choices span,.auto { font:10px/1.4 var(--font-sans); color:var(--text-muted); } .auto { display:block; margin-top:8px; color:var(--accent-amber); }
  .state { display:flex; flex-direction:column; gap:12px; padding:16px 12px; border-left:1px solid var(--border-subtle); background:rgba(0,0,0,.14); } .state>b { font:600 18px var(--font-mono); color:var(--accent-green); } .state-row { display:flex; justify-content:space-between; gap:8px; color:var(--text-muted); font:8px var(--font-mono); } .state-row strong { color:var(--text-primary); text-align:right; } .state button:disabled { opacity:.4; cursor:not-allowed; }
  .view-3d { flex:1; min-height:0; display:flex; flex-direction:column; position:relative; }
  .view-3d-controls { position:absolute; top:12px; left:12px; right:12px; display:flex; justify-content:space-between; align-items:center; gap:12px; z-index:10; }
  .view-3d-controls button { padding:8px 12px; background:rgba(5,8,15,.9); border:1px solid var(--accent-cyan); color:var(--accent-cyan); font:9px var(--font-mono); cursor:pointer; }
  .view-3d-info { display:flex; gap:16px; padding:8px 12px; background:rgba(5,8,15,.9); border:1px solid var(--border-subtle); font:9px var(--font-mono); color:var(--text-secondary); }
  .view-3d-info span { color:var(--accent-cyan); }
  footer { display:flex; justify-content:space-between; align-items:center; gap:8px; padding:10px 14px; border-top:1px solid var(--border-subtle); } footer span { margin-right:auto; color:var(--text-muted); font:8px var(--font-mono); letter-spacing:.08em; } .sim footer button.start { color:var(--accent-green); border-color:var(--accent-green); }
  @media(max-width:760px) { .body { grid-template-columns:1fr; grid-template-rows:minmax(0,1fr) auto; } .state { display:grid; grid-template-columns:repeat(2,1fr); border-left:0; border-top:1px solid var(--border-subtle); } .state>span,.state>b { grid-column:span 2; } footer { flex-wrap:wrap; } footer span { width:100%; } }
</style>
