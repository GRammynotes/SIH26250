<script lang="ts">
  import SvelteVirtualList from '@humanspeak/svelte-virtual-list';
  import { system } from '../../stores/systemStore.svelte';
  import { WEAPONS } from '../../data/weapons';
  import type { Aircraft } from '../../types';
  let { onCollapse, onToggleVisibility, onLoadout, onAssign }: { onCollapse?: () => void; onToggleVisibility?: () => void; onLoadout?: (type: string, tail: string) => void; onAssign?: (aircraftId: string, missionId: string) => void } = $props();

  let filter = $state('ALL');
  let sortBy = $state<'STATUS' | 'BASE' | 'TYPE' | 'FUEL'>('STATUS');
  let assigningId = $state<string | null>(null);
  let expandedId = $state<string | null>(null);
  let filtersOpen = $state(false);
  const sorted = $derived([...system.scenarioAircraft]
    .filter((aircraft) => filter === 'ALL' || aircraft.status === filter)
    .sort((a, b) => {
      if (sortBy === 'STATUS') { const rank: Record<string, number> = { FMC: 0, PMC: 1, NMC: 2 }; return rank[a.status] - rank[b.status]; }
      if (sortBy === 'BASE') return a.base.localeCompare(b.base);
      if (sortBy === 'TYPE') return a.type.localeCompare(b.type);
      return b.fuel - a.fuel;
    }));

  const counts = $derived({
    fmc: system.scenarioAircraft.filter((a) => a.status === 'FMC').length,
    pmc: system.scenarioAircraft.filter((a) => a.status === 'PMC').length,
    nmc: system.scenarioAircraft.filter((a) => a.status === 'NMC').length,
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

  function openAircraft(aircraftId: string) {
    window.dispatchEvent(new CustomEvent('aircommand:entity-detail', { detail: { type: 'aircraft', id: aircraftId } }));
  }
</script>

{#snippet aircraftRow(ac: Aircraft)}
  {@const weapons = ac.weapons.map((id) => WEAPONS[id] ?? Object.values(WEAPONS).find((weapon) => weapon.name === id)).filter((weapon) => !!weapon)}
  <div class="row" tabindex="-1" role="group" aria-label="Aircraft {ac.tailNumber}, {ac.status}" onkeydown={(event) => handleAircraftRowKeydown(event, ac.id)}>
    <div class="line1"><div class="identity"><span class="aircraft-thumb" title={ac.type} aria-hidden="true">✈</span><button class="tail" title="Open aircraft detail" onclick={() => openAircraft(ac.id)}>{ac.tailNumber}</button></div><span class="status" title={ac.status === 'FMC' ? 'Fully mission capable' : ac.status === 'PMC' ? 'Partially mission capable' : 'Not mission capable'} style="color:{statusColor(ac.status)};" aria-label="{ac.status === 'FMC' ? 'Fully mission capable' : ac.status === 'PMC' ? 'Partially mission capable' : 'Not mission capable'}"><span class="status-glyph" aria-hidden="true">{ac.status === 'FMC' ? '✓' : ac.status === 'PMC' ? '◐' : '×'}</span>{ac.status}</span></div>
    <div class="line2" aria-label="Fuel remaining {ac.fuel} percent"><button class="type" title="Open aircraft detail" onclick={() => openAircraft(ac.id)}>{ac.type}</button><button class="base-link" title="Show base detail" onclick={() => system.selectBase(ac.base)}>{ac.base.toUpperCase()}</button><span class="fuel"><span class="track"><span class="bar" style="width:{ac.fuel}%;background:{statusColor(ac.status)};"></span></span><span class="txt">{ac.fuel}%</span></span></div>
    <div class="quick-actions"><button onclick={() => onLoadout?.(ac.type, ac.tailNumber)}>LOADOUT</button><button onclick={() => assigningId = assigningId === ac.id ? null : ac.id} aria-expanded={assigningId === ac.id}>ASSIGN</button><button onclick={() => expandedId = expandedId === ac.id ? null : ac.id} aria-expanded={expandedId === ac.id}>DETAILS</button></div>
    {#if assigningId === ac.id}<div class="mission-choices" aria-label="Choose mission for {ac.tailNumber}">{#each system.missions.filter((mission) => mission.status === 'PLANNED') as mission (mission.id)}<div><button class="mission-brief" title="Open mission brief" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:mission-brief', { detail: mission.id }))}>{mission.name}</button><button title="Assign aircraft to mission" onclick={() => { onAssign?.(ac.id, mission.id); assigningId = null; }}>ASSIGN</button></div>{:else}<span>NO PLANNED MISSIONS</span>{/each}</div>{/if}
    {#if expandedId === ac.id}<div class="details"><span title="Callsign">{ac.callsign ?? 'EXERCISE FLIGHT'}</span><span>CREW {ac.crewRest}H · HDG {ac.heading}°</span><div class="weapon-glyphs" aria-label="Loaded weapons">{#each weapons as weapon (weapon!.id)}<button title="{weapon!.name} · {weapon!.rangeKm} km" aria-label="Weapon detail: {weapon!.name}" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:weapon-detail', { detail: weapon!.id }))}>⌖</button>{/each}</div></div>{/if}
  </div>
{/snippet}

<aside class="panel corners" data-tour="roster">
  <div class="hdr">
    <span>FORCE ROSTER</span>
    <span class="hdr-actions"><span class="count">{system.scenarioAircraft.length} TRACKED</span><button class="chevron" aria-label="Hide force roster" title="Hide force roster" onclick={() => onToggleVisibility?.()}>◉</button><button class="chevron" aria-label="Collapse left panels" title="Collapse left panels" onclick={() => onCollapse?.()}>‹</button></span>
  </div>
  <div class="sub">
    <span style="color:var(--accent-green);">✓ FMC {counts.fmc}</span>
    <span style="color:var(--accent-amber);">◐ PMC {counts.pmc}</span>
    <span style="color:var(--accent-red);">× NMC {counts.nmc}</span>
  </div>
  <div class="asset-tools">
    <button class="sort-toggle" aria-expanded={filtersOpen} onclick={() => filtersOpen = !filtersOpen}>FILTER {filtersOpen ? '▲' : '▼'}</button>
    {#if filtersOpen}<div class="chips" role="group" aria-label="Aircraft status filters">
      {#each ['ALL', 'FMC', 'PMC', 'NMC'] as chip}<button class:active={filter === chip} onclick={() => filter = chip}>{chip}</button>{/each}
    </div>
    <button class="sort-toggle" aria-label="Change aircraft sort order" title="Change sort order: {sortBy}" onclick={() => sortBy = sortBy === 'STATUS' ? 'BASE' : sortBy === 'BASE' ? 'TYPE' : sortBy === 'TYPE' ? 'FUEL' : 'STATUS'}>SORT: {sortBy} ↻</button>{/if}
  </div>
  <div class="list">
    {#if sorted.length > 30}
      <SvelteVirtualList items={sorted} itemKey={(item) => item.id} defaultEstimatedItemHeight={58} containerClass="aircraft-virtual" viewportClass="aircraft-viewport" viewportLabel="Aircraft roster">
        {#snippet renderItem(ac)}{@render aircraftRow(ac)}{/snippet}
      </SvelteVirtualList>
    {:else}
      {#if sorted.length === 0}<div class="empty-state"><b>[ NO DATA ]</b><span>Adjust filters to show available aircraft.</span></div>{:else}{#each sorted as ac (ac.id)}{@render aircraftRow(ac)}{/each}{/if}
    {/if}
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
  .empty-state { min-height:140px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; color:var(--text-muted); text-align:center; font:8px var(--font-mono); letter-spacing:.1em; }
  .empty-state b { color:var(--accent-cyan); font-size:10px; }
  :global(.aircraft-virtual) { height:100%; min-height:0; overflow:hidden; }
  :global(.aircraft-viewport) { height:100%; overflow-y:auto; }
  .list::-webkit-scrollbar { width: 3px; }
  .list::-webkit-scrollbar-thumb { background: var(--border-strong); }
  .row { padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); transition: background 0.12s; }
  .row:hover,.row:focus-visible { background: var(--bg-elevated); outline:1px solid var(--accent-cyan); outline-offset:-1px; }
  .quick-actions { display:flex; justify-content:flex-end; gap:4px; margin-top:4px; opacity:0; transition:opacity .15s; }
  .row:hover .quick-actions,.row:focus-within .quick-actions { opacity:1; }
  @media (max-width:1100px) { .hdr { gap:3px; padding:8px 6px 5px; font-size:7px; letter-spacing:.08em; white-space:nowrap; }.hdr .count { display:none; }.hdr-actions { gap:1px; }.chevron { padding:2px; }.sub { justify-content:space-between; gap:3px; padding:0 6px 6px; font-size:6px; letter-spacing:0; }.asset-tools { justify-content:flex-start; }.chips { flex-wrap:wrap; gap:2px; }.chips button,.sort-toggle { padding:3px; font-size:6px; } }
  .quick-actions button,.mission-choices button { padding:3px 5px; border:1px solid var(--border-strong); color:var(--accent-cyan); background:transparent; font:7px var(--font-mono); cursor:pointer; }
  .mission-choices { display:flex; flex-direction:column; gap:4px; padding-top:5px; }
  .mission-choices>div { display:flex; justify-content:space-between; align-items:center; gap:6px; }
  .mission-choices button.mission-brief { flex:1; text-align:left; }
  .mission-choices span,.details { color:var(--text-muted); font:8px var(--font-mono); padding-top:5px; }
  .details { display:grid; grid-template-columns:1fr auto; gap:5px; }
  .weapon-glyphs { grid-column:1/-1; display:flex; gap:4px; }
  .weapon-glyphs button { width:23px; height:21px; border:1px solid var(--border-strong); color:var(--accent-cyan); background:transparent; cursor:pointer; }
  .line1 { display: flex; justify-content: space-between; align-items: center; }
  .identity { display:flex; align-items:center; gap:7px; }
  .aircraft-thumb { display:grid; place-items:center; width:36px; height:28px; border:1px solid var(--border-subtle); color:var(--accent-cyan); font-size:17px; }
  .tail { padding:0; border:0; background:transparent; color:var(--accent-cyan); font:11px var(--font-mono); letter-spacing:.08em; cursor:pointer; }
  .status { display: flex; align-items: center; gap: 5px; font-size: 9px; letter-spacing: 0.12em; }
  .status-glyph { display:grid; place-items:center; width:12px; height:12px; border:1px solid currentColor; font:9px/1 var(--font-mono); }
  .line2 { display: flex; justify-content: space-between; align-items: center; gap:5px; margin-top: 4px; }
  .type { padding:0; border:0; background:transparent; color:var(--text-muted); font:8px var(--font-mono); cursor:pointer; text-align:left; }
  .type:hover { text-decoration:underline; }
  .base-link { padding:0; border:0; background:transparent; color:var(--text-muted); font:7px var(--font-mono); cursor:pointer; }
  .base-link:hover,.tail:hover { text-decoration:underline; }
  .fuel { display: flex; align-items: center; gap: 6px; }
  .track { display: inline-block; width: 40px; height: 3px; background: var(--border-subtle); position: relative; }
  .bar { display: block; height: 100%; }
  .txt { color: var(--text-muted); font-size: 9px; }
</style>
