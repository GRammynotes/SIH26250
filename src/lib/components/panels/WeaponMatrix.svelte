<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { assessSingleAssignment } from '../../engine/weaponeering';
  import { WEAPONS } from '../../data/weapons';

  const selectedCoa = $derived(system.coas.find((coa) => coa.id === system.selectedCoaId) ?? system.coas[0]);
  const coverage = $derived([1, 2, 3].map((priority) => {
    const missions = system.scenarioMissions.filter((mission) => mission.priority === priority);
    const covered = missions.filter((mission) => (selectedCoa?.assignments[mission.id]?.length ?? 0) > 0).length;
    return { priority, covered, total: missions.length, percent: missions.length ? Math.round((covered / missions.length) * 100) : 0 };
  }));

  function assessment(aircraftId: string, missionId: string) {
    const aircraft = system.scenarioAircraft.find((item) => item.id === aircraftId);
    const mission = system.scenarioMissions.find((item) => item.id === missionId);
    if (!aircraft || !mission || aircraft.status === 'NMC') return null;
    return assessSingleAssignment(aircraft, mission.target, mission.targetType, system.scenarioThreats);
  }

  function highlight(aircraftId: string, missionId: string | null) {
    window.dispatchEvent(new CustomEvent('aircommand:matrix-highlight', { detail: { aircraftId, missionId } }));
  }
</script>

