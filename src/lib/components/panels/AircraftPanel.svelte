<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  let { onCollapse, onLoadout, onAssign }: { onCollapse?: () => void; onLoadout?: (type: string, tail: string) => void; onAssign?: (aircraftId: string, missionId: string) => void } = $props();

  let filter = $state('ALL');
  let sortBy = $state<'STATUS' | 'BASE' | 'TYPE' | 'FUEL'>('STATUS');
  let assigningId = $state<string | null>(null);
  let expandedId = $state<string | null>(null);
  const sorted = $derived([...system.aircraft]
    .filter((aircraft) => filter === 'ALL' || aircraft.status === filter)
    .sort((a, b) => {
      if (sortBy === 'STATUS') { const rank: Record<string, number> = { FMC: 0, PMC: 1, NMC: 2 }; return rank[a.status] - rank[b.status]; }
      if (sortBy === 'BASE') return a.base.localeCompare(b.base);
      if (sortBy === 'TYPE') return a.type.localeCompare(b.type);
      return b.fuel - a.fuel;
    }));

  const counts = $derived({
    fmc: system.aircraft.filter((a) => a.status === 'FMC').length,
    pmc: system.aircraft.filter((a) => a.status === 'PMC').length,
    nmc: system.aircraft.filter((a) => a.status === 'NMC').length,
  });

  function statusColor(s: string) {
    return s === 'FMC' ? 'var(--accent-green)' : s === 'PMC' ? 'var(--accent-amber)' : 'var(--accent-red)';
  }

  function handleAircraftRowKeydown(event: KeyboardEvent, aircraftId: string) {
    const row = event.currentTarget as HTMLElement;
    const rows = Array.from(row.parentElement?.querySelectorAll<HTMLElement>('.row[tabindex="-1"]') ?? []);
    const index = rows.indexOf(row);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      rows[(index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length]?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      expandedId = expandedId === aircraftId ? null : aircraftId;
    }
  }
</script>

