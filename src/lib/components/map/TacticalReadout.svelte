<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { SCENARIO_LABELS, SCENARIO_AREAS } from '../../engine/scenario';

  const assets = $derived(system.scenarioAircraft);
  const missions = $derived(system.scenarioMissions.slice(0, 4));
  const threats = $derived(system.scenarioThreats);
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
  const title = $derived(system.activeScenarioFilter ? SCENARIO_LABELS[system.activeScenarioFilter] : 'GLOBAL AIR PICTURE');

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
    <div class="eyebrow"><span class="live-dot"></span> TACTICAL PICTURE <span class="classification">EXERCISE</span></div>
    <strong>{title}</strong>
    <div class="sector">{#if area}AO GRID {area[0][1].toFixed(2)}N/{area[0][0].toFixed(2)}E — {area[1][1].toFixed(2)}N/{area[1][0].toFixed(2)}E{:else}THEATER GRID 78 · SECTOR NORTH{/if}</div>
  </header>

  <div class="force-line" aria-label="Aircraft available {counts.fmc} FMC, {counts.pmc} PMC, {counts.nmc} NMC">
    <span class="section-label">BLUE FORCE</span><span class="force-total">{assets.length} AC</span>
    <div class="readiness"><span class="fmc" style="width:{assets.length ? counts.fmc / assets.length * 100 : 0}%"></span><span class="pmc" style="width:{assets.length ? counts.pmc / assets.length * 100 : 0}%"></span><span class="nmc" style="width:{assets.length ? counts.nmc / assets.length * 100 : 0}%"></span></div>
    <div class="force-counts"><span>FMC {counts.fmc}</span><span>PMC {counts.pmc}</span><span>NMC {counts.nmc}</span></div>
  </div>

  <div class="threat-line"><span class="section-label">RED PICTURE</span><span class="red-count">{threats.length} TRACKS</span><span class="red-types">AIR {counts.air} · SAM / RADAR {counts.radar}</span></div>

  <div class="targets">
    <div class="section-head"><span class="section-label">TASKED TARGETS</span><span>{missions.length.toString().padStart(2, '0')} / {system.scenarioMissions.length.toString().padStart(2, '0')}</span></div>
    {#each missions as mission (mission.id)}
      <div class="target-row">
        <span class="priority">P{mission.priority}</span>
        <div class="target-meta"><strong>{mission.name}</strong><span>{mission.targetType.toUpperCase().replaceAll('-', ' ')} · {mission.target.lat.toFixed(2)}N / {mission.target.lng.toFixed(2)}E</span></div>
        <span class="range">{nearestRange(mission.target.lat, mission.target.lng) ?? '—'}<small>KM</small></span>
      </div>
    {:else}<div class="empty">NO TARGETS IN ACTIVE FILTER</div>{/each}
  </div>

  <footer><span>AO LAYERS · AIRSPACE {airspaceCount} / WX {weatherCount}</span><span class="sync">● SYNC</span></footer>
</section>

<style>
  .readout { position:absolute; top:42px; left:14px; z-index:6; width:min(226px,calc(100% - 28px)); color:var(--text-secondary); background:rgba(5,8,15,.92); border:1px solid var(--border-strong); border-left:2px solid var(--accent-cyan); box-shadow:0 8px 26px rgba(0,0,0,.38); backdrop-filter:blur(8px); font-family:var(--font-mono); pointer-events:auto; }
  header { padding:10px 11px 9px; border-bottom:1px solid var(--border-subtle); background:linear-gradient(110deg,rgba(0,212,255,.07),transparent 72%); }
  .eyebrow,.section-head,.force-line,.threat-line,footer { display:flex; align-items:center; justify-content:space-between; }
  .eyebrow { gap:6px; color:var(--accent-cyan); font-size:8px; letter-spacing:.13em; }
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
  .target-meta { min-width:0; }.target-meta strong,.target-meta span { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.target-meta strong { color:var(--text-secondary); font-size:8px; letter-spacing:.04em; }.target-meta span { margin-top:3px; color:var(--text-muted); font-size:6px; }
  .range { color:var(--accent-cyan); font-size:9px; text-align:right; }.range small { display:block; color:var(--text-muted); font-size:6px; }
  .empty { padding:10px; color:var(--text-muted); font-size:8px; }
  footer { padding:6px 10px; border-top:1px solid var(--border-subtle); color:var(--text-muted); font-size:6px; letter-spacing:.07em; }.sync { color:var(--accent-green); }
  @keyframes blink { 50% { opacity:.45; } }
  @media (max-width:1100px) { .readout { width:min(190px,calc(100% - 24px)); left:8px; top:38px; } }
  @media (max-width:700px) { .readout { width:min(250px,calc(100% - 20px)); left:10px; top:30px; } }
</style>
