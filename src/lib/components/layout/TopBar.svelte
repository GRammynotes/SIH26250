<script lang="ts">
  import { onMount } from 'svelte';
  import { system } from '../../stores/systemStore.svelte';
  import { isVoiceEnabled, isVoiceTierMuted, setVoiceEnabled, setVoiceTierMuted } from '../../engine/voice';

  let {
    aircraftCount = 0, missionCount = 0, threatCount = 0,
    onFlowClick, onReferenceClick, onMetricsClick, onDemoClick, onSimulationClick, onProbabilisticSimulationClick,
    onGlossaryClick, onShortcutHelpClick, onGuideClick, onReplayWelcome, onGenerate, onReset, onDegradedToggle,
    onLayerToggle, demoActive = false, modalCount = 0, onResetLayout, onToggleFocusLock, focusLocked = true, railActive = false, panelVisibility = {},
    onPanelToggle, onShowAllPanels, onHideAllPanels, onBottomToggle, bottomExpanded = false, unreadLogCount = 0, onRoeClick,
  }: {
    aircraftCount?: number; missionCount?: number; threatCount?: number;
    onFlowClick?: () => void; onReferenceClick?: () => void; onMetricsClick?: () => void;
    onDemoClick?: () => void; onSimulationClick?: () => void; onProbabilisticSimulationClick?: () => void; onGlossaryClick?: () => void; onShortcutHelpClick?: () => void; onGuideClick?: () => void; onReplayWelcome?: () => void;
    onGenerate?: () => void; onReset?: () => void; onDegradedToggle?: () => void;
    onLayerToggle?: (layer: string) => void; demoActive?: boolean; modalCount?: number;
    onPanelToggle?: (key: string, visible: boolean) => void; onShowAllPanels?: () => void; onHideAllPanels?: () => void;
    onBottomToggle?: () => void; bottomExpanded?: boolean; unreadLogCount?: number;
    onResetLayout?: () => void; onToggleFocusLock?: () => void; focusLocked?: boolean; railActive?: boolean; panelVisibility?: Record<string, boolean>;
    onRoeClick?: () => void;
  } = $props();

  let zulu = $state('00:00:00');
  let utcDate = $state('');
  let openMenu = $state<string | null>(null);
  let voiceOn = $state(true);
  let warningMuted = $state(false);
  let voiceMenuOpen = $state(false);
  let captionsOn = $state(true);
  let toggleToast = $state('');
  let iaccsOpen = $state(false);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const menus = ['EXPERIENCE', 'VIEW', 'TOOLS', 'HELP', 'SYSTEM'];
  const layers = [
    ['Terrain', 'terrain'], ['Airspace', 'airspace'], ['Weather', 'weather'], ['Enemy', 'enemy'], ['Ground', 'ground'],
    ['Trails', 'trails'], ['Grid', 'grid'], ['Threat', 'threats'],
  ];
  const panels = [['FORCE ROSTER','forceRoster'],['MISSIONS','missions'],['THEATER MAP','theaterMap'],['COA','coa'],['MISSION LOG','missionLog'],['COMMAND STATUS','commandStatus'],['SCENARIO BAR','scenarioBar']];
  let layerChecked = $state({ terrain:false, airspace:true, weather:true, enemy:true, ground:true, trails:true, grid:true, threats:true });
  const securityStatus = $derived(system.spoofedTrackId ? 'LINK COMPROMISED' : system.mode === 'DEGRADED' ? 'KEY ROTATION DUE' : 'LINK SECURE');
  const voiceOwnerLabel = $derived(system.activeExperience === 'idle' ? 'SYSTEM' : system.activeExperience.toUpperCase());
  const iaccsLost = $derived(system.activeScenarioFilter === 'radar_loss');
  const iaccsState = $derived(iaccsLost ? 'LOST' : system.mode === 'DEGRADED' ? 'DEGRADED' : 'CONNECTED');

  onMount(() => {
    voiceOn = isVoiceEnabled();
    warningMuted = isVoiceTierMuted('WARNING');
    try { captionsOn = localStorage.getItem('aircommand.captions') !== 'false'; } catch { captionsOn = true; }
    const tick = () => { const d = new Date(); zulu = d.toISOString().slice(11, 23); utcDate = d.toISOString().slice(0, 10); };
    tick(); const id = setInterval(tick, 100);
    const close = () => openMenu = null;
    const closeVoice = () => voiceMenuOpen = false;
    const syncVoice = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean; mutedTiers: string[] }>).detail;
      if (!detail) return;
      voiceOn = detail.enabled;
      warningMuted = detail.mutedTiers.includes('WARNING');
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { close(); closeVoice(); } };
    window.addEventListener('click', close); window.addEventListener('click', closeVoice); window.addEventListener('keydown', escape); window.addEventListener('aircommand:voice-state', syncVoice);
    return () => { clearInterval(id); if (toastTimer) clearTimeout(toastTimer); window.removeEventListener('click', close); window.removeEventListener('click', closeVoice); window.removeEventListener('keydown', escape); window.removeEventListener('aircommand:voice-state', syncVoice); };
  });

  function toggleMenu(name: string, event: MouseEvent) {
    event.stopPropagation(); openMenu = openMenu === name ? null : name;
  }
  function action(fn?: () => void) { fn?.(); openMenu = null; }
  function toggleLayer(key: string) { layerChecked = { ...layerChecked, [key]: !layerChecked[key as keyof typeof layerChecked] }; onLayerToggle?.(key); }
  function showToggleToast(label: string, enabled: boolean) { toggleToast = `${label}: ${enabled ? 'ON' : 'OFF'}`; if (toastTimer) clearTimeout(toastTimer); toastTimer = setTimeout(() => toggleToast = '', 1200); }
  function toggleVoiceMenu(event: MouseEvent) { event.stopPropagation(); voiceMenuOpen = !voiceMenuOpen; }
  function toggleWarningMute() { setVoiceTierMuted('WARNING', !warningMuted); }
  function muteAllVoice() { setVoiceEnabled(false); }
  function unmuteVoice() { setVoiceTierMuted('WARNING', false); setVoiceEnabled(true); }
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
            {#if menu === 'EXPERIENCE'}
              <button role="menuitem" onclick={() => action(onDemoClick)}>▶ GUIDED DEMO</button>
              <button role="menuitem" onclick={() => action(onSimulationClick)}>▷ HISTORICAL TRAINING</button>
              <button role="menuitem" onclick={() => action(onProbabilisticSimulationClick)}>◈ OUTCOME SIMULATION</button>
            {:else if menu === 'VIEW'}
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
              <button role="menuitem" onclick={() => action(onRoeClick)}>◈ VIEW CURRENT ROE</button>
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
  <button class="log-toggle" aria-expanded={bottomExpanded} aria-label={bottomExpanded ? 'Collapse event log and command status' : `Open event log and command status, ${unreadLogCount} unread`} title="Event log and command status" onclick={onBottomToggle}>LOG {unreadLogCount ? `· ${unreadLogCount}` : '· STATUS'} {bottomExpanded ? '⌄' : '⌃'}</button>
  <span class="spacer"></span>
  <div class="voice-control">
    <button class="voice-toggle" class:muted={!voiceOn} data-tour="voice-toggle" aria-expanded={voiceMenuOpen} aria-label={`Voice narration owner: ${voiceOwnerLabel}`} title="Voice narration controls" onclick={toggleVoiceMenu}>◈ VOICE · {voiceOwnerLabel}</button>
    {#if voiceMenuOpen}<div class="voice-menu" role="menu" aria-label="Voice controls" onclick={(event) => event.stopPropagation()}>
      <button role="menuitemcheckbox" aria-checked={warningMuted} onclick={toggleWarningMute}>{warningMuted ? 'UNMUTE WARNING' : 'MUTE WARNING'}</button>
      <button role="menuitem" disabled={!voiceOn} onclick={muteAllVoice}>MUTE ALL</button>
      <button role="menuitem" disabled={voiceOn && !warningMuted} onclick={unmuteVoice}>UNMUTE</button>
    </div>{/if}
  </div>
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
  <div class="iaccs-wrap"><button class="iaccs" class:degraded={iaccsState === 'DEGRADED'} class:lost={iaccsState === 'LOST'} aria-expanded={iaccsOpen} onclick={(event) => { event.stopPropagation(); iaccsOpen = !iaccsOpen; }}><i></i>IACCS · {iaccsState}</button>{#if iaccsOpen}<section class="iaccs-panel" aria-label="IACCS and supporting feeds"><b>IACCS STATUS · EXERCISE</b><span><i class="good"></i>IACCS FEED · RADAR + AWACS + UAV <em>[LIVE]</em></span><span><i class="good"></i>SATELLITE INTEL · IMAGERY + SIGINT <em>[LIVE]</em></span><span><i class="sim"></i>WEATHER SERVICE · METOC DATA <em>[SIMULATED]</em></span><span><i class="sim"></i>AIRSPACE AUTHORITY · CORRIDOR STATUS <em>[SIMULATED]</em></span><span><i class="good"></i>BASE OPS · AIRCRAFT STATUS <em>[LIVE]</em></span><span><i class="good"></i>CREW SCHEDULING · REST + QUALIFICATION <em>[LIVE]</em></span></section>{/if}</div>
  <span class="date">{utcDate}</span><span class="time">{zulu}Z</span><span class="operator">OPR: EXERCISE-01</span>
</header>

<style>
  .topbar { height:32px; flex:none; background:var(--bg-base); border-bottom:1px solid var(--border-subtle); display:flex; align-items:center; padding:0 12px; gap:10px; font-family:var(--font-mono); font-size:9px; letter-spacing:.13em; position:relative; z-index:30; }
  .topbar::after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:1px; background:linear-gradient(90deg,transparent,var(--accent-cyan),transparent); opacity:.15; pointer-events:none; }
  .title { color:var(--accent-cyan); font-weight:700; letter-spacing:.2em; white-space:nowrap; } .classification { color:var(--accent-amber); white-space:nowrap; }
  .sep { color:var(--border-strong); } .spacer { flex:1; } .metric,.date { color:var(--text-muted); white-space:nowrap; } .metric b { color:var(--text-secondary); font-weight:500; margin-left:3px; } .time { color:var(--accent-cyan); white-space:nowrap; }
  .live { display:flex; align-items:center; gap:5px; color:var(--accent-green); font-size:8px; } .dot { width:5px; height:5px; border-radius:50%; background:var(--accent-green); box-shadow:0 0 6px var(--accent-green); }
  .menus { display:flex; align-items:center; height:100%; gap:4px; margin-left:8px; } .menu-group { position:relative; height:100%; display:flex; align-items:center; }
  .voice-toggle { padding:4px 7px; background:transparent; border:1px solid var(--border-subtle); color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.08em; cursor:pointer; white-space:nowrap; }.voice-toggle.muted { color:var(--text-muted); }
  .voice-control { position:relative; }.voice-menu { position:absolute; top:26px; right:0; z-index:80; display:grid; min-width:150px; padding:4px; border:1px solid var(--accent-cyan); background:var(--bg-panel); box-shadow:0 8px 24px rgba(0,0,0,.55); }.voice-menu button { padding:8px; border:1px solid transparent; background:transparent; color:var(--text-secondary); text-align:left; font:8px var(--font-mono); cursor:pointer; }.voice-menu button:hover,.voice-menu button[aria-checked="true"] { border-color:var(--border-strong); color:var(--accent-cyan); }.voice-menu button:disabled { opacity:.4; cursor:default; }
  .log-toggle { padding:4px 6px; border:1px solid var(--border-subtle); background:transparent; color:var(--text-secondary); font:7px var(--font-mono); letter-spacing:.08em; white-space:nowrap; cursor:pointer; }.log-toggle:hover,.log-toggle[aria-expanded="true"] { color:var(--accent-cyan); border-color:var(--accent-cyan); }
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
  .iaccs-wrap { position:relative; }.iaccs { display:flex; align-items:center; gap:5px; border:0; background:transparent; color:var(--accent-green); font:8px var(--font-mono); white-space:nowrap; cursor:pointer; }.iaccs i,.iaccs-panel i { width:6px; height:6px; border-radius:50%; background:var(--accent-green); }.iaccs.degraded { color:var(--accent-amber); }.iaccs.degraded i { background:var(--accent-amber); }.iaccs.lost { color:var(--accent-red); }.iaccs.lost i { background:var(--accent-red); animation:indicator-pulse .8s infinite; }.iaccs-panel { position:absolute; z-index:90; top:26px; right:0; width:340px; display:grid; gap:9px; padding:12px; border:1px solid var(--accent-cyan); background:var(--bg-panel); box-shadow:0 8px 24px rgba(0,0,0,.6); font:8px var(--font-mono); }.iaccs-panel>b { color:var(--accent-cyan); letter-spacing:.12em; }.iaccs-panel span { display:flex; align-items:center; gap:7px; color:var(--text-secondary); }.iaccs-panel i { flex:none; }.iaccs-panel i.sim { background:var(--accent-amber); }.iaccs-panel em { margin-left:auto; color:var(--text-muted); font-style:normal; }
  .modal-count { color:var(--accent-cyan); font-size:8px; border:1px solid var(--accent-cyan); padding:1px 3px; } @keyframes indicator-pulse { 50% { opacity:.45; } }
</style>
