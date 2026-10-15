<script lang="ts">
  import { onMount } from 'svelte';
  import { system } from '../../stores/systemStore.svelte';
  import { isVoiceEnabled, setVoiceEnabled } from '../../engine/voice';

  let {
    aircraftCount = 0, missionCount = 0, threatCount = 0,
    onFlowClick, onReferenceClick, onMetricsClick, onDemoClick, onSimulationClick,
    onGlossaryClick, onShortcutHelpClick, onGuideClick, onReplayWelcome, onGenerate, onReset, onDegradedToggle,
    onLayerToggle, demoActive = false, modalCount = 0, onResetLayout, onToggleFocusLock, focusLocked = true, railActive = false, panelVisibility = {},
    onPanelToggle, onShowAllPanels, onHideAllPanels,
  }: {
    aircraftCount?: number; missionCount?: number; threatCount?: number;
    onFlowClick?: () => void; onReferenceClick?: () => void; onMetricsClick?: () => void;
    onDemoClick?: () => void; onSimulationClick?: () => void; onGlossaryClick?: () => void; onShortcutHelpClick?: () => void; onGuideClick?: () => void; onReplayWelcome?: () => void;
    onGenerate?: () => void; onReset?: () => void; onDegradedToggle?: () => void;
    onLayerToggle?: (layer: string) => void; demoActive?: boolean; modalCount?: number;
    onPanelToggle?: (key: string, visible: boolean) => void; onShowAllPanels?: () => void; onHideAllPanels?: () => void;
    onResetLayout?: () => void; onToggleFocusLock?: () => void; focusLocked?: boolean; railActive?: boolean; panelVisibility?: Record<string, boolean>;
  } = $props();

  let zulu = $state('00:00:00');
  let utcDate = $state('');
  let openMenu = $state<string | null>(null);
  let voiceOn = $state(true);
  let captionsOn = $state(true);
  let toggleToast = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const menus = ['VIEW', 'TOOLS', 'HELP', 'SYSTEM'];
  const layers = [
    ['Terrain', 'terrain'], ['Airspace', 'airspace'], ['Weather', 'weather'], ['Enemy', 'enemy'], ['Ground', 'ground'],
    ['Trails', 'trails'], ['Grid', 'grid'], ['Threat', 'threats'],
  ];
  const panels = [['FORCE ROSTER','forceRoster'],['MISSIONS','missions'],['THEATER MAP','theaterMap'],['COA','coa'],['MISSION LOG','missionLog'],['COMMAND STATUS','commandStatus'],['SCENARIO BAR','scenarioBar']];
  let layerChecked = $state({ terrain:false, airspace:true, weather:true, enemy:true, ground:true, trails:true, grid:true, threats:true });
  const securityStatus = $derived(system.spoofedTrackId ? 'LINK COMPROMISED' : system.mode === 'DEGRADED' ? 'KEY ROTATION DUE' : 'LINK SECURE');

  onMount(() => {
    voiceOn = isVoiceEnabled();
    try { captionsOn = localStorage.getItem('aircommand.captions') !== 'false'; } catch { captionsOn = true; }
    const tick = () => { const d = new Date(); zulu = d.toISOString().slice(11, 23); utcDate = d.toISOString().slice(0, 10); };
    tick(); const id = setInterval(tick, 100);
    const close = () => openMenu = null;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('click', close); window.addEventListener('keydown', escape);
    return () => { clearInterval(id); if (toastTimer) clearTimeout(toastTimer); window.removeEventListener('click', close); window.removeEventListener('keydown', escape); };
  });

  function toggleMenu(name: string, event: MouseEvent) {
    event.stopPropagation(); openMenu = openMenu === name ? null : name;
  }
  function action(fn?: () => void) { fn?.(); openMenu = null; }
  function toggleLayer(key: string) { layerChecked = { ...layerChecked, [key]: !layerChecked[key as keyof typeof layerChecked] }; onLayerToggle?.(key); }
  function showToggleToast(label: string, enabled: boolean) { toggleToast = `${label}: ${enabled ? 'ON' : 'OFF'}`; if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(() => toggleToast = '', 1200); }
  function toggleVoice() { voiceOn = !voiceOn; setVoiceEnabled(voiceOn); showToggleToast('VOICE', voiceOn); }
  function toggleCaptions() { captionsOn = !captionsOn; try { localStorage.setItem('aircommand.captions', String(captionsOn)); } catch {} window.dispatchEvent(new CustomEvent('aircommand:captions-state', { detail: captionsOn })); showToggleToast('CAPTIONS', captionsOn); }
</script>

