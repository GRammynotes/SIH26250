<script lang="ts">
  import { onMount } from 'svelte';

  let { aircraftCount = 0, missionCount = 0, threatCount = 0 }: {
    aircraftCount?: number; missionCount?: number; threatCount?: number;
  } = $props();

  let zulu = $state('00:00:00');

  onMount(() => {
    const tick = () => { zulu = new Date().toISOString().slice(11, 19); };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  });
</script>

<header class="topbar">
  <span class="title">AIR COMMAND</span>
  <span class="sep">//</span>
  <span class="classification">UNCLASSIFIED · EXERCISE</span>
  <span class="spacer"></span>
  <span class="metric">AC <b>{aircraftCount}</b></span>
  <span class="metric">MSN <b>{missionCount}</b></span>
  <span class="metric">THR <b>{threatCount}</b></span>
  <span class="sep">//</span>
  <span class="time">{zulu}Z</span>
</header>

<style>
  .topbar {
    grid-area: topbar;
    height: 32px;
    background: rgba(5, 6, 8, 0.98);
    border-bottom: 1px solid var(--border-subtle);
    display: flex; align-items: center; padding: 0 16px; gap: 16px;
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.15em;
  }
  .title { color: var(--accent-cyan); font-weight: 700; }
  .classification { color: var(--accent-amber); }
  .sep { color: var(--border-strong); }
  .spacer { flex: 1; }
  .metric { color: var(--text-muted); }
  .metric b { color: var(--text-secondary); font-weight: 500; margin-left: 4px; }
  .time { color: var(--text-secondary); }
</style>
