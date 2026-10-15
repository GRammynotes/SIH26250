<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { SCENARIO_LABELS } from '../../engine/scenario';
  const phases = ['INGRESS', 'WEZ', 'RELEASE', 'EGRESS', 'RTB'];
  const inputs = [
    ['IACCS FEED', 'RADAR + AWACS + UAV'], ['SATELLITE INTEL', 'IMAGERY + SIGINT'],
    ['WEATHER SERVICE', 'METOC DATA'], ['AIRSPACE AUTHORITY', 'CORRIDOR STATUS'],
    ['BASE OPS', 'AIRCRAFT STATUS'], ['CREW SCHEDULING', 'REST + QUALIFICATION'],
  ];
  const processing = [
    ['MULTI-SOURCE FUSION', '6 → 1 unified picture'], ['WEAPONEERING ENGINE', '14 weapons × 6 platforms'],
    ['RULE-BASED ALLOCATION', '3 ranked COAs'], ['BAYESIAN THREAT ASSESS', 'enemy intent posterior'],
    ['GAME-THEORY COMPARISON', 'enemy best-response'],
  ];
  const outputs = [
    ['RANKED COAs', '3 options · trade-offs explained'], ['MISSION TASKING', 'aircraft-to-target assignment'],
    ['EXECUTION ORDER', 'ATO-like briefing'], ['AFTER-ACTION', 'decisions · BDA · metrics'],
  ];
  let openInputs = $state(false); let openProcessing = $state(false); let openOutputs = $state(false);
  let now = $state(Date.now());
  const mission = $derived(system.activeMissions.at(-1) ?? null);
  const missionName = $derived(mission?.missionName ?? system.missions[0]?.name ?? 'NO MISSION SELECTED');
  const degraded = $derived(system.activeScenarioFilter === 'radar_loss' || system.mode === 'DEGRADED');
  const elapsed = $derived(mission ? Math.max(0, Math.floor((now - mission.phaseStartTime) / 1000)) : 0);
  const clock = $derived(`T+${String(Math.floor(elapsed / 60)).padStart(2,'0')}:${String(elapsed % 60).padStart(2,'0')}`);
  const activeIndex = $derived(mission ? phases.indexOf(mission.phase) : -1);
  $effect(() => { const timer = window.setInterval(() => now = Date.now(), 1000); return () => window.clearInterval(timer); });
  function phaseState(index: number) { if (activeIndex < 0) return 'pending'; if (index < activeIndex || mission?.phase === 'COMPLETE') return 'complete'; if (index === activeIndex) return 'active'; return 'pending'; }
</script>

<section class="flow" aria-label="Mission input and output flow">
  <header><span>MISSION SYSTEM FLOW</span><small title={missionName}>{missionName.toUpperCase()}</small></header>
  <details open={openInputs} ontoggle={(e) => openInputs = (e.currentTarget as HTMLDetailsElement).open}><summary>INPUT SOURCES <span>6 CONNECTED</span></summary><div class="rows">{#each inputs as [name, value]}<div class="row"><i class:warn={degraded && name === 'IACCS FEED'}></i><div class="detail"><b>{name}</b><span>{value}</span></div><strong class:warn={degraded && name === 'IACCS FEED'}>{degraded && name === 'IACCS FEED' ? 'DEGRADED' : 'LIVE'}</strong></div>{/each}</div></details>
  <details open={openProcessing} ontoggle={(e) => openProcessing = (e.currentTarget as HTMLDetailsElement).open}><summary>SYSTEM PROCESSING <span>5 ENGINES</span></summary><div class="rows">{#each processing as [name, value]}<div class="row"><i></i><div class="detail"><b>{name}</b><span>{value}</span></div><strong>READY</strong></div>{/each}</div></details>
  <details open={openOutputs} ontoggle={(e) => openOutputs = (e.currentTarget as HTMLDetailsElement).open}><summary>COMMANDER OUTPUTS <span>4 PRODUCTS</span></summary><div class="rows">{#each outputs as [name, value]}<div class="row"><i></i><div class="detail"><b>{name}</b><span>{value}</span></div><strong>{name === 'RANKED COAs' ? system.coas.length + ' OPTIONS' : 'AVAILABLE'}</strong></div>{/each}</div></details>
  <section class="timeline"><h3>MISSION EXECUTION TIMELINE <span>{clock}</span></h3><div class="steps">{#each phases as phase, i}<div class="step" class:complete={phaseState(i)==='complete'} class:active={phaseState(i)==='active'}><i></i><b>{phase}</b><small>{phaseState(i)==='complete'?'COMPLETE':phaseState(i)==='active'?'ACTIVE':'PENDING'}</small></div>{/each}</div></section>
  <footer title={`SIMULATED TRAINING DATA · ACTIVE SCENARIO: ${SCENARIO_LABELS[system.activeScenarioFilter ?? ''] ?? 'GLOBAL VIEW'}`}>EXERCISE · {SCENARIO_LABELS[system.activeScenarioFilter ?? ''] ?? 'GLOBAL'}</footer>
</section>

<style>
  .flow{height:100%;overflow:auto;background:var(--bg-panel);color:var(--text-primary);font:9px var(--font-mono);padding:10px;display:flex;flex-direction:column;gap:8px}header,summary,h3{display:flex;justify-content:space-between;gap:8px;align-items:center}header{color:var(--accent-cyan);letter-spacing:.12em;padding:2px 0 8px;border-bottom:1px solid var(--border-subtle)}small,.row span,footer{color:var(--text-muted)}details{border:1px solid var(--border-subtle);background:var(--bg-base)}summary{cursor:pointer;list-style:none;padding:9px;color:var(--accent-cyan);letter-spacing:.08em}summary::-webkit-details-marker{display:none}summary span{color:var(--text-muted);font-size:8px}.rows{padding:0 8px 7px}.row{display:grid;grid-template-columns:7px minmax(0,1fr) auto;align-items:center;gap:7px;min-height:34px;border-top:1px solid var(--border-subtle)}.row i{width:6px;height:6px;border-radius:50%;background:var(--accent-green);box-shadow:0 0 5px currentColor}.row i.warn{background:var(--accent-amber)}.detail{min-width:0;display:flex;flex-direction:column;gap:3px}.row b{font-size:8px;letter-spacing:.04em}.row span{font-size:8px}.row strong{color:var(--accent-green);font-size:7px;white-space:nowrap}.row strong.warn{color:var(--accent-amber)}.timeline{margin-top:auto;border:1px solid var(--border-subtle);padding:9px}h3{font-size:8px;color:var(--accent-cyan);letter-spacing:.08em;margin:0 0 10px}h3 span{color:var(--accent-amber)}.steps{display:grid;grid-template-columns:repeat(5,1fr);position:relative}.steps:before{content:'';position:absolute;left:5%;right:5%;top:4px;border-top:1px solid var(--border-strong)}.step{position:relative;display:flex;align-items:center;flex-direction:column;gap:5px;text-align:center}.step i{width:9px;height:9px;border:1px solid var(--text-muted);background:var(--bg-panel);z-index:1;border-radius:50%}.step b{font-size:7px}.step small{font-size:6px}.step.complete i{background:var(--accent-green);border-color:var(--accent-green)}.step.complete b,.step.complete small{color:var(--accent-green)}.step.active i{background:var(--accent-amber);border-color:var(--accent-amber);box-shadow:0 0 8px var(--accent-amber)}.step.active b,.step.active small{color:var(--accent-amber)}footer{font-size:7px;letter-spacing:.08em}
</style>