<header class="topbar">
  <span class="title">AIR COMMAND</span><span class="sep">//</span>
  <span class="classification">UNCLASSIFIED // EXERCISE // SIMULATED DATA</span><span class="sep">//</span>
  <span class="live"><span class="pulse dot"></span><span>LIVE</span></span>
  <nav class="menus" aria-label="Main menu">
    {#each menus as menu (menu)}
      <div class="menu-group">
        <button class="menu-trigger" data-tour={menu === 'TOOLS' ? 'reference-library' : menu === 'HELP' ? 'help-menu' : undefined} class:open={openMenu === menu} aria-haspopup="true" aria-expanded={openMenu === menu} onclick={(event) => toggleMenu(menu, event)}>{menu}</button>
        {#if openMenu === menu}
          <div class="menu-panel" role="menu" onclick={(event) => event.stopPropagation()}>
            {#if menu === 'VIEW'}
              <details class="submenu"><summary>MAP LAYERS ▸</summary>{#each layers as [label, key]}<button role="menuitemcheckbox" aria-checked={layerChecked[key as keyof typeof layerChecked]} onclick={() => toggleLayer(key)}><span>{layerChecked[key as keyof typeof layerChecked] ? '☑' : '☐'} {label}</span></button>{/each}</details>
              <details class="submenu"><summary>PANELS ▸</summary>{#each panels as [label, key]}<button role="menuitemcheckbox" aria-checked={panelVisibility[key] !== false} onclick={() => onPanelToggle?.(key, panelVisibility[key] === false)}><span>{panelVisibility[key] === false ? '☐' : '☑'} {label}</span></button>{/each}</details>
              <div class="menu-divider"></div>
              <button role="menuitem" onclick={() => action(onShowAllPanels)}>RESTORE ALL PANELS</button>
              <button role="menuitem" onclick={() => action(onResetLayout)}>RESET LAYOUT <kbd>Ctrl+Shift+R</kbd></button>
            {:else if menu === 'TOOLS'}
              <button role="menuitem" onclick={() => action(onGenerate)}>▸ GENERATE COA <kbd>G</kbd></button>
              <button role="menuitem" class:enabled={system.continuousReoptimization} onclick={() => action(() => system.toggleContinuousReoptimization())}>◈ AUTO-OPT {system.continuousReoptimization ? 'ON' : 'OFF'}</button>
              <button role="menuitem" onclick={() => action(onMetricsClick)}>◈ METRICS <kbd>M</kbd></button>
              <button role="menuitem" onclick={() => action(onReferenceClick)}>◈ REFERENCE <kbd>R</kbd></button>
              <button role="menuitem" onclick={() => action(onFlowClick)}>◈ MISSION FLOW <kbd>F</kbd></button>
            {:else if menu === 'HELP'}
              <button role="menuitem" onclick={() => action(onDemoClick)}>◈ COMPREHENSIVE DEMO <kbd>D</kbd></button>
              <button role="menuitem" onclick={() => action(onSimulationClick)}>◈ TRAINING SIMULATION <kbd>S</kbd></button>
              <div class="menu-divider"></div>
              <button role="menuitem" onclick={() => action(onShortcutHelpClick)}>⌨ KEYBOARD SHORTCUTS <kbd>?</kbd></button>
              <button role="menuitem" onclick={() => action(onGlossaryClick)}>◈ GLOSSARY <kbd>⌘</kbd></button>
            {:else}
              <button role="menuitem" onclick={() => action(onReset)}>↻ RESET SYSTEM</button>
              <button role="menuitem" class:enabled={system.mode === 'DEGRADED'} onclick={() => action(onDegradedToggle)}>◈ DEGRADED MODE {system.mode === 'DEGRADED' ? 'ON' : 'OFF'}</button>
              <button role="menuitem" disabled={!railActive} onclick={() => action(onToggleFocusLock)}>◈ TOGGLE FOCUS LOCK {focusLocked ? 'ON' : 'OFF'}</button>
              <button role="menuitem" onclick={() => action(onResetLayout)}>↻ GLOBAL LAYOUT RESET <kbd>Ctrl+Shift+R</kbd></button>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </nav>
  <span class="spacer"></span>
  <button class="voice-toggle" data-tour="voice-toggle" aria-pressed={voiceOn} title="Toggle voice narration" onclick={toggleVoice}>◈ VOICE {voiceOn ? 'ON' : 'OFF'}</button>
  <button class="voice-toggle" aria-pressed={captionsOn} title="Toggle captions" onclick={toggleCaptions}>CC {captionsOn ? 'ON' : 'OFF'}</button>
  {#if toggleToast}<span class="toggle-toast" role="status">{toggleToast}</span>{/if}
  <span class="metric">AC <b>{aircraftCount}</b></span><span class="metric">MSN <b>{missionCount}</b></span><span class="metric">THR <b>{threatCount}</b></span>
  <span class="indicators" aria-label="System status">
    <span class="indicator link" title="Link OK" aria-label="Link OK">●✓</span>
    {#if system.reoptimizing}<span class="indicator recompute" title="Recomputing" aria-label="Recomputing">◢</span>{/if}
    {#if system.mode === 'DEGRADED'}<span class="indicator degraded" title="Degraded" aria-label="Degraded">▲!</span>{/if}
    {#if demoActive}<span class="indicator demo" title="Demo active" aria-label="Demo active">◆</span>{/if}
    {#if modalCount > 0}<span class="modal-count" title="Open modals">{modalCount}</span>{/if}
  </span>
  <span class="security-status" class:warn={system.mode === 'DEGRADED' && !system.spoofedTrackId} class:bad={Boolean(system.spoofedTrackId)} aria-live="polite"><i>{system.spoofedTrackId ? '×' : system.mode === 'DEGRADED' ? '△' : '✓'}</i>{securityStatus}</span>
  <span class="date">{utcDate}</span><span class="time">{zulu}Z</span><span class="operator">OPR: EXERCISE-01</span>
</header>

<style>
  .topbar { height:32px; flex:none; background:var(--bg-base); border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; padding:0 12px; gap:10px; font-family:var(--font-mono); font-size:9px; letter-spacing:.13em; position:relative; z-index:30; }
  .topbar::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--accent-cyan),transparent); opacity:.15; pointer-events:none; }
  .title { color:var(--accent-cyan); font-weight:700; letter-spacing:.2em; white-space:nowrap; } .classification { color:var(--accent-amber); white-space:nowrap; }
  .sep { color:var(--border-strong); } .spacer { flex:1; } .metric,.date { color:var(--text-muted); white-space:nowrap; } .metric b { color:var(--text-secondary); font-weight:500; margin-left:3px; } .time { color:var(--accent-cyan); white-space:nowrap; }
  .live { display:flex; align-items:center; gap:5px; color:var(--accent-green); font-size:8px; } .dot { width:5px; height:5px; border-radius:50%; background:var(--accent-green); box-shadow:0 0 6px var(--accent-green); }
  .menus { display:flex; align-items:center; height:100%; gap:4px; margin-left:8px; } .menu-group { position:relative; height:100%; display:flex; align-items:center; }
  .voice-toggle { padding:4px 7px; background:transparent; border:1px solid var(--border-subtle); color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.08em; cursor:pointer; white-space:nowrap; }.voice-toggle[aria-pressed="false"] { color:var(--text-muted); }
  .toggle-toast { position:absolute; right:12px; top:38px; z-index:60; padding:6px 9px; border:1px solid var(--accent-cyan); background:var(--bg-panel); color:var(--accent-cyan); font:8px var(--font-mono); }
  .menu-trigger { position:relative; height:100%; padding:0 10px; background:transparent; border:0; color:var(--text-secondary); font:9px var(--font-mono); letter-spacing:.16em; cursor:pointer; }
  .menu-trigger::after { content:''; position:absolute; bottom:5px; left:10px; right:10px; height:1px; background:var(--accent-cyan); transform:scaleX(0); transition:transform .18s ease; }
  .menu-trigger:hover::after,.menu-trigger.open::after { transform:scaleX(1); } .menu-trigger:hover,.menu-trigger.open { color:var(--accent-cyan); }
  .menu-panel { position:absolute; top:31px; left:0; min-width:230px; max-height:min(75vh,620px); overflow:auto; padding:5px; background:var(--bg-panel); border:1px solid var(--accent-cyan); box-shadow:0 8px 24px rgba(0,0,0,.55); display:flex; flex-direction:column; gap:2px; z-index:50; }
  .submenu summary { padding:9px 10px; color:var(--accent-cyan); cursor:pointer; list-style:none; border:1px solid var(--border-subtle); }
  .submenu summary::-webkit-details-marker { display:none; }
  .submenu button { width:100%; padding-left:18px; }
  .menu-panel button { display:flex; justify-content:space-between; align-items:center; padding:9px 10px; border:1px solid transparent; background:transparent; color:var(--text-secondary); text-align:left; font:9px var(--font-mono); letter-spacing:.1em; cursor:pointer; }
  .menu-panel button:hover,.menu-panel button:focus-visible { border-color:var(--border-strong); color:var(--accent-cyan); outline:none; } .menu-panel button.enabled { color:var(--accent-green); } .menu-arrow { color:var(--text-muted); }
  .menu-panel button:disabled { opacity:.4; cursor:not-allowed; }
  .menu-divider { height:1px; background:var(--border-subtle); margin:4px 0; }.panel-visibility { max-height:260px; overflow:auto; }
  .indicators { display:flex; align-items:center; gap:6px; margin:0 4px; } .indicator { font-size:8px; font-weight:700; animation:indicator-pulse 1.5s infinite; } .indicator.link { color:var(--accent-green); } .indicator.recompute { color:var(--accent-amber); } .indicator.degraded { color:var(--accent-red); } .indicator.demo { color:var(--accent-cyan); } kbd { margin-left:7px; padding:1px 3px; border:1px solid var(--border-strong); color:var(--accent-cyan); font:8px var(--font-mono); }
  .security-status { display:flex; align-items:center; gap:4px; color:var(--accent-green); white-space:nowrap; font-size:8px; }.security-status i { display:grid; place-items:center; width:12px; height:12px; border:1px solid currentColor; font-style:normal; font-weight:700; }.security-status.warn { color:var(--accent-amber); }.security-status.bad { color:var(--accent-red); }.operator { white-space:nowrap; color:var(--accent-cyan); font-size:8px; }
  .modal-count { color:var(--accent-cyan); font-size:8px; border:1px solid var(--accent-cyan); padding:1px 3px; } @keyframes indicator-pulse { 50% { opacity:.45; } }
</style>
