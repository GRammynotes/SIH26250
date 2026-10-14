<script lang="ts" module>
  export type MissionPhase = 'INGRESS' | 'WEZ' | 'RELEASE' | 'EGRESS' | 'RTB';

  export interface TimelinePhase {
    phase: MissionPhase;
    etaMinutes: number;
    status?: 'complete' | 'current' | 'pending';
  }
</script>

<script lang="ts">
  import type { MissionPhase, TimelinePhase } from './MissionTimeline.svelte';

  let {
    currentPhase = 'INGRESS' as MissionPhase,
    phases = [
      { phase: 'INGRESS' as MissionPhase, etaMinutes: 12 },
      { phase: 'WEZ' as MissionPhase, etaMinutes: 8 },
      { phase: 'RELEASE' as MissionPhase, etaMinutes: 5 },
      { phase: 'EGRESS' as MissionPhase, etaMinutes: 14 },
      { phase: 'RTB' as MissionPhase, etaMinutes: 22 },
    ] as TimelinePhase[],
    missionName = 'UNASSIGNED',
  }: {
    currentPhase?: MissionPhase;
    phases?: TimelinePhase[];
    missionName?: string;
  } = $props();

  const currentIndex = $derived(phases.findIndex((p) => p.phase === currentPhase));

  function statusFor(index: number): 'complete' | 'current' | 'pending' {
    if (index < currentIndex) return 'complete';
    if (index === currentIndex) return 'current';
    return 'pending';
  }
</script>

<section class="timeline">
  <header>
    <div>
      <span class="eyebrow">MISSION SEQUENCE</span>
      <h2>EXECUTION TIMELINE</h2>
    </div>
    <div class="right">
      <span class="mission-id">{missionName}</span>
      <span class="current-phase">{currentPhase}</span>
    </div>
  </header>

  <div class="track">
    {#each phases as phase, index (phase.phase)}
      {@const status = statusFor(index)}
      <div class="phase {status}">
        <div class="marker">{status === 'complete' ? '✓' : index + 1}</div>
        <div class="connector {status}"></div>
        <strong>{phase.phase}</strong>
        <small>T−{phase.etaMinutes} MIN</small>
      </div>
    {/each}
  </div>
</section>

<style>
  .timeline {
    padding: 12px 16px;
    border: 1px solid var(--border-subtle);
    background: var(--bg-panel);
    font-family: var(--font-mono);
    position: relative;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
  }
  .eyebrow {
    display: block;
    color: var(--accent-cyan);
    font-size: 9px;
    letter-spacing: 0.2em;
    margin-bottom: 2px;
  }
  h2 {
    font-size: 11px;
    letter-spacing: 0.15em;
    color: var(--text-primary);
    margin: 0;
    font-weight: 500;
  }
  .right { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
  .mission-id { font-size: 9px; color: var(--text-muted); letter-spacing: 0.15em; }
  .current-phase { font-size: 10px; color: var(--accent-cyan); letter-spacing: 0.15em; }

  .track { display: flex; position: relative; }
  .phase {
    position: relative;
    display: grid;
    flex: 1;
    justify-items: center;
    gap: 5px;
    text-align: center;
  }
  .marker {
    z-index: 1;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 1px solid var(--border-strong);
    background: var(--bg-base);
    color: var(--text-muted);
    font-size: 10px;
    transition: all 0.3s;
  }
  .phase.complete .marker { color: var(--accent-green); border-color: var(--accent-green); box-shadow: 0 0 8px color-mix(in srgb, var(--accent-green) 40%, transparent); }
  .phase.current .marker {
    color: var(--accent-cyan);
    border-color: var(--accent-cyan);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-cyan) 60%, transparent);
    animation: pulse 1.5s ease-in-out infinite;
  }

  .connector {
    position: absolute;
    top: 11px;
    left: calc(50% + 11px);
    width: calc(100% - 22px);
    height: 1px;
    background: var(--border-subtle);
  }
  .connector.complete { background: var(--accent-green); opacity: 0.6; }
  .connector.current { background: linear-gradient(90deg, var(--accent-cyan), var(--border-subtle)); }

  strong { font-size: 9px; letter-spacing: 0.12em; color: var(--text-primary); font-weight: 500; }
  small { color: var(--text-muted); font-size: 8px; letter-spacing: 0.1em; }
</style>
