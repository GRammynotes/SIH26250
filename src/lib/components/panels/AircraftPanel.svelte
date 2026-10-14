<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  let { onCollapse }: { onCollapse?: () => void } = $props();

  const sorted = $derived(
    [...system.aircraft].sort((a, b) => {
      const rank: Record<string, number> = { FMC: 0, PMC: 1, NMC: 2 };
      return rank[a.status] - rank[b.status];
    }),
  );

  const counts = $derived({
    fmc: system.aircraft.filter((a) => a.status === 'FMC').length,
    pmc: system.aircraft.filter((a) => a.status === 'PMC').length,
    nmc: system.aircraft.filter((a) => a.status === 'NMC').length,
  });

  function statusColor(s: string) {
    return s === 'FMC' ? 'var(--accent-green)' : s === 'PMC' ? 'var(--accent-amber)' : 'var(--accent-red)';
  }
</script>

<aside class="panel corners">
  <div class="hdr">
    <span>ASSETS</span>
    <span class="hdr-actions"><span class="count">{system.aircraft.length} TRACKED</span><button class="chevron" aria-label="Collapse left panels" title="Collapse left panels" onclick={() => onCollapse?.()}>‹</button></span>
  </div>
  <div class="sub">
    <span style="color:var(--accent-green);">FMC {counts.fmc}</span>
    <span style="color:var(--accent-amber);">PMC {counts.pmc}</span>
    <span style="color:var(--accent-red);">NMC {counts.nmc}</span>
  </div>
  <div class="list">
    {#each sorted as ac (ac.id)}
      <div class="row">
        <div class="line1">
          <span class="tail">{ac.tailNumber}</span>
          <span class="status" style="color:{statusColor(ac.status)};">
            <span class="dot" style="background:{statusColor(ac.status)};box-shadow:0 0 5px {statusColor(ac.status)};"></span>
            {ac.status}
          </span>
        </div>
        <div class="line2">
          <span class="type">{ac.type}</span>
          <span class="fuel">
            <span class="track"><span class="bar" style="width:{ac.fuel}%;background:{statusColor(ac.status)};"></span></span>
            <span class="txt">{ac.fuel}%</span>
          </span>
        </div>
      </div>
    {/each}
  </div>
</aside>

<style>
  .panel { background: var(--bg-panel); display: flex; flex-direction: column; overflow: hidden; position: relative; height: 100%; }
  .hdr { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px 6px; font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; }
  .hdr .count { color: var(--accent-cyan); }
  .hdr-actions { display:flex; align-items:center; gap:8px; } .chevron { border:0; background:transparent; color:var(--accent-cyan); cursor:pointer; font:14px var(--font-mono); }
  .sub { display: flex; gap: 12px; padding: 0 12px 8px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.1em; }
  .list { flex: 1; overflow-y: auto; }
  .list::-webkit-scrollbar { width: 3px; }
  .list::-webkit-scrollbar-thumb { background: var(--border-strong); }
  .row { padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); transition: background 0.12s; }
  .row:hover { background: var(--bg-elevated); }
  .line1 { display: flex; justify-content: space-between; align-items: center; }
  .tail { color: var(--accent-cyan); font-size: 11px; letter-spacing: 0.08em; }
  .status { display: flex; align-items: center; gap: 5px; font-size: 9px; letter-spacing: 0.12em; }
  .dot { width: 5px; height: 5px; }
  .line2 { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  .type { color: var(--text-muted); font-size: 10px; }
  .fuel { display: flex; align-items: center; gap: 6px; }
  .track { display: inline-block; width: 40px; height: 3px; background: var(--border-subtle); position: relative; }
  .bar { display: block; height: 100%; }
  .txt { color: var(--text-muted); font-size: 9px; }
</style>
