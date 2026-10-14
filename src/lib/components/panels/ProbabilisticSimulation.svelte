<script lang="ts">
  import { narrateUtterance } from '../../engine/voice';
  import { HISTORICAL_MISSIONS } from '../../data/historicalMissions';
  let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props();
  let caseId = $state<keyof typeof HISTORICAL_MISSIONS>('sindoor_deep');
  let selectedOutcome = $state<number | null>(null);
  const cases = Object.values(HISTORICAL_MISSIONS);
  const scenarios = {
    balakot: [{ name: 'TARGET DESTROYED', chance: 72, consequence: 'Primary target effect achieved; package returns for full BDA correlation.' }, { name: 'TARGET DAMAGED', chance: 22, consequence: 'Partial effect; commander reviews re-attack options and collateral assessment.' }, { name: 'TARGET MISSED', chance: 6, consequence: 'No confirmed effect; preserve the force and reassess intelligence.' }],
    sindoor_deep: [{ name: 'TARGET DESTROYED', chance: 68, consequence: 'Standoff strike achieves the assessed effect; package remains outside the engagement zone.' }, { name: 'TARGET DAMAGED', chance: 25, consequence: 'Partial effect; refine targeting data before any follow-on.' }, { name: 'TARGET MISSED', chance: 7, consequence: 'No confirmed effect; review weapon updates and target coordinates.' }],
    sead_suppression: [{ name: 'RADAR SUPPRESSED', chance: 64, consequence: 'Threat emission ceases and the follow-on corridor opens.' }, { name: 'RADAR DEGRADED', chance: 27, consequence: 'Coverage is reduced, but the radar may recover.' }, { name: 'RADAR RELOCATED', chance: 9, consequence: 'Last-known coordinates are empty; update the threat picture.' }],
  } as const;
  const activeCase = $derived(HISTORICAL_MISSIONS[caseId]);
  const outcomes = $derived(scenarios[caseId]);
  function simulate() {
    const roll = Math.random() * 100; let total = 0;
    selectedOutcome = outcomes.findIndex((item) => { total += item.chance; return roll < total; });
    const result = outcomes[selectedOutcome];
    narrateUtterance(`Simulation branch selected: ${result.name}. ${result.consequence}`, { source: 'SIMULATION', speaker: 'agent' });
    window.dispatchEvent(new CustomEvent('aircommand:focus', { detail: { selector: '.outcome-card.selected', duration: 5000, text: result.name } }));
    window.dispatchEvent(new CustomEvent('aircommand:caption', { detail: { source: 'SIMULATION', text: `${result.name} · ${result.chance}% modeled probability` } }));
  }
</script>

{#if open}<div class="backdrop"><section class="sim" role="dialog" aria-modal="true" aria-labelledby="sim-title"><header><div><span>PROBABILISTIC BRANCH SIMULATION · TRAINING DATA</span><h2 id="sim-title">OUTCOME EXPLORER</h2></div><button class="close" onclick={() => onClose?.()}>×</button></header><label>HISTORICAL CASE<select bind:value={caseId} onchange={() => selectedOutcome = null}>{#each cases as item (item.id)}<option value={item.id}>{item.reference}</option>{/each}</select></label><p class="narrative">{activeCase.narrative}</p><div class="branches">{#each outcomes as outcome, index}<article class="outcome-card" class:selected={selectedOutcome === index}><div><b>{outcome.name}</b><strong>{outcome.chance}%</strong></div><p>{outcome.consequence}</p>{#if selectedOutcome === index}<small>SIMULATED BRANCH SELECTED</small>{/if}</article>{/each}</div><div class="foot"><span>ILLUSTRATIVE PROBABILITIES · NOT OPERATIONAL PREDICTIONS</span><button onclick={simulate}>◈ {selectedOutcome === null ? 'SIMULATE OUTCOME' : 'REPLAY WITH NEW BRANCH'}</button><button onclick={() => onClose?.()}>EXIT SIM</button></div></section></div>{/if}

<style>
  .backdrop{position:fixed;inset:0;z-index:320;display:grid;place-items:center;padding:16px;background:#03060ced;backdrop-filter:blur(5px)}.sim{width:min(800px,96vw);max-height:92vh;overflow:auto;background:var(--bg-panel);border:1px solid var(--accent-cyan);color:var(--text-primary);padding:20px;font-family:var(--font-mono);box-shadow:0 0 45px var(--accent-cyan)22}header{display:flex;justify-content:space-between;align-items:start;border-bottom:1px solid var(--border-subtle);padding-bottom:12px}header span,label{font-size:8px;letter-spacing:.12em;color:var(--accent-cyan)}h2{font-size:19px;margin:6px 0}.close{background:none;border:0;color:var(--text-muted);font-size:24px;cursor:pointer}label{display:grid;gap:7px;margin:15px 0}select{padding:9px;background:var(--bg-base);border:1px solid var(--border-strong);color:var(--text-primary);font:10px var(--font-mono)}.narrative{font:12px/1.6 var(--font-sans);color:var(--text-secondary)}.branches{display:grid;gap:8px}.outcome-card{padding:12px;border:1px solid var(--border-subtle);background:var(--bg-base)}.outcome-card.selected{border-color:var(--accent-green);box-shadow:inset 0 0 12px var(--accent-green)18}.outcome-card>div{display:flex;justify-content:space-between;gap:12px}.outcome-card b{font-size:10px}.outcome-card strong{font-size:18px;color:var(--accent-amber)}.outcome-card p{font:11px/1.5 var(--font-sans);color:var(--text-secondary);margin:6px 0 0}.outcome-card small{display:block;color:var(--accent-green);margin-top:7px;font-size:8px}.foot{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap;border-top:1px solid var(--border-subtle);margin-top:14px;padding-top:12px}.foot span{margin-right:auto;color:var(--text-muted);font-size:7px}.foot button{padding:8px;color:var(--accent-cyan);background:transparent;border:1px solid var(--border-strong);font:8px var(--font-mono);cursor:pointer}
</style>