<aside class="panel corners">
  <div class="hdr">
    <span>FORCE ROSTER</span>
    <span class="hdr-actions"><span class="count">{system.aircraft.length} TRACKED</span><button class="chevron" aria-label="Collapse left panels" title="Collapse left panels" onclick={() => onCollapse?.()}>‹</button></span>
  </div>
  <div class="sub">
    <span style="color:var(--accent-green);">✓ FMC {counts.fmc}</span>
    <span style="color:var(--accent-amber);">◐ PMC {counts.pmc}</span>
    <span style="color:var(--accent-red);">× NMC {counts.nmc}</span>
  </div>
  <div class="asset-tools">
    <div class="chips" role="group" aria-label="Aircraft status filters">
      {#each ['ALL', 'FMC', 'PMC', 'NMC'] as chip}<button class:active={filter === chip} onclick={() => filter = chip}>{chip}</button>{/each}
    </div>
    <button class="sort-toggle" aria-label="Change aircraft sort order" title="Change sort order: {sortBy}" onclick={() => sortBy = sortBy === 'STATUS' ? 'BASE' : sortBy === 'BASE' ? 'TYPE' : sortBy === 'TYPE' ? 'FUEL' : 'STATUS'}>SORT: {sortBy} ↻</button>
  </div>
  <div class="list">
    {#each sorted as ac (ac.id)}
      <div class="row" tabindex="-1" role="group" aria-label="Aircraft {ac.tailNumber}, {ac.status}" onkeydown={(event) => handleAircraftRowKeydown(event, ac.id)}>
        <div class="line1">
          <span class="tail">{ac.tailNumber}</span>
          <span class="status" style="color:{statusColor(ac.status)};" aria-label="{ac.status === 'FMC' ? 'Fully mission capable' : ac.status === 'PMC' ? 'Partially mission capable' : 'Not mission capable'}">
            <span class="status-glyph" aria-hidden="true">{ac.status === 'FMC' ? '✓' : ac.status === 'PMC' ? '◐' : '×'}</span>
            {ac.status}
          </span>
        </div>
        <div class="line2" aria-label="Fuel remaining {ac.fuel} percent">
          {#if expandedId === ac.id}<span class="type">{ac.type}</span>{/if}
          <span class="fuel">
            <span class="track"><span class="bar" style="width:{ac.fuel}%;background:{statusColor(ac.status)};"></span></span>
            {#if expandedId === ac.id}<span class="txt">{ac.fuel}%</span>{/if}
          </span>
        </div>
        <div class="quick-actions">
          <button onclick={() => onLoadout?.(ac.type, ac.tailNumber)}>LOADOUT</button>
          <button onclick={() => assigningId = assigningId === ac.id ? null : ac.id} aria-expanded={assigningId === ac.id}>ASSIGN</button>
          <button onclick={() => expandedId = expandedId === ac.id ? null : ac.id} aria-expanded={expandedId === ac.id}>DETAILS</button>
        </div>
        {#if assigningId === ac.id}
          <div class="mission-choices" aria-label="Choose mission for {ac.tailNumber}">
            {#each system.missions.filter((mission) => mission.status === 'PLANNED') as mission (mission.id)}
              <button onclick={() => { onAssign?.(ac.id, mission.id); assigningId = null; }}>{mission.name}</button>
            {:else}<span>NO PLANNED MISSIONS</span>{/each}
          </div>
        {/if}
        {#if expandedId === ac.id}<div class="details">{ac.callsign ?? 'EXERCISE FLIGHT'} · {ac.type} · BASE {ac.base.toUpperCase()} · FUEL {ac.fuel}% · CREW REST {ac.crewRest}H · HEADING {ac.heading}° · EXERCISE LOAD {ac.weapons.join(', ')}</div>{/if}
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
  .asset-tools { display:flex; align-items:center; justify-content:space-between; gap:4px; flex-wrap:wrap; padding:6px 8px; border-bottom:1px solid var(--border-subtle); }
  .chips { display:flex; gap:3px; } .chips button,.sort-toggle { padding:4px 5px; background:transparent; border:1px solid var(--border-subtle); color:var(--text-muted); font:8px var(--font-mono); cursor:pointer; }
  .chips button.active,.chips button:hover,.sort-toggle:hover { border-color:var(--accent-cyan); color:var(--accent-cyan); }
  .list { flex: 1; overflow-y: auto; }
  .list::-webkit-scrollbar { width: 3px; }
  .list::-webkit-scrollbar-thumb { background: var(--border-strong); }
  .row { padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); transition: background 0.12s; }
  .row:hover,.row:focus-visible { background: var(--bg-elevated); outline:1px solid var(--accent-cyan); outline-offset:-1px; }
  .quick-actions { display:flex; justify-content:flex-end; gap:4px; margin-top:4px; opacity:0; transition:opacity .15s; }
  .row:hover .quick-actions,.row:focus-within .quick-actions { opacity:1; }
  .quick-actions button,.mission-choices button { padding:3px 5px; border:1px solid var(--border-strong); color:var(--accent-cyan); background:transparent; font:7px var(--font-mono); cursor:pointer; }
  .mission-choices { display:flex; flex-wrap:wrap; gap:4px; padding-top:5px; }
  .mission-choices span,.details { color:var(--text-muted); font:8px var(--font-mono); padding-top:5px; }
  .line1 { display: flex; justify-content: space-between; align-items: center; }
  .tail { color: var(--accent-cyan); font-size: 11px; letter-spacing: 0.08em; }
  .status { display: flex; align-items: center; gap: 5px; font-size: 9px; letter-spacing: 0.12em; }
  .status-glyph { display:grid; place-items:center; width:12px; height:12px; border:1px solid currentColor; font:9px/1 var(--font-mono); }
  .line2 { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  .type { color: var(--text-muted); font-size: 10px; }
  .fuel { display: flex; align-items: center; gap: 6px; }
  .track { display: inline-block; width: 40px; height: 3px; background: var(--border-subtle); position: relative; }
  .bar { display: block; height: 100%; }
  .txt { color: var(--text-muted); font-size: 9px; }
</style>
