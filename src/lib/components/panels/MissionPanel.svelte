<script lang="ts">
  import type { Mission } from '../../types';

  let { missions = [] }: { missions?: Mission[] } = $props();

  const sorted = $derived([...missions].sort((a, b) => a.priority - b.priority));

  function priColor(p: number) {
    return p === 1 ? 'var(--accent-red)' : p === 2 ? 'var(--accent-amber)' : 'var(--text-muted)';
  }
</script>

<div class="mission-block">
  <div class="hdr">
    <span>MISSIONS</span>
    <span class="count">{missions.length} QUEUED</span>
  </div>
  {#each sorted as m (m.id)}
    <div class="row">
      <div class="line1">
        <span class="name">{m.name}</span>
        <span class="pri" style="color:{priColor(m.priority)};border-color:{priColor(m.priority)};">P{m.priority}</span>
      </div>
      <div class="line2">
        <span class="coords">{m.target.lat.toFixed(3)}, {m.target.lng.toFixed(3)}</span>
        <span class="risk">RISK {m.riskLevel}</span>
      </div>
      <div class="riskbar">
        <div class="fill" style="width:{m.riskLevel}%;background:{priColor(m.priority)};"></div>
      </div>
    </div>
  {/each}
</div>

<style>
  .mission-block {
    border-top: 1px solid var(--border-subtle);
    display: flex; flex-direction: column;
    max-height: 45%;
    overflow: hidden;
  }
  .hdr {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
    color: var(--text-muted); text-transform: uppercase;
  }
  .hdr .count { color: var(--accent-amber); }
  .row { padding: 6px 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); }
  .row:hover { background: var(--bg-elevated); }
  .line1 { display: flex; justify-content: space-between; align-items: center; }
  .name { color: var(--accent-amber); font-size: 10px; letter-spacing: 0.05em; }
  .pri { font-size: 9px; padding: 0 4px; border: 1px solid; }
  .line2 { display: flex; justify-content: space-between; align-items: center; margin-top: 2px; }
  .coords { color: var(--text-muted); font-size: 9px; }
  .risk { color: var(--text-muted); font-size: 9px; }
  .riskbar { height: 2px; background: var(--border-subtle); margin-top: 4px; }
  .fill { height: 100%; }
</style>
