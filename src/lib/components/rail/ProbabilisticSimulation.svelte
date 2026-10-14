<script lang="ts">
  import { narrateUtterance } from '../../engine/voice';
  import { onDestroy } from 'svelte';
  import { HISTORICAL_MISSIONS } from '../../data/historicalMissions';
  let { open = false, speed2x = false, onSpeedToggle, onClose }: { open?: boolean; speed2x?: boolean; onSpeedToggle?: () => void; onClose?: () => void } = $props();
  let autoEnabled = $state(true);
  let caseId = $state<keyof typeof HISTORICAL_MISSIONS>('sindoor_deep');
  let selectedOutcome = $state<number | null>(null);
  let runCount = $state(0);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cases = Object.values(HISTORICAL_MISSIONS);
  const scenarios = {
    balakot: [{ name: 'TARGET DESTROYED', chance: 72, consequence: 'Primary target effect achieved; package returns for full BDA correlation.' }, { name: 'TARGET DAMAGED', chance: 22, consequence: 'Partial effect; commander reviews re-attack options and collateral assessment.' }, { name: 'TARGET MISSED', chance: 6, consequence: 'No confirmed effect; preserve the force and reassess intelligence.' }],
    sindoor_deep: [{ name: 'TARGET DESTROYED', chance: 68, consequence: 'Standoff strike achieves the assessed effect; package remains outside the engagement zone.' }, { name: 'TARGET DAMAGED', chance: 25, consequence: 'Partial effect; refine targeting data before any follow-on.' }, { name: 'TARGET MISSED', chance: 7, consequence: 'No confirmed effect; review weapon updates and target coordinates.' }],
    sead_suppression: [{ name: 'RADAR SUPPRESSED', chance: 64, consequence: 'Threat emission ceases and the follow-on corridor opens.' }, { name: 'RADAR DEGRADED', chance: 27, consequence: 'Coverage is reduced, but the radar may recover.' }, { name: 'RADAR RELOCATED', chance: 9, consequence: 'Last-known coordinates are empty; update the threat picture.' }],
  } as const;
  const activeCase = $derived(HISTORICAL_MISSIONS[caseId]);
  const outcomes = $derived(scenarios[caseId]);
  function simulate(forcedIndex?: number) {
    const roll = forcedIndex === undefined ? Math.random() * 100 : 0; let total = 0;
    selectedOutcome = forcedIndex ?? outcomes.findIndex((item) => { total += item.chance; return roll < total; });
    const result = outcomes[selectedOutcome];
    runCount++;
    narrateUtterance(`Simulation branch selected: ${result.name}. ${result.consequence}`, { source: 'SIMULATION', speaker: 'agent' });
    window.dispatchEvent(new CustomEvent('aircommand:diagram-focus', { detail: { bounds: [[72.7, 29.5], [77.2, 34.3]], text: `${result.name}. ${result.consequence}` } }));
    window.dispatchEvent(new CustomEvent('aircommand:caption', { detail: { source: 'SIMULATION', text: `${result.name} · ${result.chance}% modeled probability` } }));
  }
  $effect(() => {
    runCount;
    if (timer) clearTimeout(timer);
    if (open && autoEnabled) timer = setTimeout(() => { simulate(); }, speed2x ? 3000 : 6000);
  });
  onDestroy(() => { if (timer) clearTimeout(timer); });
</script>

{#if open}<section class="sim" aria-labelledby="sim-title"><header><div><span>PROBABILISTIC BRANCH SIMULATION · TRAINING DATA</span><h2 id="sim-title">OUTCOME EXPLORER</h2></div><div class="controls"><button class:active={autoEnabled} onclick={() => autoEnabled = !autoEnabled}>AUTO {autoEnabled ? 'ON' : 'OFF'}</button><button class:active={speed2x} onclick={() => onSpeedToggle?.()} aria-label="Toggle 2x speed">⏩ {speed2x ? '2x ON' : '2x'}</button><button class="close" onclick={() => onClose?.()}>×</button></div></header><label>HISTORICAL CASE<select bind:value={caseId} onchange={() => selectedOutcome = null}>{#each cases as item (item.id)}<option value={item.id}>{item.reference}</option>{/each}</select></label><p class="narrative">{activeCase.narrative}</p><div class="run-state">{autoEnabled ? `AUTO ADVANCE · NEXT BRANCH IN ${speed2x ? '3' : '6'} SEC` : 'AUTO OFF · SELECT A BRANCH'} · RUN {runCount + (selectedOutcome === null ? 0 : 1)}</div><div class="branches">{#each outcomes as outcome, index}<article class="outcome-card" class:selected={selectedOutcome === index}><div><b>{outcome.name}</b><strong>{outcome.chance}%</strong></div><p>{outcome.consequence}</p>{#if selectedOutcome === index}<small>SIMULATED BRANCH SELECTED</small>{/if}{#if !autoEnabled}<button class="pick" onclick={() => simulate(index)}>SELECT BRANCH</button>{/if}</article>{/each}</div><div class="foot"><span>ILLUSTRATIVE PROBABILITIES · NOT OPERATIONAL PREDICTIONS</span><button onclick={() => simulate()}>◈ RUN BRANCH NOW</button><button onclick={() => onClose?.()}>EXIT SIM</button></div></section>{/if}

<style>
  .sim{width:100%;padding:10px;color:var(--text-primary);font-family:var(--font-mono)}header{display:flex;justify-content:space-between;align-items:start;gap:5px;border-bottom:1px solid var(--border-subtle);padding-bottom:10px}header span,label{font-size:7px;letter-spacing:.1em;color:var(--accent-cyan)}h2{font-size:15px;margin:6px 0}.controls{display:flex;gap:3px}.controls button{padding:5px;color:var(--text-muted);background:transparent;border:1px solid var(--border-subtle);font:7px var(--font-mono);cursor:pointer}.controls button.active{color:var(--accent-green);border-color:var(--accent-green)}.close{background:none;border:0;color:var(--text-muted);font-size:18px;cursor:pointer}label{display:grid;gap:6px;margin:12px 0}select{padding:8px;background:var(--bg-base);border:1px solid var(--border-strong);color:var(--text-primary);font:9px var(--font-mono);max-width:100%}.narrative{font:11px/1.5 var(--font-sans);color:var(--text-secondary)}.run-state{margin:8px 0;color:var(--accent-amber);font:7px var(--font-mono);letter-spacing:.08em}.branches{display:grid;gap:7px}.outcome-card{padding:9px;border:1px solid var(--border-subtle);background:var(--bg-base)}.outcome-card.selected{border-color:var(--accent-green);box-shadow:inset 0 0 12px var(--accent-green)18}.outcome-card>div{display:flex;justify-content:space-between;gap:8px}.outcome-card b{font-size:9px}.outcome-card strong{font-size:16px;color:var(--accent-amber)}.outcome-card p{font:10px/1.4 var(--font-sans);color:var(--text-secondary);margin:6px 0 0}.outcome-card small{display:block;color:var(--accent-green);margin-top:7px;font-size:7px}.pick,.foot button{padding:7px;color:var(--accent-cyan);background:transparent;border:1px solid var(--border-strong);font:7px var(--font-mono);cursor:pointer}.pick{margin-top:7px}.foot{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap;border-top:1px solid var(--border-subtle);margin-top:12px;padding-top:10px}.foot span{margin-right:auto;color:var(--text-muted);font-size:6px}
</style>
