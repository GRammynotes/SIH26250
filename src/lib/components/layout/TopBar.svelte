<script lang="ts">
  import { onMount } from 'svelte';
  import { system } from '../../stores/systemStore.svelte';

  let {
    aircraftCount = 0, missionCount = 0, threatCount = 0,
    onFlowClick, onReferenceClick, onMetricsClick, onDemoClick,
    onGlossaryClick, onShortcutHelpClick, onGenerate, onReset, onDegradedToggle,
    onLayerToggle, demoActive = false, modalCount = 0,
  }: {
    aircraftCount?: number; missionCount?: number; threatCount?: number;
    onFlowClick?: () => void; onReferenceClick?: () => void; onMetricsClick?: () => void;
    onDemoClick?: () => void; onGlossaryClick?: () => void; onShortcutHelpClick?: () => void;
    onGenerate?: () => void; onReset?: () => void; onDegradedToggle?: () => void;
    onLayerToggle?: (layer: string) => void; demoActive?: boolean; modalCount?: number;
  } = $props();

  let zulu = $state('00:00:00');
  let utcDate = $state('');
  let openMenu = $state<string | null>(null);
  const menus = ['VIEW', 'TOOLS', 'HELP', 'SYSTEM'];
  const layers = [
    ['Terrain', 'terrain'], ['Airspace', 'airspace'], ['Weather', 'weather'], ['Enemy', 'enemy'], ['Ground', 'ground'],
    ['Trails', 'trails'], ['Grid', 'grid'], ['Threat', 'threats'],
  ];

  onMount(() => {
    const tick = () => { const d = new Date(); zulu = d.toISOString().slice(11, 19); utcDate = d.toISOString().slice(0, 10); };
    tick(); const id = setInterval(tick, 1000);
    const close = () => openMenu = null;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('click', close); window.addEventListener('keydown', escape);
    return () => { clearInterval(id); window.removeEventListener('click', close); window.removeEventListener('keydown', escape); };
  });

  function toggleMenu(name: string, event: MouseEvent) {
    event.stopPropagation(); openMenu = openMenu === name ? null : name;
  }
  function action(fn?: () => void) { fn?.(); openMenu = null; }
</script>

