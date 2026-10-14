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
  const routeSourceId = 'active-trajectories';
  const impactSourceId = 'trajectory-impact-effects';
  const movingMarkers = new Map<string, { marker: maplibregl.Marker; path: Coordinate[]; mission: ActiveMission }>();
  const impactMarkers = new Map<string, maplibregl.Marker>();
  const impactStarts = new Map<string, number>();
  let raf = 0;

  function featureCollection(features: GeoJSON.Feature[]): GeoJSON.FeatureCollection {
    return { type: 'FeatureCollection', features };
  }

  function setupLayers() {
    if (map.getSource(routeSourceId)) return;
    map.addSource(routeSourceId, { type: 'geojson', data: featureCollection([]) });
    map.addLayer({ id: 'trajectory-boost', type: 'line', source: routeSourceId, filter: ['==', ['get', 'segment'], 'boost'], paint: { 'line-color': '#00d4ff', 'line-width': 2.4, 'line-opacity': .95 } });
    map.addLayer({ id: 'trajectory-cruise', type: 'line', source: routeSourceId, filter: ['==', ['get', 'segment'], 'cruise'], paint: { 'line-color': '#ffb800', 'line-width': 2.4, 'line-opacity': .95 } });
    map.addLayer({ id: 'trajectory-terminal', type: 'line', source: routeSourceId, filter: ['==', ['get', 'segment'], 'terminal'], paint: { 'line-color': '#ff2d7c', 'line-width': 2.8, 'line-opacity': .98 } });
    map.addLayer({ id: 'trajectory-waypoints', type: 'circle', source: routeSourceId, filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 4, 'circle-color': ['match', ['get', 'kind'], 'release', '#ff2d7c', 'wez', '#ffb800', '#00d4ff'], 'circle-stroke-color': '#05080f', 'circle-stroke-width': 1.5 } });
    map.addSource(impactSourceId, { type: 'geojson', data: featureCollection([]) });
    map.addLayer({ id: 'trajectory-impact-fill', type: 'fill', source: impactSourceId, paint: { 'fill-color': '#ff2d7c', 'fill-opacity': .16 } });
    map.addLayer({ id: 'trajectory-impact-line', type: 'line', source: impactSourceId, paint: { 'line-color': '#ff2d7c', 'line-width': 2, 'line-opacity': .9 } });
  }

  function makePopup(mission: ActiveMission) {
    const weapon = mission.weaponId ? WEAPONS[mission.weaponId] : null;
    const target = system.missions.find((item) => item.id === mission.missionId);
    const html = `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;line-height:1.8;color:#e2e8f0;background:#0a0e1a;border:1px solid #ff2d7c;padding:10px 12px;min-width:220px;letter-spacing:.06em"><b style="color:#ff2d7c">WEAPON: ${weapon?.name ?? 'UNSPECIFIED'}</b><br>RANGE: ${weapon?.rangeKm ?? '—'} KM · CEP: ${weapon?.cepMeters ?? '—'} M<br>WARHEAD: ${weapon?.warheadKg ?? '—'} KG<br><span style="color:#ffb800">TARGET: ${(target?.targetType ?? 'UNKNOWN').toUpperCase()} @ ${mission.target.lat.toFixed(3)}, ${mission.target.lng.toFixed(3)}</span><br>STATUS: RELEASED · IMPACT CONFIRMED<br><b style="color:#ff2d7c">BDA: DESTROYED (CONFIDENCE 87%)</b></div>`;
    return new maplibregl.Popup({ offset: 14, closeButton: true }).setHTML(html);
  }

  function addImpact(mission: ActiveMission) {
    if (impactStarts.has(mission.id)) return;
    impactStarts.set(mission.id, performance.now());
    const target = system.missions.find((item) => item.id === mission.missionId);
    const markerEl = document.createElement('button');
    markerEl.type = 'button';
    markerEl.className = 'impact-marker';
    markerEl.setAttribute('aria-label', `Impact confirmed at ${mission.missionName}`);
    markerEl.textContent = '×';
    const marker = new maplibregl.Marker({ element: markerEl, anchor: 'center' })
      .setLngLat([mission.target.lng, mission.target.lat]).setPopup(makePopup(mission)).addTo(map);
    impactMarkers.set(mission.id, marker);
    void target;
  }

  function buildRoutes(active: ActiveMission[]) {
    setupLayers();
    const features: GeoJSON.Feature[] = [];
    const keys = new Set(active.filter((m) => !['COMPLETE', 'ABORTED'].includes(m.phase)).map((m) => m.id));
    for (const [id, item] of movingMarkers) if (!keys.has(id)) { item.marker.remove(); movingMarkers.delete(id); }
    for (const mission of active) {
      if (mission.phase === 'COMPLETE' || mission.phase === 'ABORTED') continue;
      const firstAircraft = system.aircraft.find((aircraft) => mission.aircraftIds.includes(aircraft.id));
      const base = IAF_BASES.find((item) => item.id === firstAircraft?.base);
      const origin = base ? { lat: base.lat, lng: base.lng } : firstAircraft?.position ?? mission.target;
      const path = greatCircleCoordinates(origin, mission.target, 100);
      const first = pointAlongPath(path, 0);
      const wez = pointAlongPath(path, .78);
      const release = pointAlongPath(path, .92);
      const end = pointAlongPath(path, 1);
      const line = (segment: string, start: number, finish: number): GeoJSON.Feature => ({ type: 'Feature', properties: { segment, missionId: mission.id }, geometry: { type: 'LineString', coordinates: path.slice(Math.floor(start * (path.length - 1)), Math.floor(finish * (path.length - 1)) + 1) } });
      features.push(line('boost', 0, .28), line('cruise', .28, .78), line('terminal', .78, 1));
      for (const [kind, coordinate] of [['ingress', first], ['wez', wez], ['release', release], ['egress', end]] as const) {
        features.push({ type: 'Feature', properties: { kind, missionId: mission.id }, geometry: { type: 'Point', coordinates: coordinate } });
      }
      if (!movingMarkers.has(mission.id)) {
        const dot = document.createElement('span'); dot.className = 'trajectory-dot'; dot.setAttribute('aria-hidden', 'true');
        const marker = new maplibregl.Marker({ element: dot, anchor: 'center' }).setLngLat(first).addTo(map);
        movingMarkers.set(mission.id, { marker, path, mission });
      } else {
        const marker = movingMarkers.get(mission.id)!; marker.path = path; marker.mission = mission;
      }
      if (mission.phase === 'RELEASE' && !impactStarts.has(mission.id)) addImpact(mission);
    }
    (map.getSource(routeSourceId) as maplibregl.GeoJSONSource).setData(featureCollection(features));
  }

  function animate(now: number) {
    for (const { marker, mission, path } of movingMarkers.values()) {
      const elapsedMin = (now - mission.phaseStartTime) / 60000;
      const fraction = progressFraction(mission.phase, elapsedMin, phaseDuration(mission.phase));
      marker.setLngLat(pointAlongPath(path, fraction));
    }
    const impactFeatures: GeoJSON.Feature[] = [];
    for (const [id, started] of impactStarts) {
      const elapsed = now - started;
      if (elapsed > 1500) { impactStarts.delete(id); continue; }
      const mission = system.activeMissions.find((item) => item.id === id);
      if (!mission) continue;
      const radius = Math.max(.02, (elapsed / 1500) * 2);
      impactFeatures.push({ type: 'Feature', properties: { missionId: id }, geometry: { type: 'Polygon', coordinates: [circleAround([mission.target.lng, mission.target.lat], radius)] } });
    }
    const impactSource = map.getSource(impactSourceId) as maplibregl.GeoJSONSource | undefined;
    impactSource?.setData(featureCollection(impactFeatures));
    raf = requestAnimationFrame(animate);
  }

  $effect(() => { buildRoutes(system.activeMissions); });
  raf = requestAnimationFrame(animate);
  onDestroy(() => {
    cancelAnimationFrame(raf);
    for (const { marker } of movingMarkers.values()) marker.remove();
    for (const marker of impactMarkers.values()) marker.remove();
    for (const id of ['trajectory-boost', 'trajectory-cruise', 'trajectory-terminal', 'trajectory-waypoints', 'trajectory-impact-fill', 'trajectory-impact-line']) if (map.getLayer(id)) map.removeLayer(id);
    for (const id of [routeSourceId, impactSourceId]) if (map.getSource(id)) map.removeSource(id);
  });
</script>

<style>
  :global(.trajectory-dot) { display:block; width:7px; height:7px; border-radius:50%; background:#00d4ff; border:1px solid #e2e8f0; box-shadow:0 0 8px #00d4ff,0 0 14px rgba(0,212,255,.6); }
  :global(.impact-marker) { width:24px; height:24px; border:1px solid #ff2d7c; border-radius:50%; background:rgba(255,45,124,.2); color:#ff2d7c; font:18px/1 var(--font-mono); cursor:pointer; box-shadow:0 0 12px #ff2d7c; animation:impact-flash .35s ease-in-out 4 alternate; }
  @keyframes impact-flash { to { background:#ff2d7c; color:#05080f; box-shadow:0 0 22px #ff2d7c; } }
</style>
