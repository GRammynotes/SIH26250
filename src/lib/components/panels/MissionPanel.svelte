<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';

  const sorted = $derived([...system.missions].sort((a, b) => a.priority - b.priority));

  function priColor(p: number) {
    return p === 1 ? 'var(--accent-red)' : p === 2 ? 'var(--accent-amber)' : 'var(--text-muted)';
  }
</script>

<div class="mission-block corners">
  <div class="hdr">
    <span>MISSIONS</span>
    <span class="count">{system.missions.length} QUEUED</span>
  </div>
  <div class="list">
    {#each sorted as m (m.id)}
      <div class="row">
        <div class="line1">
          <span class="name">{m.name}</span>
          <span class="pri" style="color:{priColor(m.priority)};border-color:{priColor(m.priority)};">P{m.priority}</span>
        </div>
        <div class="line2">
          <span class="coords">{m.target.lat.toFixed(3)}N · {m.target.lng.toFixed(3)}E</span>
          <span class="risk">RISK {m.riskLevel}</span>
        </div>
        <div class="riskbar"><div class="fill" style="width:{m.riskLevel}%;background:{priColor(m.priority)};"></div></div>
      </div>
    {/each}
  </div>
</div>

<style>
  .mission-block { border-top: 1px solid var(--border-subtle); display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; position: relative; }
  .hdr { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; }
  .hdr .count { color: var(--accent-amber); }
  .list { flex: 1; overflow-y: auto; }
  .list::-webkit-scrollbar { width: 3px; }
  .list::-webkit-scrollbar-thumb { background: var(--border-strong); }
  .row { padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); transition: background 0.12s; }
  .row:hover { background: var(--bg-elevated); }
  .line1 { display: flex; justify-content: space-between; align-items: center; }
  .name { color: var(--accent-amber); font-size: 10px; letter-spacing: 0.08em; }
  .pri { font-size: 9px; padding: 1px 5px; border: 1px solid; letter-spacing: 0.1em; }
  .line2 { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  .coords { color: var(--text-muted); font-size: 9px; }
  .risk { color: var(--text-muted); font-size: 9px; }
  .riskbar { height: 2px; background: var(--border-subtle); margin-top: 5px; position: relative; }
  .fill { height: 100%; }
</style>