<header class="topbar">
  <span class="title">AIR COMMAND</span><span class="sep">//</span>
  <span class="classification">UNCLASSIFIED · EXERCISE</span><span class="sep">//</span>
  <span class="live"><span class="pulse dot"></span><span>LIVE</span></span>
  <nav class="menus" aria-label="Main menu">
    {#each menus as menu (menu)}
      <div class="menu-group">
        <button class="menu-trigger" class:open={openMenu === menu} aria-haspopup="true" aria-expanded={openMenu === menu} onclick={(event) => toggleMenu(menu, event)}>{menu}</button>
        {#if openMenu === menu}
          <div class="menu-panel" role="menu" onclick={(event) => event.stopPropagation()}>
            {#if menu === 'VIEW'}
              {#each layers as [label, key]}
                <button role="menuitemcheckbox" aria-checked="false" onclick={() => action(() => onLayerToggle?.(key))}><span>◈ {label}</span><span class="menu-arrow">›</span></button>
              {/each}
            {:else if menu === 'TOOLS'}
              <button role="menuitem" onclick={() => action(onGenerate)}>▸ GENERATE COA</button>
              <button role="menuitem" class:enabled={system.continuousReoptimization} onclick={() => action(() => system.toggleContinuousReoptimization())}>◈ AUTO-OPT {system.continuousReoptimization ? 'ON' : 'OFF'}</button>
              <button role="menuitem" onclick={() => action(onMetricsClick)}>◈ METRICS</button>
              <button role="menuitem" onclick={() => action(onReferenceClick)}>◈ REFERENCE</button>
              <button role="menuitem" onclick={() => action(onFlowClick)}>◈ MISSION FLOW</button>
            {:else if menu === 'HELP'}
              <button role="menuitem" onclick={() => action(onGlossaryClick)}>◈ GLOSSARY</button>
              <button role="menuitem" onclick={() => action(onShortcutHelpClick)}>⌨ SHORTCUTS</button>
              <button role="menuitem" onclick={() => action(onDemoClick)}>◈ DEMO</button>
            {:else}
              <button role="menuitem" onclick={() => action(onReset)}>↻ RESET SYSTEM</button>
              <button role="menuitem" class:enabled={system.mode === 'DEGRADED'} onclick={() => action(onDegradedToggle)}>◈ DEGRADED MODE {system.mode === 'DEGRADED' ? 'ON' : 'OFF'}</button>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </nav>
  <span class="spacer"></span>
  <span class="metric">AC <b>{aircraftCount}</b></span><span class="metric">MSN <b>{missionCount}</b></span><span class="metric">THR <b>{threatCount}</b></span>
  <span class="indicators" aria-label="System status">
    <span title="Link OK"><i class="green"></i></span>
    {#if system.reoptimizing}<span title="Recomputing"><i class="amber"></i></span>{/if}
    {#if system.mode === 'DEGRADED'}<span title="Degraded"><i class="red"></i></span>{/if}
    {#if demoActive}<span title="Demo active"><i class="blue"></i></span>{/if}
    {#if modalCount > 0}<span class="modal-count" title="Open modals">{modalCount}</span>{/if}
  </span>
  <span class="date">{utcDate}</span><span class="time">{zulu}Z</span>
</header>

<style>
  .topbar { height:32px; flex:none; background:#05080f; border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; padding:0 12px; gap:10px; font-family:var(--font-mono); font-size:9px; letter-spacing:.13em; position:relative; z-index:30; }
  .topbar::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--accent-cyan),transparent); opacity:.15; pointer-events:none; }
  .title { color:var(--accent-cyan); font-weight:700; letter-spacing:.2em; white-space:nowrap; } .classification { color:var(--accent-amber); white-space:nowrap; }
  .sep { color:var(--border-strong); } .spacer { flex:1; } .metric,.date { color:var(--text-muted); white-space:nowrap; } .metric b { color:var(--text-secondary); font-weight:500; margin-left:3px; } .time { color:var(--accent-cyan); white-space:nowrap; }
  .live { display:flex; align-items:center; gap:5px; color:var(--accent-green); font-size:8px; } .dot { width:5px; height:5px; border-radius:50%; background:var(--accent-green); box-shadow:0 0 6px var(--accent-green); }
  .menus { display:flex; align-items:center; height:100%; gap:4px; margin-left:8px; } .menu-group { position:relative; height:100%; display:flex; align-items:center; }
  .menu-trigger { position:relative; height:100%; padding:0 10px; background:transparent; border:0; color:var(--text-secondary); font:9px var(--font-mono); letter-spacing:.16em; cursor:pointer; }
  .menu-trigger::after { content:''; position:absolute; bottom:5px; left:10px; right:10px; height:1px; background:var(--accent-cyan); transform:scaleX(0); transition:transform .18s ease; }
  .menu-trigger:hover::after,.menu-trigger.open::after { transform:scaleX(1); } .menu-trigger:hover,.menu-trigger.open { color:var(--accent-cyan); }
  .menu-panel { position:absolute; top:31px; left:0; min-width:190px; padding:5px; background:var(--bg-panel); border:1px solid var(--accent-cyan); box-shadow:0 8px 24px rgba(0,0,0,.55); display:flex; flex-direction:column; gap:2px; z-index:50; }
  .menu-panel button { display:flex; justify-content:space-between; align-items:center; padding:9px 10px; border:1px solid transparent; background:transparent; color:var(--text-secondary); text-align:left; font:9px var(--font-mono); letter-spacing:.1em; cursor:pointer; }
  .menu-panel button:hover,.menu-panel button:focus-visible { border-color:var(--border-strong); color:var(--accent-cyan); outline:none; } .menu-panel button.enabled { color:var(--accent-green); } .menu-arrow { color:var(--text-muted); }
  .indicators { display:flex; align-items:center; gap:6px; margin:0 4px; } .indicators i { display:block; width:5px; height:5px; border-radius:50%; animation:indicator-pulse 1.5s infinite; } .green { background:var(--accent-green); box-shadow:0 0 5px var(--accent-green); } .amber { background:var(--accent-amber); box-shadow:0 0 5px var(--accent-amber); } .red { background:var(--accent-red); box-shadow:0 0 5px var(--accent-red); } .blue { background:var(--accent-cyan); box-shadow:0 0 5px var(--accent-cyan); }
  .modal-count { color:var(--accent-cyan); font-size:8px; border:1px solid var(--accent-cyan); padding:1px 3px; } @keyframes indicator-pulse { 50% { opacity:.45; } }
</style>
