<script lang="ts">
  import type { Aircraft } from '../../types';

  let { aircraft = [] }: { aircraft?: Aircraft[] } = $props();

  const sorted = $derived(
    [...aircraft].sort((a, b) => {
      const rank: Record<string, number> = { FMC: 0, PMC: 1, NMC: 2 };
      return rank[a.status] - rank[b.status];
    })
  );

  function statusColor(s: string) {
    return s === 'FMC' ? 'var(--accent-green)' : s === 'PMC' ? 'var(--accent-amber)' : 'var(--accent-red)';
  }
</script>

<aside class="panel">
  <div class="hdr">
    <span>ASSETS</span>
    <span class="count">{aircraft.length} TRACKED</span>
  </div>
  <div class="list">
    {#each sorted as ac (ac.id)}
      <div class="row">
        <div class="line1">
          <span class="tail">{ac.tailNumber}</span>
          <span class="status" style="color:{statusColor(ac.status)};">
            <span class="dot" style="background:{statusColor(ac.status)};"></span>
            {ac.status}
          </span>
        </div>
        <div class="line2">
          <span class="type">{ac.type}</span>
          <span class="fuel">
            <span class="bar" style="width:{ac.fuel}%;background:{statusColor(ac.status)};"></span>
            <span class="txt">{ac.fuel}%</span>
          </span>
        </div>
      </div>
    {/each}
  </div>
</aside>

<style>
  .panel {
    grid-area: left;
    background: var(--bg-panel);
    border-right: 1px solid var(--border-subtle);
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .hdr {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
    color: var(--text-muted); text-transform: uppercase;
  }
  .hdr .count { color: var(--accent-cyan); }
  .list { flex: 1; overflow-y: auto; }
  .list::-webkit-scrollbar { width: 4px; }
  .list::-webkit-scrollbar-thumb { background: var(--border-strong); }
  .row {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-mono);
  }
  .row:hover { background: var(--bg-elevated); }
  .line1 { display: flex; justify-content: space-between; align-items: center; }
  .tail { color: var(--accent-cyan); font-size: 11px; letter-spacing: 0.05em; }
  .status { display: flex; align-items: center; gap: 4px; font-size: 9px; letter-spacing: 0.1em; }
  .dot { width: 6px; height: 6px; }
  .line2 { display: flex; justify-content: space-between; align-items: center; margin-top: 3px; }
  .type { color: var(--text-muted); font-size: 10px; }
  .fuel { display: flex; align-items: center; gap: 4px; }
  .fuel .bar { display: inline-block; height: 3px; min-width: 2px; max-width: 40px; }
  .fuel .txt { color: var(--text-muted); font-size: 9px; }
</style>
