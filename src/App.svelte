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

  .left {
    grid-area: left;
    display: grid;
    grid-template-rows: minmax(0, 1.15fr) minmax(0, 1fr);
    gap: 1px;
    background: #1a242e;
    overflow: hidden;
  }

  .center {
    grid-area: center;
    position: relative;
    overflow: hidden;
    background: #050608;
  }
</style>
