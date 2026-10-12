<script lang="ts">
  import { generateSystemState } from './lib/data/seed';
  import TopBar from './lib/components/layout/TopBar.svelte';
  import TacticalMap from './lib/components/map/TacticalMap.svelte';
  import AircraftPanel from './lib/components/panels/AircraftPanel.svelte';
  import MissionPanel from './lib/components/panels/MissionPanel.svelte';
  import COAPanel from './lib/components/panels/COAPanel.svelte';
  import EventLog from './lib/components/panels/EventLog.svelte';

  const state = generateSystemState();
</script>

<div class="shell">
  <TopBar
    aircraftCount={state.aircraft.length}
    missionCount={state.missions.length}
    threatCount={state.threats.length}
  />

  <aside class="left">
    <AircraftPanel aircraft={state.aircraft} />
    <MissionPanel missions={state.missions} />
  </aside>

  <section class="center">
    <TacticalMap
      aircraft={state.aircraft}
      missions={state.missions}
      threats={state.threats}
    />
  </section>

  <COAPanel />

  <EventLog />
</div>

<style>
  :global(body) { margin: 0; overflow: hidden; background: var(--bg-base); }
  :global(#app) { width: 100vw; height: 100vh; }

  .shell {
    width: 100vw; height: 100vh;
    display: grid;
    grid-template-rows: 32px 1fr 96px;
    grid-template-columns: 240px 1fr 320px;
    grid-template-areas:
      "topbar topbar topbar"
      "left   center right"
      "log    log    log";
    background: var(--bg-base);
  }

  .left {
    grid-area: left;
    display: flex; flex-direction: column;
    background: var(--bg-panel);
    border-right: 1px solid var(--border-subtle);
    overflow: hidden;
  }
  .left > :global(:first-child) { flex: 1; min-height: 0; }

  .center {
    grid-area: center;
    position: relative;
    overflow: hidden;
  }

  :global(.panel) { grid-area: unset; border: none !important; }
</style>
