<script lang="ts">
  import { system } from './lib/stores/systemStore.svelte';
  import TopBar from './lib/components/layout/TopBar.svelte';
  import TacticalMap from './lib/components/map/TacticalMap.svelte';
  import ScenarioControls from './lib/components/map/ScenarioControls.svelte';
  import AircraftPanel from './lib/components/panels/AircraftPanel.svelte';
  import MissionPanel from './lib/components/panels/MissionPanel.svelte';
  import COAPanel from './lib/components/panels/COAPanel.svelte';
  import EventLog from './lib/components/panels/EventLog.svelte';
</script>

<div class="shell">
  <TopBar
    aircraftCount={system.aircraft.length}
    missionCount={system.missions.length}
    threatCount={system.threats.length}
  />

  <aside class="left">
    <AircraftPanel />
    <MissionPanel />
  </aside>

  <section class="center">
    <TacticalMap />
    <ScenarioControls />
    {#if system.computing}
      <div class="computing mono">◢ COMPUTING COA · NSGA-II · 4 OBJECTIVES</div>
    {/if}
  </section>

  <COAPanel />
  <EventLog />
</div>

<style>
  :global(html, body) { margin: 0; padding: 0; overflow: hidden; background: var(--bg-base); }
  :global(#app) { width: 100vw; height: 100vh; }

  .shell {
    width: 100vw; height: 100vh;
    display: grid;
    grid-template-rows: 32px 1fr 96px;
    grid-template-columns: 260px 1fr 340px;
    grid-template-areas:
      "topbar topbar topbar"
      "left   center right"
      "log    log    log";
    background: #1a242e;
    gap: 1px;
  }
  .left { grid-area: left; display: grid; grid-template-rows: minmax(0, 1.15fr) minmax(0, 1fr); gap: 1px; background: #1a242e; overflow: hidden; }
  .center { grid-area: center; position: relative; overflow: hidden; background: #050608; }

  .computing {
    position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.18em;
    color: var(--accent-cyan);
    background: rgba(5,6,8,0.9);
    border: 1px solid var(--accent-cyan);
    padding: 6px 14px;
    box-shadow: 0 0 16px rgba(0,240,255,0.4);
    animation: pulse 0.9s ease-in-out infinite;
    z-index: 6;
  }
  .mono { font-family: var(--font-mono); }
</style>