<section class="matrix-panel" aria-label="Weapon platform match matrix">
  <header><strong>MISSION PRIORITY</strong><span>SELECTED PLAN · {selectedCoa ? `OPTION ${selectedCoa.rank}` : 'STANDBY'}</span></header>
  <div class="mission-strip">
    {#each system.scenarioMissions as mission (mission.id)}
      <button aria-label="Brief {mission.name}, priority {mission.priority}" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:mission-brief', { detail: mission.id }))}>
        <i class="p{mission.priority}">P{mission.priority}</i><span>{mission.name}</span><b>{selectedCoa?.assignments[mission.id]?.length ?? 0}</b>
      </button>
    {/each}
  </div>

  <header class="matrix-heading"><strong>PLATFORM × TARGET</strong><span>HOVER / FOCUS TO LOCATE</span></header>
  <div class="matrix-scroll">
    <table>
      <thead><tr><th>TAIL</th>{#each system.scenarioMissions as mission (mission.id)}<th title="{mission.name} · P{mission.priority}"><button class="mission-head" aria-label="Brief {mission.name}" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:mission-brief', { detail: mission.id }))}>P{mission.priority}<br />{mission.name.slice(0, 3)}</button></th>{/each}</tr></thead>
      <tbody>
        {#each system.scenarioAircraft as aircraft (aircraft.id)}
          <tr><th>{aircraft.tailNumber}</th>
            {#each system.scenarioMissions as mission (mission.id)}
              {@const result = assessment(aircraft.id, mission.id)}
              <td>
                {#if result}
                  <button class="cell" class:optimal={result.assessment === 'OPTIMAL'} class:feasible={result.assessment === 'FEASIBLE' || result.assessment === 'MARGINAL'} class:infeasible={result.assessment === 'INFEASIBLE'} aria-label="{aircraft.tailNumber} to {mission.name}: {result.assessment}, {result.weaponName}" title="{result.assessment} · {result.weaponName} · {result.distanceToTargetKm} km" onmouseenter={() => highlight(aircraft.id, mission.id)} onmouseleave={() => highlight(aircraft.id, null)} onfocus={() => highlight(aircraft.id, mission.id)} onblur={() => highlight(aircraft.id, null)} onclick={() => window.dispatchEvent(new CustomEvent('aircommand:weapon-detail', { detail: Object.values(WEAPONS).find((weapon) => weapon.name === result.weaponName)?.id ?? result.weaponName }))}>{result.assessment === 'OPTIMAL' ? '◆' : result.assessment === 'INFEASIBLE' ? '×' : '◇'}</button>
                {:else}<span class="unassigned" aria-label="Unassigned">·</span>{/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <header class="summary-heading"><strong>MISSION COVERAGE</strong><span>BY PRIORITY</span></header>
  <div class="coverage">
    {#each coverage as group (group.priority)}
      <div class="coverage-row"><span>P{group.priority}</span><span class="bar"><i class="p{group.priority}" style="width:{group.percent}%"></i></span><b>{group.covered}/{group.total}</b></div>
    {/each}
  </div>
  <div class="legend"><span class="optimal-key">◆ OPTIMAL</span><span class="feasible-key">◇ FEASIBLE</span><span class="infeasible-key">× INFEASIBLE</span></div>
</section>

<style>
  .matrix-panel { display:flex; flex-direction:column; min-height:0; height:100%; background:var(--bg-panel); color:var(--text-secondary); font-family:var(--font-mono); overflow:auto; }
  header { display:flex; justify-content:space-between; gap:5px; align-items:center; padding:8px; border-bottom:1px solid var(--border-subtle); color:var(--text-muted); font-size:8px; letter-spacing:.11em; }
  header strong { color:var(--accent-cyan); font-size:8px; }
  .mission-strip { padding:5px; display:flex; flex-direction:column; gap:2px; }
  .mission-strip button { display:grid; grid-template-columns:22px 1fr 14px; gap:5px; align-items:center; padding:5px; border:0; border-left:2px solid var(--border-subtle); background:transparent; color:var(--text-primary); text-align:left; font:8px var(--font-mono); cursor:pointer; }
  .mission-strip button:hover,.mission-strip button:focus-visible { background:var(--bg-elevated); outline:1px solid var(--accent-cyan); }
  .mission-strip i { font-style:normal; color:var(--accent-red); }.mission-strip i.p2 { color:var(--accent-amber); }.mission-strip i.p3 { color:var(--text-muted); }
  .mission-strip b { color:var(--accent-cyan); text-align:right; }
  .matrix-heading { border-top:1px solid var(--border-subtle); }
  .matrix-scroll { overflow:auto; max-height:42%; }
  table { width:max-content; min-width:100%; border-collapse:collapse; font-size:7px; }
  th,td { border:1px solid var(--border-subtle); padding:3px; text-align:center; }
  thead th { color:var(--text-muted); font-weight:400; white-space:nowrap; }
  .mission-head { padding:0; border:0; background:transparent; color:inherit; font:inherit; cursor:pointer; }
  tbody th { color:var(--text-secondary); text-align:left; white-space:nowrap; font-weight:400; }
  .cell { width:21px; height:20px; border:1px solid currentColor; background:transparent; font:10px var(--font-mono); cursor:crosshair; }
  .cell.optimal { color:var(--accent-green); background:color-mix(in srgb, var(--accent-green) 9%, transparent); }.cell.feasible { color:var(--accent-amber); background:color-mix(in srgb, var(--accent-amber) 8%, transparent); }.cell.infeasible { color:var(--accent-red); background:color-mix(in srgb, var(--accent-red) 7.000000000000001%, transparent); }
  .cell:focus-visible { outline:2px solid var(--accent-cyan); outline-offset:1px; }
  .unassigned { color:var(--text-muted); }
  .summary-heading { border-top:1px solid var(--border-subtle); }
  .coverage { padding:8px; display:grid; gap:8px; }
  .coverage-row { display:grid; grid-template-columns:18px 1fr 28px; gap:6px; align-items:center; font-size:8px; }
  .coverage-row span:first-child { color:var(--accent-cyan); }.coverage-row b { text-align:right; color:var(--text-secondary); }
  .bar { height:4px; background:var(--border-subtle); }.bar i { display:block; height:100%; background:var(--accent-red); }.bar i.p2 { background:var(--accent-amber); }.bar i.p3 { background:var(--text-muted); }
  .legend { display:flex; flex-wrap:wrap; gap:8px; padding:6px 8px; border-top:1px solid var(--border-subtle); font-size:7px; }.optimal-key { color:var(--accent-green); }.feasible-key { color:var(--accent-amber); }.infeasible-key { color:var(--accent-red); }
</style>
