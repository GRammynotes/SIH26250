<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { SCENARIO_LABELS, SCENARIO_AREAS } from '../../engine/scenario';
  let legendOpen = $state(false);

  const selectedCoa = $derived(system.coas.find((coa) => coa.id === system.selectedCoaId) ?? null);
  const contextMissionIds = $derived(selectedCoa ? Object.keys(selectedCoa.assignments) : system.scenarioMissions.map((mission) => mission.id));
  const missions = $derived(contextMissionIds.map((id) => system.scenarioMissions.find((mission) => mission.id === id) ?? system.missions.find((mission) => mission.id === id)).filter((mission) => mission !== undefined).slice(0, 4));
  const assignedIds = $derived(selectedCoa ? [...new Set(Object.values(selectedCoa.assignments).flat())] : []);
  const assets = $derived(selectedCoa ? system.aircraft.filter((aircraft) => assignedIds.includes(aircraft.id)) : system.scenarioAircraft);
  const threats = $derived.by(() => {
    if (!selectedCoa && !system.activeScenarioFilter) return system.scenarioThreats;
    const operationThreats = system.scenarioThreats.filter((threat) => missions.some((mission) => Math.hypot((threat.position.lat - mission.target.lat) * 111, (threat.position.lng - mission.target.lng) * 91) <= threat.radius + 60));
    return operationThreats.slice(0, 4);
  });
  const airspaceCount = $derived(system.activeScenarioFilter
    ? system.airspaceZones.filter((zone) => zone.polygon.some((p) => areaContains(p.lng, p.lat))).length
    : system.airspaceZones.length);
  const weatherCount = $derived(system.activeScenarioFilter
    ? system.weatherSystems.filter((zone) => zone.polygon.some((p) => areaContains(p.lng, p.lat))).length
    : system.weatherSystems.length);
  const counts = $derived({
    fmc: assets.filter((a) => a.status === 'FMC').length,
    pmc: assets.filter((a) => a.status === 'PMC').length,
    nmc: assets.filter((a) => a.status === 'NMC').length,
    air: threats.filter((t) => t.type === 'AIR').length,
    radar: threats.filter((t) => t.type === 'RADAR' || t.type === 'SAM').length,
  });
  const area = $derived(system.activeScenarioFilter ? SCENARIO_AREAS[system.activeScenarioFilter] : null);
  const title = $derived(selectedCoa ? 'COA ANALYSIS PICTURE' : system.activeScenarioFilter ? `${SCENARIO_LABELS[system.activeScenarioFilter]} PICTURE` : 'GLOBAL AIR PICTURE');
  const riskLabel = (score: number) => score >= 70 ? 'ELEVATED' : score >= 40 ? 'MODERATE' : 'LOW';
  const coaCoverage = $derived(selectedCoa ? Object.keys(selectedCoa.assignments).length : 0);

  function areaContains(lng: number, lat: number): boolean {
    if (!area) return true;
    return lng >= area[0][0] && lng <= area[1][0] && lat >= area[0][1] && lat <= area[1][1];
  }

  function nearestRange(lat: number, lng: number): number | null {
    if (!assets.length) return null;
    return Math.round(Math.min(...assets.map((a) => Math.hypot((a.position.lat - lat) * 111, (a.position.lng - lng) * 91))));
  }
</script>

