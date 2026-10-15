<script lang="ts">
  import { onDestroy } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import { IAF_BASES } from '../../data/bases';
  import { WEAPONS } from '../../data/weapons';
  import { circleAround, greatCircleCoordinates, pointAlongPath, type Coordinate } from '../../engine/trajectory';
  import { phaseDuration, progressFraction } from '../../engine/missionExecutor';
  import { system } from '../../stores/systemStore.svelte';
  import type { ActiveMission } from '../../engine/missionExecutor';

  let { map }: { map: maplibregl.Map } = $props();
  const tokens = getComputedStyle(document.documentElement);
  const C = { cyan: tokens.getPropertyValue('--accent-cyan').trim(), green: tokens.getPropertyValue('--accent-green').trim(), amber: tokens.getPropertyValue('--accent-amber').trim(), red: tokens.getPropertyValue('--accent-red').trim(), base: tokens.getPropertyValue('--bg-base').trim(), text: tokens.getPropertyValue('--text-primary').trim(), border: tokens.getPropertyValue('--border-strong').trim() };
  const routeSourceId = 'active-trajectories';
  const flightSourceId = 'trajectory-flights';
  const impactSourceId = 'trajectory-impact-effects';
  const flights = new Map<string, { path: Coordinate[]; mission: ActiveMission }>();
  const impactStarts = new Map<string, number>();
  let raf = 0;
  let lastFrame = 0;
  let flightsVisible = false;
  let impactsVisible = false;
  let disposed = false;

  function fc(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection { return { type: 'FeatureCollection', features }; }
  function setupLayers(): boolean {
    // MapLibre can temporarily detach its style while the parent map is being
    // removed or a style is loading. Do not call getSource/getLayer then.
    if (disposed || !map || !map.isStyleLoaded()) return false;
    if (map.getSource(routeSourceId)) return true;
    map.addSource(routeSourceId, { type: 'geojson', data: fc([]) });
    map.addLayer({ id: 'trajectory-boost', type: 'line', source: routeSourceId, filter: ['==', ['get', 'segment'], 'boost'], paint: { 'line-color': C.cyan, 'line-width': 2.4, 'line-opacity': .95 } });
    map.addLayer({ id: 'trajectory-cruise', type: 'line', source: routeSourceId, filter: ['==', ['get', 'segment'], 'cruise'], paint: { 'line-color': C.amber, 'line-width': 2.4, 'line-opacity': .95 } });
    map.addLayer({ id: 'trajectory-terminal', type: 'line', source: routeSourceId, filter: ['==', ['get', 'segment'], 'terminal'], paint: { 'line-color': C.red, 'line-width': 2.8, 'line-opacity': .98 } });
    map.addLayer({ id: 'trajectory-waypoints', type: 'circle', source: routeSourceId, filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 4, 'circle-color': ['match', ['get', 'kind'], 'release', C.red, 'wez', C.amber, C.cyan], 'circle-stroke-color': C.base, 'circle-stroke-width': 1.5 } });
    map.addSource(flightSourceId, { type: 'geojson', data: fc([]) });
    map.addLayer({ id: 'trajectory-flight-points', type: 'circle', source: flightSourceId, paint: { 'circle-radius': 5, 'circle-color': C.cyan, 'circle-stroke-color': C.text, 'circle-stroke-width': 1.5 } });
    map.addSource(impactSourceId, { type: 'geojson', data: fc([]) });
    map.addLayer({ id: 'trajectory-impact-fill', type: 'fill', source: impactSourceId, paint: { 'fill-color': C.red, 'fill-opacity': .16 } });
    map.addLayer({ id: 'trajectory-impact-line', type: 'line', source: impactSourceId, paint: { 'line-color': C.red, 'line-width': 2, 'line-opacity': .9 } });
    map.on('click', 'trajectory-impact-fill', (event) => {
      const missionId = String(event.features?.[0]?.properties?.missionId ?? '');
      const mission = system.activeMissions.find((item) => item.id === missionId);
      if (!mission || !event.lngLat) return;
      const weapon = mission.weaponId ? WEAPONS[mission.weaponId] : null;
      new maplibregl.Popup({ offset: 12 }).setLngLat(event.lngLat).setHTML(`<div style="font:9px 'JetBrains Mono',monospace;color:${C.text};background:${C.base};border:1px solid ${C.border};padding:9px 12px"><b style="color:${C.red}">IMPACT · ${weapon?.name ?? 'WEAPON RELEASE'}</b><br>TARGET: ${mission.missionName}<br>STATUS: ASSESSMENT PENDING</div>`).addTo(map);
    });
    return true;
  }

  function buildRoutes(active: ActiveMission[]) {
    if (!setupLayers()) return;
    const routeFeatures: GeoJSON.Feature[] = [];
    const liveIds = new Set<string>();
    for (const mission of active) {
      if (mission.phase === 'COMPLETE' || mission.phase === 'ABORTED') continue;
      liveIds.add(mission.id);
      const aircraft = system.aircraft.find((item) => mission.aircraftIds.includes(item.id));
      const base = IAF_BASES.find((item) => item.id === aircraft?.base);
      const origin = base ? { lat: base.lat, lng: base.lng } : aircraft?.position ?? mission.target;
      const path = greatCircleCoordinates(origin, mission.target, 100);
      flights.set(mission.id, { path, mission });
      const line = (segment: string, start: number, end: number): GeoJSON.Feature => ({ type: 'Feature', properties: { segment, missionId: mission.id }, geometry: { type: 'LineString', coordinates: path.slice(Math.floor(start * (path.length - 1)), Math.floor(end * (path.length - 1)) + 1) } });
      routeFeatures.push(line('boost', 0, .28), line('cruise', .28, .78), line('terminal', .78, 1));
      for (const [kind, fraction] of [['ingress', 0], ['wez', .78], ['release', .92], ['egress', 1]] as const) routeFeatures.push({ type: 'Feature', properties: { kind, missionId: mission.id }, geometry: { type: 'Point', coordinates: pointAlongPath(path, fraction) } });
      if (mission.phase === 'RELEASE' && !impactStarts.has(mission.id)) impactStarts.set(mission.id, performance.now());
    }
    for (const id of flights.keys()) if (!liveIds.has(id)) flights.delete(id);
    const routeSource = map.getSource(routeSourceId) as maplibregl.GeoJSONSource | undefined;
    routeSource?.setData(fc(routeFeatures));
  }

  function animate(now: number) {
    if (disposed) return;
    if (now - lastFrame >= 200 && map && map.isStyleLoaded()) {
      lastFrame = now;
      if (flights.size || flightsVisible) {
        const flightFeatures: GeoJSON.Feature[] = [];
        for (const { path, mission } of flights.values()) {
          const elapsed = (now - mission.phaseStartTime) / 60000;
          const fraction = progressFraction(mission.phase, elapsed, phaseDuration(mission.phase));
          flightFeatures.push({ type: 'Feature', properties: { missionId: mission.id }, geometry: { type: 'Point', coordinates: pointAlongPath(path, fraction) } });
        }
        (map.getSource(flightSourceId) as maplibregl.GeoJSONSource | undefined)?.setData(fc(flightFeatures));
        flightsVisible = flightFeatures.length > 0;
      }
      const impacts: GeoJSON.Feature[] = [];
      for (const [id, started] of impactStarts) {
        const elapsed = now - started;
        if (elapsed > 1500) { impactStarts.delete(id); continue; }
        const mission = system.activeMissions.find((item) => item.id === id);
        if (!mission) continue;
        impacts.push({ type: 'Feature', properties: { missionId: id }, geometry: { type: 'Polygon', coordinates: [circleAround([mission.target.lng, mission.target.lat], Math.max(.02, elapsed / 1500 * 2))] } });
      }
      if (impacts.length || impactsVisible) {
        (map.getSource(impactSourceId) as maplibregl.GeoJSONSource | undefined)?.setData(fc(impacts));
        impactsVisible = impacts.length > 0;
      }
    }
    if (!disposed) raf = requestAnimationFrame(animate);
  }

  $effect(() => {
    const active = system.activeMissions;
    if (map.isStyleLoaded()) buildRoutes(active);
  });
  // The parent only mounts this layer once the base style has loaded.
  if (map.isStyleLoaded()) setupLayers();
  raf = requestAnimationFrame(animate);
  onDestroy(() => {
    disposed = true;
    cancelAnimationFrame(raf);
    if (!map || !map.isStyleLoaded()) return;
    for (const id of ['trajectory-boost', 'trajectory-cruise', 'trajectory-terminal', 'trajectory-waypoints', 'trajectory-flight-points', 'trajectory-impact-fill', 'trajectory-impact-line']) if (map.getLayer(id)) map.removeLayer(id);
    for (const id of [routeSourceId, flightSourceId, impactSourceId]) if (map.getSource(id)) map.removeSource(id);
  });
</script>
