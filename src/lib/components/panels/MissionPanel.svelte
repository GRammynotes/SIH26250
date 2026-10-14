<script lang="ts">
  import SvelteVirtualList from '@humanspeak/svelte-virtual-list';
  import { system } from '../../stores/systemStore.svelte';
  import type { Mission } from '../../types';

  let { onMissionSelect, onCollapse }: { onMissionSelect?: (missionId: string) => void; onCollapse?: () => void } = $props();

  let search = $state('');
  let filter = $state('ALL');
  let groupBy = $state<'PRIORITY' | 'STATUS' | 'TARGET TYPE'>('PRIORITY');
  let expandedMission = $state<string | null>(null);
  const filters = ['ALL', 'P1', 'P2', 'P3', 'ACTIVE', 'COMPLETE'];
  const visibleMissions = $derived.by(() => system.missions
    .filter((mission) => filter === 'ALL' || (filter.startsWith('P') && mission.priority === Number(filter.slice(1))) || mission.status === filter)
    .filter((mission) => `${mission.name} ${mission.id} ${mission.targetType} ${mission.status}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name)));
  const groups = $derived.by(() => {
    const bucket = new Map<string, typeof visibleMissions>();
    for (const mission of visibleMissions) {
      const key = groupBy === 'PRIORITY' ? `P${mission.priority}` : groupBy === 'STATUS' ? mission.status : mission.targetType.toUpperCase().replace('-', ' ');
      bucket.set(key, [...(bucket.get(key) ?? []), mission]);
    }
    return [...bucket.entries()];
  });

  function priColor(p: number) {
    return p === 1 ? 'var(--accent-red)' : p === 2 ? 'var(--accent-amber)' : 'var(--text-muted)';
  }

  function launch(missionId: string) {
    const coa = system.coas.find((c) => c.id === system.selectedCoaId) ?? system.coas[0];
    if (!coa) return;
    const ids = coa.assignments[missionId] ?? [];
    if (ids.length === 0) return;
    // Pick the template based on the target type
    const mission = system.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const map: Record<string, string> = {
      'hardened-bunker': 'sindoor_deep',
      'radar-site': 'sead_suppression',
      'troop-concentration': 'balakot',
      'c2-node': 'sindoor_deep',
      'bridge': 'sindoor_deep',
      'fuel-depot': 'sindoor_deep',
      'runway': 'sindoor_deep',
      'ship': 'sead_suppression',
      'aircraft': 'sead_suppression',
    };
    const templateId = map[mission.targetType] ?? 'sindoor_deep';
    system.startMission(missionId, ids, templateId);
  }

  function handleExecute(missionId: string) {
    if (onMissionSelect) {
      onMissionSelect(missionId);
    } else {
      launch(missionId);
    }
  }

  function handleMissionRowKeydown(event: KeyboardEvent, missionId: string) {
    const row = event.currentTarget as HTMLElement;
    const rows = Array.from(row.parentElement?.querySelectorAll<HTMLElement>('.row[tabindex="-1"]') ?? []);
    const index = rows.indexOf(row);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      rows[(index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length]?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onMissionSelect?.(missionId);
    }
  }
</script>

{#snippet missionRow(m: Mission)}
  <div class="row" class:expanded={expandedMission === m.id} style="border-left:3px solid {priColor(m.priority)}" tabindex="-1" role="group" aria-label="Mission {m.name}, priority {m.priority}" onkeydown={(event) => handleMissionRowKeydown(event, m.id)} onclick={(event) => { if (!(event.target as HTMLElement).closest('button')) onMissionSelect?.(m.id); }}>
    <div class="line1"><span class="name">{m.name}</span><div class="line1-right">{#if !m.feasible}<span class="infeasible-badge">INFEASIBLE</span>{/if}<span class="pri" style="color:{priColor(m.priority)};border-color:{priColor(m.priority)};">P{m.priority}</span></div></div>
    {#if expandedMission === m.id}<div class="line2"><span class="coords">{m.target.lat.toFixed(3)}N · {m.target.lng.toFixed(3)}E</span><span class="risk">RISK {m.riskLevel}</span></div><div class="riskbar"><div class="fill" style="width:{m.riskLevel}%;background:{priColor(m.priority)};"></div></div><div class="type-row"><span class="target-type">{m.targetType.toUpperCase().replace('-', ' ')}</span>{#if m.status === 'PLANNED' && system.coas.length > 0}<span class="state-planned">PLANNED</span>{:else if m.status === 'ACTIVE'}<span class="state-active">● IN FLIGHT</span>{:else if m.status === 'COMPLETE'}<span class="state-complete">✓ COMPLETE</span>{/if}</div>{/if}
    <div class="quick-actions"><button onclick={() => onMissionSelect?.(m.id)}>BRIEF</button>{#if m.status === 'PLANNED'}<button class="execute-action" disabled={!system.coas.length || !m.feasible} onclick={() => handleExecute(m.id)}>EXECUTE</button>{/if}<button onclick={() => expandedMission = expandedMission === m.id ? null : m.id} aria-expanded={expandedMission === m.id}>DETAILS</button></div>
    {#if expandedMission === m.id}<div class="detail-row">ID {m.id} · STATUS {m.status} · TARGET {m.targetType.toUpperCase()} · FEASIBLE {m.feasible ? 'YES' : 'NO'}</div>{/if}
  </div>
{/snippet}

<div class="mission-block corners">
  <div class="hdr">
    <span>MISSIONS</span>
    <span class="hdr-actions"><span class="count">{system.missions.length} QUEUED</span><button class="chevron" aria-label="Collapse left panels" title="Collapse left panels" onclick={() => onCollapse?.()}>‹</button></span>
  </div>
  <div class="mission-tools">
    <input bind:value={search} placeholder="SEARCH MISSIONS" aria-label="Search missions" />
    <div class="chips" role="group" aria-label="Mission filters">
      {#each filters as chip}<button class:active={filter === chip} onclick={() => filter = chip}>{chip}</button>{/each}
    </div>
    <button class="group-toggle" aria-label="Change mission grouping" title="Change grouping: {groupBy}" onclick={() => groupBy = groupBy === 'PRIORITY' ? 'STATUS' : groupBy === 'STATUS' ? 'TARGET TYPE' : 'PRIORITY'}>GROUP: {groupBy} ↻</button>
  </div>
  <div class="list">
    {#if visibleMissions.length > 30}
      <SvelteVirtualList items={visibleMissions} itemKey={(item) => item.id} defaultEstimatedItemHeight={58} containerClass="mission-virtual" viewportClass="mission-viewport" viewportLabel="Mission queue">
        {#snippet renderItem(m)}{@render missionRow(m)}{/snippet}
      </SvelteVirtualList>
    {:else}
      {#each groups as [groupName, missions] (groupName)}<div class="group-label">{groupName} · {missions.length}</div>{#each missions as m (m.id)}{@render missionRow(m)}{/each}{:else}<div class="empty">NO MISSIONS MATCH THIS FILTER</div>{/each}
    {/if}
  </div>
</div>

<style>
  .mission-block { border-top: 1px solid var(--border-subtle); display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden; position: relative; }
  .hdr { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; }
  .hdr .count { color: var(--accent-amber); }
  .mission-tools { padding:6px 10px; border-bottom:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:6px; }
  .mission-tools input { width:100%; box-sizing:border-box; padding:6px 7px; background:var(--bg-base); border:1px solid var(--border-subtle); color:var(--text-primary); font:9px var(--font-mono); }
  .chips { display:flex; flex-wrap:wrap; gap:3px; }
  .chips button,.group-toggle { padding:4px 6px; background:transparent; border:1px solid var(--border-subtle); color:var(--text-muted); font:8px var(--font-mono); cursor:pointer; }
  .chips button.active,.chips button:hover,.group-toggle:hover { border-color:var(--accent-cyan); color:var(--accent-cyan); }
  .group-label { position:sticky; top:0; z-index:1; padding:4px 12px; background:var(--bg-base); color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.13em; }
  .hdr-actions { display:flex; align-items:center; gap:8px; } .chevron { border:0; background:transparent; color:var(--accent-cyan); cursor:pointer; font:14px var(--font-mono); }
  .list { flex: 1; overflow-y: auto; }
  :global(.mission-virtual) { height:100%; min-height:0; overflow:hidden; }
  :global(.mission-viewport) { height:100%; overflow-y:auto; }
  .list::-webkit-scrollbar { width: 3px; }
  .list::-webkit-scrollbar-thumb { background: var(--border-strong); }
  .row { padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); transition: background 0.12s; }
  .row:hover { background: var(--bg-elevated); }
  .quick-actions { display:flex; justify-content:flex-end; gap:4px; margin-top:4px; opacity:0; transition:opacity .15s; }
  .row:hover .quick-actions,.row:focus-within .quick-actions,.row.expanded .quick-actions { opacity:1; }
  .quick-actions button { padding:3px 5px; border:1px solid var(--border-strong); color:var(--accent-cyan); background:transparent; font:7px var(--font-mono); cursor:pointer; }
  .quick-actions button:disabled { opacity:.35; cursor:not-allowed; }
  .quick-actions button.execute-action { color:var(--accent-green); }
  .detail-row { padding-top:5px; color:var(--text-muted); font-size:8px; line-height:1.5; }
  .state-planned { color:var(--text-muted); font-size:8px; }
  .empty { padding:18px 12px; color:var(--text-muted); font:9px var(--font-mono); }
  .line1 { display: flex; justify-content: space-between; align-items: center; }
  .name { color: var(--accent-amber); font-size: 10px; letter-spacing: 0.08em; }
  .line1-right { display: flex; gap: 6px; align-items: center; }
  .infeasible-badge {
    font-size: 7px; padding: 1px 5px; border: 1px solid var(--accent-red);
    color: var(--accent-red); letter-spacing: 0.1em; font-weight: 700;
    background: rgba(255, 45, 124, 0.08);
  }
  .pri { font-size: 9px; padding: 1px 5px; border: 1px solid; letter-spacing: 0.1em; }
  .line2 { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
  .coords { color: var(--text-muted); font-size: 9px; }
  .risk { color: var(--text-muted); font-size: 9px; }
  .riskbar { height: 2px; background: var(--border-subtle); margin-top: 5px; position: relative; }
  .fill { height: 100%; }
  .type-row {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 6px;
  }
  .target-type { font-size: 8px; letter-spacing: 0.14em; color: var(--text-muted); }
  .launch {
    background: transparent;
    border: 1px solid var(--accent-green);
    color: var(--accent-green);
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.15em;
    padding: 3px 8px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .launch:hover { background: rgba(57,255,20,0.1); box-shadow: 0 0 8px rgba(57,255,20,0.4); }
  .state-active { color: var(--accent-cyan); font-size: 8px; letter-spacing: 0.15em; animation: pulse 1.4s ease-in-out infinite; }
  .state-complete { color: var(--accent-green); font-size: 8px; letter-spacing: 0.15em; }
</style>
