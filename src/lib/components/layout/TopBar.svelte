<script lang="ts">
  import { onMount } from 'svelte';
  import { system } from '../../stores/systemStore.svelte';

  let {
    aircraftCount = 0,
    missionCount = 0,
    threatCount = 0,
    onFlowClick,
    onReferenceClick,
    onMetricsClick,
    onDemoClick,
  }: {
    aircraftCount?: number;
    missionCount?: number;
    threatCount?: number;
    onFlowClick?: () => void;
    onReferenceClick?: () => void;
    onMetricsClick?: () => void;
    onDemoClick?: () => void;
  } = $props();

  let zulu = $state('00:00:00');
  let utcDate = $state('');

  onMount(() => {
    const tick = () => {
      const d = new Date();
      zulu = d.toISOString().slice(11, 19);
      utcDate = d.toISOString().slice(0, 10);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  });
</script>

<header class="topbar">
  <span class="title">AIR COMMAND</span>
  <span class="sep">//</span>
  <span class="classification">UNCLASSIFIED · EXERCISE</span>
  <span class="sep">//</span>
  <span class="live">
    <span class="pulse dot"></span>
    <span>LIVE</span>
  </span>
  <span class="spacer"></span>
  <button class="top-btn demo-btn" onclick={() => onDemoClick?.()}>◈ DEMO</button>
  <button class="top-btn ref-btn" onclick={() => onReferenceClick?.()}>◈ REFERENCE</button>
  <button class="top-btn" onclick={() => onMetricsClick?.()}>◈ METRICS</button>
  <button class="top-btn" onclick={() => onFlowClick?.()}>◈ MISSION FLOW</button>
  <button 
    class="top-btn" 
    class:active={system.continuousReoptimization}
    onclick={() => system.toggleContinuousReoptimization()}
  >
    ◈ AUTO-OPT
  </button>
  <span class="sep">//</span>
  <span class="metric">AC <b>{aircraftCount}</b></span>
  <span class="metric">MSN <b>{missionCount}</b></span>
  <span class="metric">THR <b>{threatCount}</b></span>
  <span class="sep">//</span>
  <span class="date">{utcDate}</span>
  <span class="time">{zulu}Z</span>
</header>

<style>
  .topbar {
    grid-area: topbar;
    height: 32px;
    background: #05080f;
    border-bottom: 1px solid var(--border-subtle);
    display: flex; align-items: center; padding: 0 16px; gap: 12px;
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.15em;
    position: relative;
  }
  .topbar::after {
    content: ''; position: absolute; bottom: -1px; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent-cyan), transparent);
    opacity: 0.15;
  }
  .title { color: var(--accent-cyan); font-weight: 700; letter-spacing: 0.22em; }
  .classification { color: var(--accent-amber); }
  .sep { color: var(--border-strong); }
  .spacer { flex: 1; }
  .metric { color: var(--text-muted); }
  .metric b { color: var(--text-secondary); font-weight: 500; margin-left: 4px; }
  .date { color: var(--text-muted); }
  .time { color: var(--accent-cyan); }
  .live { display: flex; align-items: center; gap: 5px; color: var(--accent-green); font-size: 9px; }
  .live .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }
  .top-btn {
    background: transparent;
    border: 1px solid var(--border-strong);
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.18em;
    padding: 4px 10px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .top-btn:hover {
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
    box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
  }
  .top-btn.active {
    border-color: var(--accent-green);
    color: var(--accent-green);
    background: rgba(57, 255, 20, 0.06);
  }
</style>
