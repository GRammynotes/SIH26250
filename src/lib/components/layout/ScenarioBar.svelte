<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { SCENARIO_LABELS } from '../../engine/scenario';
  let { onToggleVisibility, collapsed = false }: { onToggleVisibility?: () => void; collapsed?: boolean } = $props();
  let dropdownOpen = $state(false);

  const scenarios = Object.entries(SCENARIO_LABELS);
  function select(key: string | null) {
    if (system.refuseScenarioChange()) return;
    if (key && system.activeScenarioFilter !== key) system.runScenario(key);
    else system.setScenarioFilter(null);
  }
</script>

{#if collapsed}<details class="scenario-menu collapsed" data-tour="scenario-controls" bind:open={dropdownOpen}>
  <summary aria-label="Choose operational scenario"><strong>SCENARIO</strong><b>{system.activeScenarioFilter ? SCENARIO_LABELS[system.activeScenarioFilter] : 'GLOBAL VIEW'}⌄</b></summary>
  {#if dropdownOpen}
  <nav class="scenario-bar dropdown" aria-label="Console scenarios" data-tour="scenario-bar">
    <strong>SCENARIO FILTER</strong>
    <button class:active={!system.activeScenarioFilter} aria-pressed={!system.activeScenarioFilter} onclick={() => select(null)}><span aria-hidden="true">◉</span> GLOBAL VIEW</button>
    {#each scenarios as [key, label] (key)}<button class:active={system.activeScenarioFilter === key} aria-pressed={system.activeScenarioFilter === key} onclick={() => select(key)}><span aria-hidden="true">{key === 'aircraft_nmc' ? '◌' : key.includes('strike') || key === 'sead_campaign' ? '⌁' : '◈'}</span> {label}</button>{/each}
  </nav>
  {/if}
</details>
{:else}
<nav class="scenario-bar" aria-label="Console scenarios" data-tour="scenario-bar">
  <strong>SCENARIO FILTER</strong>
  <button class:active={!system.activeScenarioFilter} aria-pressed={!system.activeScenarioFilter} onclick={() => select(null)}><span aria-hidden="true">◉</span> GLOBAL VIEW</button>
  {#each scenarios as [key, label] (key)}
    <button class:active={system.activeScenarioFilter === key} aria-pressed={system.activeScenarioFilter === key} onclick={() => select(key)}><span aria-hidden="true">{key === 'aircraft_nmc' ? '◌' : key.includes('strike') || key === 'sead_campaign' ? '⌁' : '◈'}</span> {label}</button>
  {/each}
  <button class="visibility-toggle" aria-label="Hide scenario bar" title="Hide scenario bar" onclick={() => onToggleVisibility?.()}>◉</button>
</nav>
{/if}

<style>
  .scenario-menu { position:relative; z-index:30; height:30px; flex:none; background:var(--bg-panel); border-bottom:1px solid var(--border-subtle); font:8px var(--font-mono); }
  .scenario-menu>summary { height:29px; display:flex; align-items:center; gap:8px; padding:0 10px; list-style:none; cursor:pointer; color:var(--text-secondary); letter-spacing:.1em; }
  .scenario-menu>summary::-webkit-details-marker { display:none; }
  .scenario-menu>summary strong { color:var(--text-muted); font-size:7px; }
  .scenario-menu>summary b { color:var(--accent-cyan); font-size:8px; }
  .scenario-menu[open] .scenario-bar.dropdown { position:absolute; top:29px; left:0; width:min(340px,90vw); min-height:0; flex-wrap:wrap; box-shadow:0 8px 20px #0009; }
  .scenario-bar { display:flex; align-items:center; gap:5px; width:100%; min-height:40px; box-sizing:border-box; overflow-x:auto; padding:4px 10px; background:var(--bg-panel); border:1px solid var(--border-subtle); scrollbar-width:thin; }
  strong { flex:none; white-space:nowrap; color:var(--text-muted); font:8px var(--font-mono); letter-spacing:.12em; padding:0 6px; }.visibility-toggle { margin-left:auto; color:var(--accent-cyan); }
  button { flex:0 0 auto; min-height:27px; padding:4px 9px; border:1px solid var(--border-subtle); color:var(--text-muted); background:transparent; font:9px var(--font-mono); letter-spacing:.08em; cursor:pointer; transition:color .18s,border-color .18s,box-shadow .18s; }
  button:hover,button:focus-visible { color:var(--accent-cyan); border-color:var(--accent-cyan); outline:none; }
  button.active { color:var(--accent-cyan); border-color:var(--accent-cyan); box-shadow:0 0 10px color-mix(in srgb, var(--accent-cyan) 20%, transparent); animation:scenario-pulse 1.7s ease-in-out infinite; }
  button span { margin-right:4px; }
  @keyframes scenario-pulse { 50% { box-shadow:0 0 2px color-mix(in srgb, var(--accent-cyan) 15%, transparent); } }
</style>
