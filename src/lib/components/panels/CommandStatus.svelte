<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  let { onToggleVisibility }: { onToggleVisibility?: () => void } = $props();
  const maxThreat = $derived(Math.max(0, ...system.threats.map((threat) => threat.probability)));
  const threatLevel = $derived(maxThreat >= 80 ? 'ELEVATED' : maxThreat >= 60 ? 'HIGH' : 'GUARDED');
  const nextDecision = $derived(system.activeMissions.find((mission) => mission.pendingDecision)?.missionName ?? (system.activeMissions.length ? 'MONITOR ACTIVE TASKING' : 'AWAITING COMMANDER TASKING'));
  const link = $derived(system.spoofedTrackId ? 'COMPROMISED' : system.mode === 'DEGRADED' ? 'DEGRADED' : 'SIMULATED · SECURE');
</script>

<section class="command-status" aria-label="Command status" data-tour="command-status">
  <header><strong>COMMAND STATUS</strong><span>EXERCISE <button class="hide-panel" aria-label="Hide command status" title="Hide command status" onclick={() => onToggleVisibility?.()}>◉</button></span></header>
  <div class="row"><span>THREAT LEVEL</span><b class:danger={threatLevel === 'ELEVATED'} class:amber={threatLevel === 'HIGH'}><i>{threatLevel === 'ELEVATED' ? '▲' : threatLevel === 'HIGH' ? '◆' : '●'}</i>{threatLevel}</b></div>
  <div class="row"><span>NEXT DECISION</span><b class="decision">{nextDecision}</b></div>
  <div class="row"><span>COMMS</span><b class:danger={system.spoofedTrackId !== null} class:amber={system.mode === 'DEGRADED' && !system.spoofedTrackId}><i>{system.spoofedTrackId ? '×' : system.mode === 'DEGRADED' ? '△' : '✓'}</i>{link}</b></div>
  <div class="row"><span>SECURITY</span><b class:danger={system.spoofedTrackId !== null} class:amber={system.mode === 'DEGRADED' && !system.spoofedTrackId}><i>{system.spoofedTrackId ? '×' : system.mode === 'DEGRADED' ? '△' : '✓'}</i>{system.spoofedTrackId ? 'LINK COMPROMISED' : system.mode === 'DEGRADED' ? 'KEY ROTATION DUE' : 'LINK SECURE'}</b></div>
</section>

<style>
  .command-status { height:100%; box-sizing:border-box; padding:8px 12px; background:var(--bg-panel); font:8px var(--font-mono); overflow:auto; }
  header { display:flex; justify-content:space-between; padding-bottom:8px; border-bottom:1px solid var(--border-subtle); color:var(--accent-cyan); letter-spacing:.12em; }
  header span { color:var(--text-muted); font-size:7px; }
  .hide-panel { margin-left:8px; border:0; background:transparent; color:var(--accent-cyan); cursor:pointer; font:10px var(--font-mono); }
  .row { display:grid; grid-template-columns:82px 1fr; gap:8px; align-items:center; padding:9px 0; border-bottom:1px solid rgba(26,34,51,.65); }
  .row span { color:var(--text-muted); font-size:7px; letter-spacing:.1em; }.row b { color:var(--accent-green); font-size:8px; font-weight:500; }.row i { display:inline-grid; place-items:center; width:12px; height:12px; margin-right:5px; border:1px solid currentColor; font-style:normal; }
  .row b.danger { color:var(--accent-red); }.row b.amber { color:var(--accent-amber); }.row b.decision { color:var(--accent-amber); line-height:1.5; }
</style>
