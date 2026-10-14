<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { SCENARIO_LABELS } from '../../engine/scenario';
  let { onToggleVisibility }: { onToggleVisibility?: () => void } = $props();

  const scenarios = Object.entries(SCENARIO_LABELS);
  function select(key: string | null) {
    if (key && system.activeScenarioFilter !== key) system.runScenario(key);
    else system.setScenarioFilter(null);
  }
</script>

<nav class="scenario-bar" aria-label="Console scenarios">
  <strong>SCENARIO FILTER</strong>
  <button class:active={!system.activeScenarioFilter} aria-pressed={!system.activeScenarioFilter} onclick={() => select(null)}><span aria-hidden="true">◉</span> GLOBAL VIEW</button>
  {#each scenarios as [key, label] (key)}
    <button class:active={system.activeScenarioFilter === key} aria-pressed={system.activeScenarioFilter === key} onclick={() => select(key)}><span aria-hidden="true">{key === 'aircraft_nmc' ? '◌' : key.includes('strike') || key === 'sead_campaign' ? '⌁' : '◈'}</span> {label}</button>
  {/each}
  <button class="visibility-toggle" aria-label="Hide scenario bar" title="Hide scenario bar" onclick={() => onToggleVisibility?.()}>◉</button>
</nav>

<style>
  .scenario-bar { display:flex; align-items:center; gap:5px; min-height:37px; overflow-x:auto; padding:4px 10px; background:var(--bg-panel); border-bottom:1px solid var(--border-subtle); scrollbar-width:thin; }
  strong { flex:none; color:var(--text-muted); font:8px var(--font-mono); letter-spacing:.12em; padding:0 6px; }.visibility-toggle { margin-left:auto; color:var(--accent-cyan); }
  button { flex:0 0 auto; min-height:27px; padding:4px 9px; border:1px solid var(--border-subtle); color:var(--text-muted); background:transparent; font:9px var(--font-mono); letter-spacing:.08em; cursor:pointer; transition:color .18s,border-color .18s,box-shadow .18s; }
  button:hover,button:focus-visible { color:var(--accent-cyan); border-color:var(--accent-cyan); outline:none; }
  button.active { color:var(--accent-cyan); border-color:var(--accent-cyan); box-shadow:0 0 10px rgba(0,212,255,.2); animation:scenario-pulse 1.7s ease-in-out infinite; }
  button span { margin-right:4px; }
  @keyframes scenario-pulse { 50% { box-shadow:0 0 2px rgba(0,212,255,.15); } }
</style>
