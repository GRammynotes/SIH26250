<script lang="ts">
  import { generateSystemState } from './lib/data/seed';
  import TacticalMap from './lib/components/map/TacticalMap.svelte';

  const state = generateSystemState();
  const zuluTime = new Date(state.timestamp).toISOString().slice(11, 19);
</script>

<div class="app-shell">
  <header class="topbar">
    <span class="title">AIR COMMAND</span>
    <span class="sep">//</span>
    <span class="classification">UNCLASSIFIED · EXERCISE</span>
    <span class="spacer"></span>
    <span class="metric">AC <b>{state.aircraft.length}</b></span>
    <span class="metric">MSN <b>{state.missions.length}</b></span>
    <span class="metric">THR <b>{state.threats.length}</b></span>
    <span class="sep">//</span>
    <span class="time">{zuluTime}Z</span>
  </header>

  <TacticalMap
    aircraft={state.aircraft}
    missions={state.missions}
    threats={state.threats}
  />

  <footer class="statusbar">
    <span class="dot"></span>
    <span>SYS ONLINE</span>
    <span class="sep">//</span>
    <span>LINK: LOCAL</span>
    <span class="sep">//</span>
    <span>MODE: PLANNING</span>
  </footer>
</div>

<style>
  :global(body) { overflow: hidden; }
  .app-shell { position: relative; width: 100vw; height: 100vh; overflow: hidden; }

  .topbar {
    position: absolute; top: 0; left: 0; right: 0; height: 32px;
    background: rgba(5, 6, 8, 0.94);
    border-bottom: 1px solid var(--border-subtle);
    display: flex; align-items: center; padding: 0 16px; gap: 16px;
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.15em;
    z-index: 10;
  }
  .title { color: var(--accent-cyan); font-weight: 700; }
  .classification { color: var(--accent-amber); }
  .sep { color: var(--border-strong); }
  .spacer { flex: 1; }
  .metric { color: var(--text-muted); }
  .metric b { color: var(--text-secondary); font-weight: 500; margin-left: 4px; }
  .time { color: var(--text-secondary); }

  .statusbar {
    position: absolute; bottom: 0; left: 0; right: 0; height: 24px;
    background: rgba(5, 6, 8, 0.94);
    border-top: 1px solid var(--border-subtle);
    display: flex; align-items: center; padding: 0 16px; gap: 12px;
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.15em;
    color: var(--text-muted);
    z-index: 10;
  }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent-green); box-shadow: 0 0 6px var(--accent-green); }
</style>