<section class="readout" aria-label="Map tactical picture">
  <header>
    <div class="eyebrow"><span class="live-dot"></span> TACTICAL PICTURE <button class="legend-toggle" aria-expanded={legendOpen} onclick={() => legendOpen = !legendOpen}>◈ LEGEND</button><span class="classification">EXERCISE</span></div>
    <strong>{title}</strong>
    <div class="sector">{#if area}AO GRID {area[0][1].toFixed(2)}N/{area[0][0].toFixed(2)}E — {area[1][1].toFixed(2)}N/{area[1][0].toFixed(2)}E{:else}THEATER GRID 78 · SECTOR NORTH{/if}</div>
  </header>
  {#if legendOpen}<div class="map-legend" aria-label="Tactical map symbol legend"><span>◆ FRIENDLY AIRCRAFT</span><span>▲ HOSTILE AIR TRACK</span><span>✚ AIR DEFENCE / RADAR</span><span>▧ AIRSPACE / WEATHER AREA</span></div>{/if}

  {#if selectedCoa}<div class="coa-summary"><span>SUCCESS</span><b>{Math.round(selectedCoa.successProbability)}%</b><span>RISK POSTURE</span><b class:risk-high={selectedCoa.riskScore >= 70} class:risk-low={selectedCoa.riskScore < 40}>{riskLabel(selectedCoa.riskScore)}</b><span>MISSION COVERAGE</span><b>{coaCoverage} / {system.scenarioMissions.length}</b><span>ASSIGNED AIRCRAFT</span><b>{assets.length}</b></div>{/if}

  <div class="force-line" aria-label="Aircraft available {counts.fmc} FMC, {counts.pmc} PMC, {counts.nmc} NMC">
    <span class="section-label">FORCE DISPOSITION</span><span class="force-total">{assets.length} AC</span>
    <div class="readiness"><span class="fmc" style="width:{assets.length ? counts.fmc / assets.length * 100 : 0}%"></span><span class="pmc" style="width:{assets.length ? counts.pmc / assets.length * 100 : 0}%"></span><span class="nmc" style="width:{assets.length ? counts.nmc / assets.length * 100 : 0}%"></span></div>
    <div class="force-counts"><span>FMC {counts.fmc}</span><span>PMC {counts.pmc}</span><span>NMC {counts.nmc}</span></div>
  </div>

  <div class="threat-line"><span class="section-label">{selectedCoa || system.activeScenarioFilter ? 'ROUTE THREATS' : 'RED PICTURE'}</span><span class="red-count">{threats.length} TRACKS</span><span class="red-types">AIR {counts.air} · SAM / RADAR {counts.radar}</span></div>
  {#if (selectedCoa || system.activeScenarioFilter) && threats.length}<div class="threat-list">{#each threats.slice(0, 2) as threat (threat.id)}<div><span>⚠ {threat.type}</span><b>{Math.round(threat.radius)} KM</b><small>{threat.probability > .65 ? 'ELEVATED' : threat.probability > .35 ? 'MODERATE' : 'LOW'}</small></div>{/each}</div>{/if}

  <div class="targets">
    <div class="section-head"><span class="section-label">{selectedCoa ? 'COA ASSIGNMENTS' : 'MISSION TARGETS'}</span><span>{missions.length.toString().padStart(2, '0')} / {contextMissionIds.length.toString().padStart(2, '0')}</span></div>
    {#each missions as mission (mission.id)}
      <div class="target-row">
        <span class="priority">P{mission.priority}</span>
        <div class="target-meta"><button title="Open mission brief" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:mission-brief', { detail: mission.id }))}>{mission.name}</button><span>{mission.targetType.toUpperCase().replaceAll('-', ' ')} · {mission.target.lat.toFixed(2)}N / {mission.target.lng.toFixed(2)}E</span></div>
        <span class="range">{nearestRange(mission.target.lat, mission.target.lng) ?? '—'}<small>KM</small></span>
      </div>
    {:else}<div class="empty">NO TARGETS IN ACTIVE FILTER</div>{/each}
  </div>

  <footer><span>AO LAYERS · AIRSPACE {airspaceCount} / WX {weatherCount}</span><span class="sync">● SYNC</span></footer>
</section>

<style>
  .readout { position:absolute; top:42px; left:14px; z-index:6; width:min(226px,calc(100% - 28px)); color:var(--text-secondary); background:rgba(5,8,15,.92); border:1px solid var(--border-strong); border-left:2px solid var(--accent-cyan); box-shadow:0 8px 26px rgba(0,0,0,.38); backdrop-filter:blur(8px); font-family:var(--font-mono); pointer-events:auto; }
  header { padding:10px 11px 9px; border-bottom:1px solid var(--border-subtle); background:linear-gradient(110deg,color-mix(in srgb, var(--accent-cyan) 7.000000000000001%, transparent),transparent 72%); }
  .eyebrow,.section-head,.force-line,.threat-line,footer { display:flex; align-items:center; justify-content:space-between; }
  .eyebrow { gap:6px; color:var(--accent-cyan); font-size:8px; letter-spacing:.13em; }
  .legend-toggle { margin-left:auto; border:1px solid var(--border-strong); background:transparent; color:var(--accent-cyan); font:7px var(--font-mono); cursor:pointer; padding:3px 4px; }
  .map-legend { display:grid; gap:5px; padding:8px 10px; border-bottom:1px solid var(--border-subtle); color:var(--text-secondary); font:7px var(--font-mono); }
  .live-dot { width:6px; height:6px; background:var(--accent-green); border-radius:50%; box-shadow:0 0 7px var(--accent-green); animation:blink 1.6s ease-in-out infinite; }
  .classification { margin-left:auto; color:var(--accent-amber); font-size:7px; border:1px solid var(--accent-amber); padding:2px 4px; }
  header strong { display:block; margin-top:7px; color:var(--text-primary); font-size:12px; letter-spacing:.13em; }
  .sector { margin-top:4px; color:var(--text-muted); font-size:7px; letter-spacing:.07em; }
  .force-line,.threat-line { display:block; padding:8px 11px 7px; border-bottom:1px solid var(--border-subtle); }
  .section-label { color:var(--text-muted); font-size:7px; letter-spacing:.13em; }
  .force-total,.red-count { float:right; color:var(--accent-cyan); font-size:8px; }
  .readiness { display:flex; height:3px; gap:1px; margin:7px 0 5px; background:var(--border-subtle); }
  .readiness span { display:block; height:100%; }.fmc{background:var(--accent-green)}.pmc{background:var(--accent-amber)}.nmc{background:var(--accent-red)}
  .force-counts { display:flex; justify-content:space-between; font-size:7px; color:var(--text-muted); }.force-counts span:first-child{color:var(--accent-green)}.force-counts span:nth-child(2){color:var(--accent-amber)}.force-counts span:last-child{color:var(--accent-red)}
  .red-count { color:var(--accent-red); }.red-types { display:block; margin-top:5px; color:var(--text-muted); font-size:7px; }
  .targets { padding:8px 0 2px; }.section-head { padding:0 11px 5px; color:var(--accent-cyan); font-size:7px; letter-spacing:.1em; }
  .target-row { display:grid; grid-template-columns:20px 1fr auto; gap:6px; align-items:center; padding:6px 10px; border-top:1px solid rgba(42,52,71,.55); }
  .priority { display:grid; place-items:center; height:16px; border:1px solid var(--accent-amber); color:var(--accent-amber); font-size:7px; }
  .target-meta { min-width:0; }.target-meta button,.target-meta span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.target-meta button { padding:0; border:0; background:transparent; color:var(--text-secondary); font:8px var(--font-mono); letter-spacing:.04em; cursor:pointer; text-align:left; }.target-meta button:hover { text-decoration:underline; }.target-meta span { margin-top:3px; color:var(--text-muted); font-size:6px; }
  .range { color:var(--accent-cyan); font-size:9px; text-align:right; }.range small { display:block; color:var(--text-muted); font-size:6px; }
  .empty { padding:10px; color:var(--text-muted); font-size:8px; }
  .coa-summary{display:grid;grid-template-columns:1fr auto;gap:6px 10px;padding:8px 11px;border-bottom:1px solid var(--border-subtle);font-size:7px;color:var(--text-muted)}.coa-summary b{color:var(--accent-cyan);text-align:right}.coa-summary .risk-high{color:var(--accent-red)}.coa-summary .risk-low{color:var(--accent-green)}
  .threat-list{padding:4px 10px 7px;border-bottom:1px solid var(--border-subtle)}.threat-list>div{display:grid;grid-template-columns:1fr auto;gap:3px;padding:4px 0;color:var(--accent-red);font-size:7px}.threat-list small{grid-column:1/-1;color:var(--text-muted);font-size:6px}.threat-list b{color:var(--text-secondary);font-weight:400}
  footer { padding:6px 10px; border-top:1px solid var(--border-subtle); color:var(--text-muted); font-size:6px; letter-spacing:.07em; }.sync { color:var(--accent-green); }
  @keyframes blink { 50% { opacity:.45; } }
  @media (max-width:1100px) { .readout { width:min(190px,calc(100% - 24px)); left:8px; top:38px; } }
  @media (max-width:700px) { .readout { width:min(250px,calc(100% - 20px)); left:10px; top:30px; } }
</style>
