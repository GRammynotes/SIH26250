<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import maplibregl, { setMaxParallelImageRequests } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { IAF_BASES } from '../../data/bases';
  import { GROUND_ASSETS } from '../../data/groundAssets';
  import { ENEMY_ASSETS } from '../../data/enemyAssets';
  import TerrainToggle from './TerrainToggle.svelte';
  import TrajectoryLayer from './TrajectoryLayer.svelte';
  import { type AirspaceZone, type WeatherSystem } from '../../types';
  import { system } from '../../stores/systemStore.svelte';
  import { SCENARIO_AREAS } from '../../engine/scenario';
  import { createTrailPathDeriver } from '../../engine/mapTrailCache';
  import { experienceBounds, experienceBoundsOrScenario } from '../../data/scenarioBounds';
  import { clearSimulationTrails, getSimulationFrame, setSimulationAnimationActive } from '../../engine/simAnimation.svelte';
  import type { MapFocusElement } from '../../engine/mapNarrative';
  import TacticalReadout from './TacticalReadout.svelte';
  import MapNarrativePointer from './MapNarrativePointer.svelte';
  import MapContextMenu from './MapContextMenu.svelte';
  import { greatCircleCoordinates } from '../../engine/trajectory';
  import { WEAPONS } from '../../data/weapons';

  let {
    onBaseSelect,
    onLoadoutClick,
    onFullscreenClick,
    onToggleTheaterVisibility,
    theaterMapVisible = true,
    fullscreen = false,
  }: {
    onBaseSelect?: (baseId: string) => void;
    onLoadoutClick?: (type: string, tail: string) => void;
    onFullscreenClick?: () => void;
    onToggleTheaterVisibility?: () => void;
    theaterMapVisible?: boolean;
    fullscreen?: boolean;
  } = $props();

  let container: HTMLDivElement;
  let map: maplibregl.Map | null = null;
  let mapReady = $state(false);
  let mapFocusLocked = false;
  let mapZoom = $state(3.8);
  let mapCenterLabel = $state('31.0°N / 79.0°E');
  let aircraftLayerClickAttached = false;
  let lastScenarioView: string | null | undefined;
  let terrain3dEnabled = false;
  let terrainPaused = false;
  let terrainResumeTimer: ReturnType<typeof setTimeout> | undefined;
  let diagramExplanation = $state('');
  let diagramExplanationTimer: ReturnType<typeof setTimeout> | undefined;
  let mapFocusTimer: ReturnType<typeof setTimeout> | undefined;
  let mapFocusClearTimer: ReturnType<typeof setTimeout> | undefined;
  let narrativeMarkers = $state<Array<{ x: number; y: number; label: string; opacity: number }>>([]);
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;
  let mapTooltip = $state<{ x: number; y: number; title: string; state: string } | null>(null);
  let mapContext = $state<{ x: number; y: number; kind: string; id: string; title: string } | null>(null);
  let selectedMapCard = $state<{ kind: string; id: string; title: string; lines: string[] } | null>(null);
  let dimTimer: ReturnType<typeof setTimeout> | undefined;
  const circlePolygonCache = new Map<string, number[][]>();
  const threatPolyCache = new Map<string, number[][]>();

  // Map layer toggle states
  let showTerrain = $state(false);
  let showGrid = $state(true);
  let showTrails = $state(true);
  let showThreats = $state(true);
  let showGround = $state(true);
  let showAirspace = $state(true);
  let showWeather = $state(true);
  let showEnemy = $state(true);
  let overviewAircraft = $derived(system.activeScenarioFilter ? system.scenarioAircraft : system.aircraft);
  let overviewFmcCount = $derived(overviewAircraft.filter((item) => item.status === 'FMC').length);

  const palette = getComputedStyle(document.documentElement);
  const C = {
    cyan: palette.getPropertyValue('--accent-cyan').trim(),
    amber: palette.getPropertyValue('--accent-amber').trim(),
    red: palette.getPropertyValue('--accent-red').trim(),
    green: palette.getPropertyValue('--accent-green').trim(),
    muted: palette.getPropertyValue('--text-muted').trim(),
    border: palette.getPropertyValue('--border-strong').trim(),
    base: palette.getPropertyValue('--bg-base').trim(),
    text: palette.getPropertyValue('--text-primary').trim(),
    secondary: palette.getPropertyValue('--text-secondary').trim(),
    elevated: palette.getPropertyValue('--bg-elevated').trim(),
  };

  let trailHistory = $state.raw<Record<string, [number, number][]>>({});
  const trailClearTimers = new Map<string, ReturnType<typeof setTimeout>>();
  let lastAircraftPositionKey = '';
  let lastTrailFeatureSignature = '';
  let lastSimulationTrailFeatureSignature = '';
  const deriveTrailPaths = createTrailPathDeriver();

  $effect(() => {
    const aircraft = system.aircraft;
    const key = JSON.stringify(aircraft.map((ac) => [ac.id, ac.status, ac.position.lng, ac.position.lat]));
    if (key === lastAircraftPositionKey) return;
    lastAircraftPositionKey = key;
    const next = { ...untrack(() => trailHistory) };
    for (const ac of aircraft) {
      if (ac.status === 'NMC') { delete next[ac.id]; continue; }
      const points = [...(next[ac.id] ?? [])];
      const position: [number, number] = [ac.position.lng, ac.position.lat];
      const last = points[points.length - 1];
      if (!last || last[0] !== position[0] || last[1] !== position[1]) points.push(position);
      if (points.length > 8) points.splice(0, points.length - 8);
      next[ac.id] = points;
    }
    const activeIds = new Set(aircraft.map((ac) => ac.id));
    for (const id of Object.keys(next)) if (!activeIds.has(id)) delete next[id];
    trailHistory = next;
  });

  $effect(() => {
    const completed = system.activeMissions.filter((mission) => mission.phase === 'COMPLETE' || mission.phase === 'ABORTED');
    const active = new Set(system.activeMissions.filter((mission) => mission.phase !== 'COMPLETE' && mission.phase !== 'ABORTED').flatMap((mission) => mission.aircraftIds));
    for (const mission of completed) for (const id of mission.aircraftIds) {
      if (active.has(id) || trailClearTimers.has(id)) continue;
      trailClearTimers.set(id, setTimeout(() => {
        const next = { ...untrack(() => trailHistory) }; delete next[id]; trailHistory = next; trailClearTimers.delete(id);
      }, 5000));
    }
    for (const [id, timer] of trailClearTimers) if (active.has(id)) { clearTimeout(timer); trailClearTimers.delete(id); }
  });

  const trails = $derived.by(() => deriveTrailPaths(trailHistory));

  // Build grid GeoJSON (1 degree lines lat 25-40, lng 65-95)
  function createGridGeoJson(): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = [];
    // Latitude lines
    for (let lat = 25; lat <= 40; lat += 1) {
      features.push({
        type: 'Feature',
        properties: { type: 'lat', val: lat },
        geometry: {
          type: 'LineString',
          coordinates: [
            [65, lat],
            [95, lat],
          ],
        },
      });
    }
    // Longitude lines
    for (let lng = 65; lng <= 95; lng += 1) {
      features.push({
        type: 'Feature',
        properties: { type: 'lng', val: lng },
        geometry: {
          type: 'LineString',
          coordinates: [
            [lng, 25],
            [lng, 40],
          ],
        },
      });
    }
    return { type: 'FeatureCollection', features };
  }

  const MAP_STYLE: maplibregl.StyleSpecification = {
    version: 8,
    glyphs: '/fonts/{fontstack}/{range}.pbf',
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
      'terrain-dem': {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        encoding: 'terrarium',
        maxzoom: 12,
        attribution: 'Terrain: Mapzen/AWS',
      },
      'hillshade-dem': {
        type: 'raster-dem',
        tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
        tileSize: 256,
        encoding: 'terrarium',
        maxzoom: 12,
        attribution: 'Terrain: Mapzen/AWS',
      },
      'tactical-grid': {
        type: 'geojson',
        data: createGridGeoJson(),
      },
    },
    layers: [
      { id: 'bg', type: 'raster', source: 'osm', paint: { 'raster-resampling': 'linear' } },
      {
        id: 'hillshade-base',
        type: 'hillshade',
        source: 'hillshade-dem',
        minzoom: 5,
        maxzoom: 10,
        layout: { visibility: 'none' },
        paint: {
          'hillshade-shadow-color': C.base,
          'hillshade-highlight-color': C.elevated,
          'hillshade-exaggeration': 0.35,
          'hillshade-illumination-anchor': 'viewport',
          'hillshade-illumination-direction': 315,
          'hillshade-accent-color': C.base,
        },
      },
      {
        id: 'hillshade-detail',
        type: 'hillshade',
        source: 'hillshade-dem',
        minzoom: 5,
        maxzoom: 10,
        layout: { visibility: 'none' },
        paint: {
          'hillshade-shadow-color': C.base,
          'hillshade-highlight-color': C.elevated,
          'hillshade-exaggeration': 0.5,
          'hillshade-accent-color': C.base,
        },
      },
      {
        id: 'grid-lines',
        type: 'line',
        source: 'tactical-grid',
        layout: { visibility: 'visible' },
        paint: {
          'line-color': C.cyan,
          'line-opacity': 0.08,
          'line-width': 1,
        },
      },
    ],
  };

  function ensureAircraftLayer() {
    if (!map) return;
    for (const [status, color] of [['FMC', C.green], ['PMC', C.amber], ['NMC', C.red]] as const) {
      const imageId = `aircraft-${status}`;
      if (map.hasImage(imageId)) continue;
      const canvas = document.createElement('canvas'); canvas.width = 48; canvas.height = 48;
      const ctx = canvas.getContext('2d'); if (!ctx) continue;
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(24, 5); ctx.lineTo(27, 19); ctx.lineTo(41, 27); ctx.lineTo(41, 31); ctx.lineTo(27, 27); ctx.lineTo(26, 40); ctx.lineTo(32, 44); ctx.lineTo(32, 46); ctx.lineTo(24, 44); ctx.lineTo(16, 46); ctx.lineTo(16, 44); ctx.lineTo(22, 40); ctx.lineTo(21, 27); ctx.lineTo(7, 31); ctx.lineTo(7, 27); ctx.lineTo(21, 19); ctx.closePath(); ctx.stroke();
      map.addImage(imageId, ctx.getImageData(0, 0, 48, 48), { pixelRatio: 2 });
      const triangle = document.createElement('canvas'); triangle.width = 24; triangle.height = 24;
      const triangleCtx = triangle.getContext('2d');
      if (triangleCtx) { triangleCtx.fillStyle = color; triangleCtx.strokeStyle = '#05080f'; triangleCtx.lineWidth = 1.5; triangleCtx.beginPath(); triangleCtx.moveTo(12, 2); triangleCtx.lineTo(22, 21); triangleCtx.lineTo(12, 17); triangleCtx.lineTo(2, 21); triangleCtx.closePath(); triangleCtx.fill(); triangleCtx.stroke(); map.addImage(`aircraft-triangle-${status}`, triangleCtx.getImageData(0, 0, 24, 24), { pixelRatio: 2 }); }
    }
    if (!map.getSource('aircraft-gl')) map.addSource('aircraft-gl', {
      type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 5, clusterRadius: 50,
      clusterProperties: {
        fmc: ['+', ['case', ['==', ['get', 'status'], 'FMC'], 1, 0]],
        pmc: ['+', ['case', ['==', ['get', 'status'], 'PMC'], 1, 0]],
        nmc: ['+', ['case', ['==', ['get', 'status'], 'NMC'], 1, 0]],
      },
    });
    if (!map.getLayer('aircraft-clusters')) map.addLayer({
      id: 'aircraft-clusters', type: 'circle', source: 'aircraft-gl', minzoom: 3, maxzoom: 5, filter: ['has', 'point_count'],
      paint: { 'circle-color': C.cyan, 'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 11, 50, 18, 200, 24], 'circle-opacity': 0.2 },
    });
    if (!map.getLayer('aircraft-cluster-count')) map.addLayer({
      id: 'aircraft-cluster-count', type: 'symbol', source: 'aircraft-gl', minzoom: 3, maxzoom: 5, filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count'], 'text-font': ['Noto Sans Regular'], 'text-size': 14, 'text-allow-overlap': true },
      paint: { 'text-color': C.text, 'text-halo-color': C.base, 'text-halo-width': 1 },
    });
    if (!map.getLayer('aircraft-gl-symbols')) map.addLayer({
      id: 'aircraft-gl-symbols', type: 'symbol', source: 'aircraft-gl', minzoom: 5, filter: ['!', ['has', 'point_count']],
      layout: { 'icon-image': ['step', ['zoom'], ['match', ['get', 'status'], 'FMC', 'aircraft-triangle-FMC', 'PMC', 'aircraft-triangle-PMC', 'aircraft-triangle-NMC'], 8, ['match', ['get', 'status'], 'FMC', 'aircraft-FMC', 'PMC', 'aircraft-PMC', 'aircraft-NMC']], 'icon-size': ['interpolate', ['linear'], ['zoom'], 5, 0.5, 7, 0.55, 8, 0.75, 11, 1], 'icon-rotate': ['coalesce', ['get', 'heading'], 0], 'icon-rotation-alignment': 'map', 'icon-allow-overlap': true, 'icon-ignore-placement': true },
      paint: { 'icon-opacity': 1 },
    });
    if (!map.getLayer('aircraft-gl-labels')) map.addLayer({
      id: 'aircraft-gl-labels', type: 'symbol', source: 'aircraft-gl', minzoom: 8, filter: ['!', ['has', 'point_count']],
      layout: { 'text-field': ['get', 'tailNumber'], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-offset': [0, 1.7], 'text-anchor': 'top', 'text-allow-overlap': true, 'text-ignore-placement': true },
      paint: { 'text-color': C.cyan, 'text-halo-color': C.base, 'text-halo-width': 2 },
    });
    if (!aircraftLayerClickAttached) {
      map.on('click', 'aircraft-gl-symbols', (event) => {
        const feature = event.features?.[0];
        if (feature && event.lngLat) selectMapFeature(feature, event.lngLat);
        const props = feature?.properties;
        if (system.focusMode?.active && props?.tailNumber) window.dispatchEvent(new CustomEvent('aircommand:arc-viewer', { detail: { entityType: 'aircraft', entityId: String(props.tailNumber), missionId: system.focusMode.missionId ?? '' } }));
      });
      map.on('mouseenter', 'aircraft-gl-symbols', () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'aircraft-gl-symbols', () => { if (map) map.getCanvas().style.cursor = ''; });
      aircraftLayerClickAttached = true;
    }
  }

  function ensureOperationalPointLayers() {
    if (!map) return;
    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
    for (const id of ['bases-gl', 'missions-gl', 'assets-gl']) if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: empty });
    if (!map.getLayer('bases-gl-symbols')) map.addLayer({ id: 'bases-gl-symbols', type: 'circle', source: 'bases-gl', minzoom: 3, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 8, 7], 'circle-color': C.cyan, 'circle-opacity': ['get', 'opacity'], 'circle-stroke-color': C.base, 'circle-stroke-width': 1.5 } });
    if (!map.getLayer('bases-gl-labels')) map.addLayer({ id: 'bases-gl-labels', type: 'symbol', source: 'bases-gl', minzoom: 5, layout: { 'text-field': ['get', 'code'], 'text-font': ['Noto Sans Regular'], 'text-size': 9, 'text-offset': [0, 1.2], 'text-allow-overlap': true }, paint: { 'text-color': C.cyan, 'text-opacity': ['get', 'opacity'], 'text-halo-color': C.base, 'text-halo-width': 1.5 } });
    if (!map.getLayer('missions-gl-symbols')) map.addLayer({ id: 'missions-gl-symbols', type: 'circle', source: 'missions-gl', minzoom: 5, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 4, 9, 8], 'circle-color': ['match', ['get', 'priority'], 1, C.red, 2, C.amber, C.muted], 'circle-stroke-color': C.base, 'circle-stroke-width': 1.5 } });
    if (!map.getLayer('missions-gl-labels')) map.addLayer({ id: 'missions-gl-labels', type: 'symbol', source: 'missions-gl', minzoom: 5, layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 9, 'text-offset': [0, 1.3], 'text-allow-overlap': true }, paint: { 'text-color': C.amber, 'text-halo-color': C.base, 'text-halo-width': 1.5 } });
    for (const [id, family, minzoom, color] of [['ground-assets-symbols', 'ground', 7, C.green], ['enemy-assets-symbols', 'enemy', 6, C.red]] as const) {
      if (!map.getLayer(id)) map.addLayer({ id, type: 'circle', source: 'assets-gl', minzoom, filter: ['==', ['get', 'family'], family], paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], minzoom, 3, 9, 6], 'circle-color': color, 'circle-stroke-color': C.base, 'circle-stroke-width': 1, 'circle-opacity': ['get', 'opacity'] } });
      const labelsId = id.replace('symbols', 'labels');
      if (!map.getLayer(labelsId)) map.addLayer({ id: labelsId, type: 'symbol', source: 'assets-gl', minzoom: family === 'ground' ? 8 : 8, filter: ['==', ['get', 'family'], family], layout: { 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Regular'], 'text-size': 8, 'text-offset': [0, 1.2], 'text-allow-overlap': true }, paint: { 'text-color': color, 'text-halo-color': C.base, 'text-halo-width': 1.3 } });
    }
    for (const layerId of ['bases-gl-symbols', 'missions-gl-symbols', 'ground-assets-symbols', 'enemy-assets-symbols']) {
      map.on('mouseenter', layerId, () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layerId, () => { if (map) map.getCanvas().style.cursor = ''; });
      map.on('click', layerId, (event) => {
        const feature = event.features?.[0];
        if (!feature || !event.lngLat || !map) return;
        const props = feature.properties ?? {};
        if (feature.source === 'bases-gl') onBaseSelect?.(String(props.id));
        selectMapFeature(feature, event.lngLat);
      });
    }
  }

  function circlePolygon(center: [number, number], radiusKm: number, points = 64): number[][] {
    const cacheKey = `${center[0].toFixed(5)}:${center[1].toFixed(5)}:${radiusKm.toFixed(2)}:${points}`;
    const cached = circlePolygonCache.get(cacheKey);
    if (cached) return cached;
    const [lng, lat] = center;
    const dx = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    const dy = radiusKm / 110.574;
    const coords: number[][] = [];
    for (let i = 0; i <= points; i++) {
      const theta = (i / points) * 2 * Math.PI;
      coords.push([lng + dx * Math.cos(theta), lat + dy * Math.sin(theta)]);
    }
    circlePolygonCache.set(cacheKey, coords);
    if (circlePolygonCache.size > 256) circlePolygonCache.delete(circlePolygonCache.keys().next().value!);
    return coords;
  }

  function threatPolygons(threat: import('../../types').Threat) {
    const { lat, lng } = threat.position;
    const key = `${threat.id}-${threat.radius}-${lat}-${lng}`;
    const cachedRing = (ring: string, radius: number) => {
      const ringKey = `${key}-${ring}`;
      const cached = threatPolyCache.get(ringKey);
      if (cached) return cached;
      const coordinates = circlePolygon([lng, lat], radius);
      threatPolyCache.set(ringKey, coordinates);
      if (threatPolyCache.size > 512) threatPolyCache.delete(threatPolyCache.keys().next().value!);
      return coordinates;
    };
    return { outer: cachedRing('outer', threat.radius), mid: cachedRing('mid', threat.radius * .66), inner: cachedRing('inner', threat.radius * .33) };
  }

  function polygonFeatures(items: Array<AirspaceZone | WeatherSystem>): GeoJSON.Feature[] {
    return items.map((item) => ({
      type: 'Feature',
      properties: 'status' in item ? { id: item.id, type: item.type, status: item.status } : { id: item.id, type: item.type, severity: item.severity },
      geometry: { type: 'Polygon', coordinates: [[...item.polygon.map((point) => [point.lng, point.lat]), [item.polygon[0].lng, item.polygon[0].lat]]] },
    }));
  }

  function setGeoJSONSource(sourceId: string, data: GeoJSON.FeatureCollection): void {
    if (!map) return;
    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (source) source.setData(data);
    else map.addSource(sourceId, { type: 'geojson', data });
  }

  function applyFocusLayerFilters(focus: NonNullable<typeof system.focusMode> | null) {
    if (!map) return;
    const active = Boolean(focus?.active);
    const byId = (ids: string[]) => ['in', ['get', 'id'], ['literal', ids]] as maplibregl.FilterSpecification;
    const combine = (...filters: maplibregl.FilterSpecification[]) => ['all', ...filters] as maplibregl.FilterSpecification;
    const set = (id: string, filter: maplibregl.FilterSpecification | null) => { if (map?.getLayer(id)) map.setFilter(id, filter); };
    const aircraftIds = active ? focus!.visibleAircraftIds : [];
    const threatIds = active ? focus!.visibleThreatIds : [];
    const targetIds = active ? focus!.visibleTargetIds : [];
    const groundIds = active ? focus!.visibleGroundIds : [];
    const enemyIds = active ? focus!.visibleEnemyIds : [];
    const notCluster = ['!', ['has', 'point_count']] as maplibregl.FilterSpecification;

    set('aircraft-clusters', active ? ['==', ['get', 'cluster'], false] : ['has', 'point_count']);
    set('aircraft-cluster-count', active ? ['==', ['get', 'cluster'], false] : ['has', 'point_count']);
    set('aircraft-gl-symbols', active ? combine(notCluster, byId(aircraftIds)) : notCluster);
    set('aircraft-gl-labels', active ? combine(notCluster, byId(aircraftIds)) : notCluster);
    set('aircraft-trails-line', active ? byId(aircraftIds) : null);
    set('simulation-trails-line', active ? byId(aircraftIds) : null);
    set('bases-gl-symbols', active ? byId([]) : null);
    set('bases-gl-labels', active ? byId([]) : null);
    set('missions-gl-symbols', active ? byId(targetIds) : null);
    set('missions-gl-labels', active ? byId(targetIds) : null);
    set('ground-assets-symbols', active ? combine(['==', ['get', 'family'], 'ground'], byId(groundIds)) : ['==', ['get', 'family'], 'ground']);
    set('ground-assets-labels', active ? combine(['==', ['get', 'family'], 'ground'], byId(groundIds)) : ['==', ['get', 'family'], 'ground']);
    set('enemy-assets-symbols', active ? combine(['==', ['get', 'family'], 'enemy'], byId(enemyIds)) : ['==', ['get', 'family'], 'enemy']);
    set('enemy-assets-labels', active ? combine(['==', ['get', 'family'], 'enemy'], byId(enemyIds)) : ['==', ['get', 'family'], 'enemy']);
    for (const [id, radiusLevel] of [['threat-fill-outer', 'outer'], ['threat-outline-outer', 'outer'], ['threat-fill-mid', 'mid'], ['threat-outline-mid', 'mid'], ['threat-fill-inner', 'inner'], ['threat-outline-inner', 'inner']] as const) {
      const radiusFilter = ['==', ['get', 'radiusLevel'], radiusLevel] as maplibregl.FilterSpecification;
      set(id, active ? combine(radiusFilter, byId(threatIds)) : radiusFilter);
    }
    const spoofedFilter = ['==', ['get', 'spoofed'], true] as maplibregl.FilterSpecification;
    set('threat-spoofed-outline', active ? combine(spoofedFilter, byId(threatIds)) : spoofedFilter);
    set('threat-spoofed-x', active ? combine(spoofedFilter, byId(threatIds)) : spoofedFilter);
    set('simulation-threat-pulse-line', active ? byId(threatIds) : null);
    set('focus-aircraft-mark', active ? byId(aircraftIds) : byId([]));
    set('focus-aircraft-label', active ? byId(aircraftIds) : byId([]));
  }

  onMount(() => {
    const applyFocusLock = (locked: boolean) => {
      mapFocusLocked = locked;
      if (!map) return;
      if (locked) { map.dragPan.disable(); map.scrollZoom.disable(); map.doubleClickZoom.disable(); map.keyboard.disable(); }
      else { map.dragPan.enable(); map.scrollZoom.enable(); map.doubleClickZoom.enable(); map.keyboard.enable(); }
    };
    const handleFocusLock = (event: Event) => applyFocusLock(Boolean((event as CustomEvent<boolean>).detail));
    const refocus = () => map?.fitBounds(experienceBoundsOrScenario(system.activeScenarioFilter ?? 'deep_strike', SCENARIO_AREAS), { padding: 80, duration: 1200 });
    const handleExperienceMode = (event: Event) => {
      const { mode, scenario } = (event as CustomEvent<{ mode: string | null; scenario: string | null }>).detail;
      if (mode) {
        const key = scenario ?? (mode === 'training' ? 'deep_strike' : null);
        map?.fitBounds(experienceBoundsOrScenario(key, SCENARIO_AREAS), { padding: 80, duration: 1200 });
        applyFocusLock(true);
      }
    };
    window.addEventListener('aircommand:focus-lock', handleFocusLock);
    window.addEventListener('aircommand:refocus', refocus);
    window.addEventListener('aircommand:experience-mode', handleExperienceMode);
    const handleLayerToggle = (event: Event) => {
      const layer = (event as CustomEvent<string>).detail;
      const toggles: Record<string, () => void> = {
        terrain: toggleTerrain, airspace: toggleAirspace, weather: toggleWeather,
        enemy: toggleEnemy, ground: toggleGround, trails: toggleTrails,
        grid: toggleGrid, threats: toggleThreats,
      };
      toggles[layer]?.();
    };
    const handleTerrain3d = (event: Event) => {
      const enabled = (event as CustomEvent<boolean>).detail;
      if (!map) return;
      terrain3dEnabled = enabled;
      terrainPaused = false;
      if (enabled) {
        map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 });
        map.setPitch(45);
        map.dragRotate.enable();
      } else {
        map.setTerrain(null);
        map.setPitch(0);
        map.dragRotate.disable();
      }
    };
    const handleMatrixHighlight = (event: Event) => {
      const { aircraftId, missionId } = (event as CustomEvent<{ aircraftId: string; missionId: string | null }>).detail;
      document.querySelectorAll<HTMLElement>('[data-aircraft-id]').forEach((element) => element.classList.toggle('matrix-highlight-marker', element.dataset.aircraftId === aircraftId && missionId !== null));
      const source = map?.getSource('matrix-highlight') as maplibregl.GeoJSONSource | undefined;
      if (!source || !missionId) { source?.setData({ type: 'FeatureCollection', features: [] }); return; }
      const aircraftItem = system.aircraft.find((item) => item.id === aircraftId);
      const missionItem = system.missions.find((item) => item.id === missionId);
      if (!aircraftItem || !missionItem) return;
      const start: [number, number] = [aircraftItem.position.lng, aircraftItem.position.lat];
      const finish: [number, number] = [missionItem.target.lng, missionItem.target.lat];
      const nearestThreat = system.threats.reduce<(typeof system.threats)[number] | null>((nearest, threat) => {
        if (!nearest) return threat;
        return Math.hypot(threat.position.lat - aircraftItem.position.lat, threat.position.lng - aircraftItem.position.lng) < Math.hypot(nearest.position.lat - aircraftItem.position.lat, nearest.position.lng - aircraftItem.position.lng) ? threat : nearest;
      }, null);
      const features: GeoJSON.Feature[] = [
        { type: 'Feature', properties: { kind: 'route' }, geometry: { type: 'LineString', coordinates: [start, finish] } },
        { type: 'Feature', properties: { kind: 'fuel' }, geometry: { type: 'Polygon', coordinates: [circlePolygon(start, Math.max(35, aircraftItem.fuel * 7))] } },
      ];
      if (nearestThreat) features.push({ type: 'Feature', properties: { kind: 'wez' }, geometry: { type: 'Polygon', coordinates: [circlePolygon([nearestThreat.position.lng, nearestThreat.position.lat], nearestThreat.radius)] } });
      source.setData({ type: 'FeatureCollection', features });
    };
    window.addEventListener('aircommand:map-layer', handleLayerToggle);
    window.addEventListener('aircommand:terrain-3d', handleTerrain3d);
    window.addEventListener('aircommand:matrix-highlight', handleMatrixHighlight);
    // Expose global loadout handler for popup clicks
    (window as any).__airCommandLoadout = (type: string, tail: string) => {
      onLoadoutClick?.(type, tail);
    };

    setMaxParallelImageRequests(6);
    map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: [79, 31],
      zoom: 3.8,
      attributionControl: false,
      dragRotate: false,
    });
    const onDiagramFocus = (event: Event) => {
      const detail = (event as CustomEvent<{ bounds?: [[number, number], [number, number]]; text: string }>).detail;
      if (detail.bounds && map) {
        map.flyTo({ center: [(detail.bounds[0][0] + detail.bounds[1][0]) / 2, (detail.bounds[0][1] + detail.bounds[1][1]) / 2], zoom: Math.min(7.8, Math.max(5.5, map.getZoom())), duration: 1200 });
        const ring = map.getSource('diagram-focus-area') as maplibregl.GeoJSONSource | undefined;
        ring?.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [detail.bounds[0][0], detail.bounds[0][1]],
                [detail.bounds[1][0], detail.bounds[0][1]],
                [detail.bounds[1][0], detail.bounds[1][1]],
                [detail.bounds[0][0], detail.bounds[1][1]],
                [detail.bounds[0][0], detail.bounds[0][1]],
              ]],
            },
          }],
        });
      }
      diagramExplanation = detail.text;
      if (diagramExplanationTimer) clearTimeout(diagramExplanationTimer);
      diagramExplanationTimer = setTimeout(() => {
        diagramExplanation = '';
        const ring = map?.getSource('diagram-focus-area') as maplibregl.GeoJSONSource | undefined;
        ring?.setData({ type: 'FeatureCollection', features: [] });
      }, 5000);
    };
    const handleMapElementFocus = (event: Event) => {
      // Focus reveals can arrive while the map is being replaced or its style
      // is being detached. In that window MapLibre getters such as getLayer
      // throw even though the map object still exists.
      if (!map || !map.isStyleLoaded()) return;
      const focus = (event as CustomEvent<MapFocusElement[]>).detail ?? [];
      const focusPoints: Array<{ item: MapFocusElement; point: [number, number] }> = [];
      for (const item of focus) {
        let point: [number, number] | null = null;
        if (item.type === 'aircraft') {
          const aircraftItem = system.aircraft.find((aircraft) => aircraft.id === item.id || aircraft.tailNumber === item.id);
          if (aircraftItem) point = [aircraftItem.position.lng, aircraftItem.position.lat];
        } else if (item.type === 'target') {
          const mission = system.missions.find((candidate) => candidate.id === item.id || candidate.name.toLowerCase() === item.id.toLowerCase());
          if (mission) point = [mission.target.lng, mission.target.lat];
        } else if (item.type === 'weapon') {
          const activeMission = system.activeMissions.find((candidate) => candidate.phase !== 'COMPLETE' && candidate.phase !== 'ABORTED');
          const launchingAircraft = system.aircraft.find((aircraft) => activeMission?.aircraftIds.includes(aircraft.id));
          if (launchingAircraft) point = [launchingAircraft.position.lng, launchingAircraft.position.lat];
        }
        if (!point) continue;
        focusPoints.push({ item, point });
      }
      if (focusPoints.length) map.jumpTo({ center: [focusPoints.reduce((sum, entry) => sum + entry.point[0], 0) / focusPoints.length, focusPoints.reduce((sum, entry) => sum + entry.point[1], 0) / focusPoints.length], zoom: Math.min(7.5, Math.max(5.5, map.getZoom())) });
      narrativeMarkers = focusPoints.map(({ item, point }) => { const pixel = map!.project(point); return { x: pixel.x, y: pixel.y, label: item.label ?? item.id, opacity: 1 }; });
      if (mapFocusTimer) clearTimeout(mapFocusTimer);
      if (mapFocusClearTimer) clearTimeout(mapFocusClearTimer);
      mapFocusTimer = setTimeout(() => { narrativeMarkers = narrativeMarkers.map((marker) => ({ ...marker, opacity: 0.15 })); mapFocusClearTimer = setTimeout(() => { narrativeMarkers = []; }, 500); }, 3500);
    };
    window.addEventListener('aircommand:diagram-focus', onDiagramFocus);
    window.addEventListener('aircommand:map-focus-elements', handleMapElementFocus);
    map.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    map.on('movestart', () => {
      if (terrainResumeTimer) clearTimeout(terrainResumeTimer);
      if (map && terrain3dEnabled && terrainPaused) { map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 }); terrainPaused = false; }
    });
    map.on('moveend', () => {
      if (map && map.isStyleLoaded()) {
        const center = map.getCenter();
        mapCenterLabel = `${Math.abs(center.lat).toFixed(1)}°${center.lat >= 0 ? 'N' : 'S'} / ${Math.abs(center.lng).toFixed(1)}°${center.lng >= 0 ? 'E' : 'W'}`;
      }
      if (map && map.isStyleLoaded() && terrain3dEnabled) {
        map.setTerrain(null); terrainPaused = true;
        if (terrainResumeTimer) clearTimeout(terrainResumeTimer);
        terrainResumeTimer = setTimeout(() => {
          if (map && map.isStyleLoaded() && terrain3dEnabled) { map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 }); terrainPaused = false; }
        }, 200);
      }
    });
    map.on('zoom', () => {
      // MapLibre emits movement/zoom callbacks as a map is removed. Avoid
      // querying hillshade layers after its style has been detached.
      if (!map || !map.isStyleLoaded()) return;
      const zoom = map.getZoom();
      mapZoom = zoom;
      const center = map.getCenter();
      mapCenterLabel = `${Math.abs(center.lat).toFixed(1)}°${center.lat >= 0 ? 'N' : 'S'} / ${Math.abs(center.lng).toFixed(1)}°${center.lng >= 0 ? 'E' : 'W'}`;
      const hillshadeVisibility = showTerrain && zoom >= 8 && (!system.focusMode?.active || system.focusMode.revealedLayers.includes('terrain')) ? 'visible' : 'none';
      if (map.getLayer('hillshade-base')) map.setLayoutProperty('hillshade-base', 'visibility', hillshadeVisibility);
      if (map.getLayer('hillshade-detail')) map.setLayoutProperty('hillshade-detail', 'visibility', hillshadeVisibility);
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      const m = map!;
      ensureOperationalPointLayers();
      m.addSource('interaction-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('interaction-impact', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'interaction-impact-pulse', type: 'circle', source: 'interaction-impact', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 9, 8, 20], 'circle-color': C.red, 'circle-opacity': .12, 'circle-stroke-color': C.red, 'circle-stroke-width': 2, 'circle-stroke-opacity': .95 } });
      m.addLayer({ id: 'interaction-route-line', type: 'line', source: 'interaction-route', paint: { 'line-color': C.cyan, 'line-width': 3, 'line-opacity': .9, 'line-dasharray': [1.5, 1] } });
      m.on('mousemove', showMapTooltip);
      m.on('mouseout', () => { mapTooltip = null; if (hoverTimer) clearTimeout(hoverTimer); });
      m.on('movestart', () => { mapTooltip = null; if (hoverTimer) clearTimeout(hoverTimer); });
      m.on('click', (event) => {
        const feature = m.queryRenderedFeatures(event.point).find((item) => featureKind(item) !== 'map');
        if (feature) { selectMapFeature(feature, event.lngLat); return; }
        selectedMapCard = null;
        (m.getSource('interaction-route') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] });
      });
      m.on('contextmenu', (event) => {
        event.preventDefault();
        const feature = m.queryRenderedFeatures(event.point).find((item) => featureKind(item) !== 'map');
        if (!feature) { mapContext = null; return; }
        const kind = featureKind(feature), props = feature.properties ?? {};
        mapContext = { x: event.originalEvent.clientX, y: event.originalEvent.clientY, kind, id: String(props.id ?? props.tailNumber ?? props.code ?? ''), title: String(props.tailNumber ?? props.code ?? props.label ?? props.type ?? kind.toUpperCase()) };
      });
      m.addSource('scenario-area', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'scenario-area-fill', type: 'fill', source: 'scenario-area', paint: { 'fill-color': C.cyan, 'fill-opacity': 0.035 } });
      m.addLayer({ id: 'scenario-area-outline', type: 'line', source: 'scenario-area', paint: { 'line-color': C.cyan, 'line-width': 1.6, 'line-opacity': 0.78, 'line-dasharray': [1.2, 1.6] } });
      m.addSource('diagram-focus-area', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('aircraft-trails', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('focus-aircraft', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'focus-aircraft-mark', type: 'circle', source: 'focus-aircraft', paint: { 'circle-radius': 8, 'circle-color': ['match', ['get', 'status'], 'FMC', C.green, 'PMC', C.amber, C.muted], 'circle-opacity': ['get', 'opacity'], 'circle-opacity-transition': { duration: 300 }, 'circle-stroke-color': C.text, 'circle-stroke-width': 1.5 } });
      m.addLayer({ id: 'focus-aircraft-label', type: 'symbol', source: 'focus-aircraft', layout: { 'text-field': ['get', 'tailNumber'], 'text-font': ['Noto Sans Regular'], 'text-size': 10, 'text-offset': [0, 1.5], 'text-allow-overlap': true }, paint: { 'text-color': C.cyan, 'text-opacity': ['get', 'opacity'], 'text-opacity-transition': { duration: 300 }, 'text-halo-color': C.base, 'text-halo-width': 2 } });
      m.addSource('focus-route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'focus-route-line', type: 'line', source: 'focus-route', paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-opacity': ['get', 'opacity'], 'line-opacity-transition': { duration: 300 }, 'line-dasharray': [1, 0] } });
      m.addLayer({ id: 'aircraft-trails-line', type: 'line', source: 'aircraft-trails', layout: { visibility: showTrails ? 'visible' : 'none' }, paint: { 'line-color': ['match', ['get', 'status'], 'FMC', C.green, 'PMC', C.amber, C.muted], 'line-width': 2, 'line-opacity': ['get', 'opacity'] } });
      m.addLayer({ id: 'diagram-focus-outline', type: 'line', source: 'diagram-focus-area', paint: { 'line-color': C.cyan, 'line-width': 3, 'line-opacity': 0.95, 'line-dasharray': [1, 1.5] } });
      const hillshadeVisibility = showTerrain && m.getZoom() >= 8 && (!system.focusMode?.active || system.focusMode.revealedLayers.includes('terrain')) ? 'visible' : 'none';
      m.setLayoutProperty('hillshade-base', 'visibility', hillshadeVisibility);
      m.setLayoutProperty('hillshade-detail', 'visibility', hillshadeVisibility);
      m.addSource('matrix-highlight', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('simulation-trails', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'simulation-trails-line', type: 'line', source: 'simulation-trails', paint: { 'line-color': C.cyan, 'line-width': 2, 'line-opacity': ['get', 'opacity'], 'line-dasharray': [2, 1] } });
      m.addSource('simulation-missiles', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'simulation-missile-trail', type: 'line', source: 'simulation-missiles', filter: ['==', ['geometry-type'], 'LineString'], paint: { 'line-color': C.red, 'line-width': 2.5, 'line-opacity': .9 } });
      m.addLayer({ id: 'simulation-missile-point', type: 'circle', source: 'simulation-missiles', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': C.red, 'circle-stroke-color': C.text, 'circle-stroke-width': 1.5 } });
      m.on('click', 'simulation-missile-point', () => {
        if (system.focusMode?.active) window.dispatchEvent(new CustomEvent('aircommand:arc-viewer', { detail: { entityType: 'missile', entityId: 'MISSILE', missionId: system.focusMode.missionId ?? '' } }));
      });
      m.addSource('simulation-impacts', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addSource('focus-impact', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'focus-impact-fill', type: 'fill', source: 'focus-impact', paint: { 'fill-color': C.red, 'fill-opacity': ['*', ['get', 'opacity'], .12], 'fill-opacity-transition': { duration: 300 } } });
      m.addLayer({ id: 'focus-impact-outline', type: 'line', source: 'focus-impact', paint: { 'line-color': C.red, 'line-width': 2, 'line-opacity': ['*', ['get', 'opacity'], .85], 'line-opacity-transition': { duration: 300 }, 'line-dasharray': [2, 1.5] } });
      m.addLayer({ id: 'simulation-impact-pulse', type: 'fill', source: 'simulation-impacts', paint: { 'fill-color': C.red, 'fill-opacity': ['*', ['-', 1, ['get', 'progress']], .26] } });
      m.addLayer({ id: 'simulation-impact-outline', type: 'line', source: 'simulation-impacts', paint: { 'line-color': C.red, 'line-width': 2, 'line-opacity': ['-', 1, ['get', 'progress']] } });
      m.addSource('simulation-impact-flashes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'simulation-impact-flash', type: 'circle', source: 'simulation-impact-flashes', paint: { 'circle-radius': 14, 'circle-color': C.red, 'circle-opacity': .75, 'circle-stroke-color': C.red, 'circle-stroke-width': 4, 'circle-stroke-opacity': .45 } });
      m.addSource('simulation-radar-sweep', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'simulation-radar-sweep-line', type: 'line', source: 'simulation-radar-sweep', paint: { 'line-color': C.amber, 'line-width': 1.5, 'line-opacity': .7, 'line-dasharray': [2, 1] } });
      m.addSource('simulation-threat-pulse', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'simulation-threat-pulse-line', type: 'line', source: 'simulation-threat-pulse', paint: { 'line-color': C.red, 'line-width': 2, 'line-opacity': ['get', 'opacity'] } });
      m.addLayer({ id: 'matrix-highlight-fuel', type: 'line', source: 'matrix-highlight', filter: ['==', ['get', 'kind'], 'fuel'], paint: { 'line-color': C.green, 'line-width': 1.5, 'line-dasharray': [2, 2], 'line-opacity': .85 } });
      m.addLayer({ id: 'matrix-highlight-wez', type: 'line', source: 'matrix-highlight', filter: ['==', ['get', 'kind'], 'wez'], paint: { 'line-color': C.red, 'line-width': 1.5, 'line-dasharray': [1, 2], 'line-opacity': .95 } });
      m.addLayer({ id: 'matrix-highlight-route', type: 'line', source: 'matrix-highlight', filter: ['==', ['get', 'kind'], 'route'], paint: { 'line-color': C.cyan, 'line-width': 2.5, 'line-opacity': .95 } });
      m.fire('zoom');
      mapReady = true;
    });

    return () => {
      window.removeEventListener('aircommand:diagram-focus', onDiagramFocus);
      window.removeEventListener('aircommand:map-focus-elements', handleMapElementFocus);
      window.removeEventListener('aircommand:focus-lock', handleFocusLock);
      window.removeEventListener('aircommand:refocus', refocus);
      window.removeEventListener('aircommand:experience-mode', handleExperienceMode);
      if (diagramExplanationTimer) clearTimeout(diagramExplanationTimer);
      if (mapFocusTimer) clearTimeout(mapFocusTimer);
      if (mapFocusClearTimer) clearTimeout(mapFocusClearTimer);
      window.removeEventListener('aircommand:map-layer', handleLayerToggle);
      window.removeEventListener('aircommand:terrain-3d', handleTerrain3d);
      window.removeEventListener('aircommand:matrix-highlight', handleMatrixHighlight);
      delete (window as any).__airCommandLoadout;
      if (terrainResumeTimer) clearTimeout(terrainResumeTimer);
      for (const timer of trailClearTimers.values()) clearTimeout(timer);
      trailClearTimers.clear();
      map?.remove();
      map = null;
    };
  });

  // Layer control toggle handlers
  function toggleTerrain() {
    showTerrain = !showTerrain;
    if (!map) return;
    const vis = showTerrain && map.getZoom() >= 8 ? 'visible' : 'none';
    if (map.getLayer('hillshade-base')) map.setLayoutProperty('hillshade-base', 'visibility', vis);
    if (map.getLayer('hillshade-detail')) map.setLayoutProperty('hillshade-detail', 'visibility', vis);
  }

  function clearTrails() {
    trailHistory = {};
    lastTrailFeatureSignature = '[]';
    lastSimulationTrailFeatureSignature = '[]';
    clearSimulationTrails();
    for (const timer of trailClearTimers.values()) clearTimeout(timer);
    trailClearTimers.clear();
    const source = map?.getSource('aircraft-trails') as maplibregl.GeoJSONSource | undefined;
    source?.setData({ type: 'FeatureCollection', features: [] });
    const simSource = map?.getSource('simulation-trails') as maplibregl.GeoJSONSource | undefined;
    simSource?.setData({ type: 'FeatureCollection', features: [] });
  }

  function toggleGrid() {
    showGrid = !showGrid;
    if (!map) return;
    const vis = showGrid ? 'visible' : 'none';
    if (map.getLayer('grid-lines')) map.setLayoutProperty('grid-lines', 'visibility', vis);
  }

  function toggleTrails() {
    showTrails = !showTrails;
    if (!map) return;
    if (!showTrails) clearTrails();
    if (map.getLayer('aircraft-trails-line')) map.setLayoutProperty('aircraft-trails-line', 'visibility', showTrails ? 'visible' : 'none');
    if (map.getLayer('simulation-trails-line')) map.setLayoutProperty('simulation-trails-line', 'visibility', showTrails ? 'visible' : 'none');
  }

  function toggleThreats() {
    showThreats = !showThreats;
    if (!map) return;
    const vis = showThreats ? 'visible' : 'none';
    const threatLayers = [
      'threat-fill-outer',
      'threat-fill-mid',
      'threat-fill-inner',
      'threat-outline-outer',
      'threat-outline-mid',
      'threat-outline-inner',
      'threat-spoofed-outline',
      'threat-spoofed-x',
    ];
    for (const lid of threatLayers) {
      if (map.getLayer(lid)) map.setLayoutProperty(lid, 'visibility', vis);
    }
  }

  // Reactive updates for aircraft, threats, missions, base selection
  $effect(() => {
    if (!mapReady || !map) return;
    const scenarioKey = system.activeScenarioFilter;
    const focus = system.focusMode;
    const revealedLayers = focus?.revealedLayers ?? [];
    // Read the nested field before scheduling the map update so every reveal retriggers this effect.
    const revealSignature = revealedLayers.join('|');
    void revealSignature;
    const aircraft = system.scenarioAircraft;
    const missions = system.scenarioMissions;
    const threats = system.scenarioThreats;
    const area = scenarioKey ? experienceBoundsOrScenario(scenarioKey, SCENARIO_AREAS) : null;
    const inArea = (points: { lng: number; lat: number }[]) => !area || points.some((p) => p.lng >= area[0][0] && p.lng <= area[1][0] && p.lat >= area[0][1] && p.lat <= area[1][1]);
    const airspace = scenarioKey ? system.airspaceZones.filter((zone) => inArea(zone.polygon)) : system.airspaceZones;
    const weather = scenarioKey ? system.weatherSystems.filter((item) => inArea(item.polygon)) : system.weatherSystems;
    const trailSnapshot = trails;
    const spoofedTrackId = system.spoofedTrackId;
    if (scenarioKey !== lastScenarioView) {
      if (lastScenarioView !== undefined && scenarioKey === null) clearTrails();
      lastScenarioView = scenarioKey;
      if (area) map.fitBounds(area, { padding: 70, duration: 850, maxZoom: 7.4 });
      else if (scenarioKey === null) map.flyTo({ center: [79, 31], zoom: 3.8, duration: 850 });
    }
    const areaSource = map.getSource('scenario-area') as maplibregl.GeoJSONSource | undefined;
    if (areaSource) {
      const features: GeoJSON.Feature[] = area ? [{
        type: 'Feature', properties: { id: scenarioKey },
        geometry: { type: 'Polygon', coordinates: [[[area[0][0], area[0][1]], [area[1][0], area[0][1]], [area[1][0], area[1][1]], [area[0][0], area[1][1]], [area[0][0], area[0][1]]]] },
      }] : [];
      areaSource.setData({ type: 'FeatureCollection', features });
    }
    const selectedCoa = system.coas.find((coa) => coa.id === system.selectedCoaId) ?? (focus?.active && focus.missionId ? { id: 'focus-route', rank: 1, assignments: { [focus.missionId]: focus.assignedAircraftIds }, riskScore: 0, successProbability: 0, timeToEffect: 0, explanation: '' } : null);
    const selBase = system.selectedBaseId;
    const focusMission = focus?.active ? system.missions.find((item) => item.id === focus.missionId) : null;
    setGeoJSONSource('focus-impact', { type: 'FeatureCollection', features: focusMission ? [{ type: 'Feature', properties: { opacity: revealedLayers.includes('impact') ? 1 : 0 }, geometry: { type: 'Polygon', coordinates: [circlePolygon([focusMission.target.lng, focusMission.target.lat], 15)] } }] : [] });
    // Capture layer toggles as dependencies so their latest values drive the batched render.
    const layerState = [showTerrain, showGrid, showTrails, showThreats, showGround, showAirspace, showWeather, showEnemy];
    void layerState;
    if (map.getLayer('grid-lines')) map.setLayoutProperty('grid-lines', 'visibility', showGrid && (!focus?.active || focus.revealedLayers.includes('grid')) ? 'visible' : 'none');
    if (focus?.active) {
      const hillshadeVisibility = showTerrain && focus.revealedLayers.includes('terrain') && map.getZoom() >= 8 ? 'visible' : 'none';
      if (map.getLayer('hillshade-base')) map.setLayoutProperty('hillshade-base', 'visibility', hillshadeVisibility);
      if (map.getLayer('hillshade-detail')) map.setLayoutProperty('hillshade-detail', 'visibility', hillshadeVisibility);
    }
    let frame = 0;
    const debounce = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        if (!map) return;

    ensureAircraftLayer();
    ensureOperationalPointLayers();
    const aircraftSource = map.getSource('aircraft-gl') as maplibregl.GeoJSONSource | undefined;
    if (aircraftSource) {
      aircraftSource.setData({ type: 'FeatureCollection', features: aircraft.map((ac) => ({ type: 'Feature', properties: { id: ac.id, tailNumber: ac.tailNumber, status: ac.status, type: ac.type, fuel: ac.fuel, base: ac.base.toUpperCase() }, geometry: { type: 'Point', coordinates: [ac.position.lng, ac.position.lat] } })) });
      map.setLayoutProperty('aircraft-gl-symbols', 'visibility', 'visible');
    }
    const focusAircraftSource = map.getSource('focus-aircraft') as maplibregl.GeoJSONSource | undefined;
    focusAircraftSource?.setData({ type: 'FeatureCollection', features: focus?.active ? system.aircraft.filter((item) => focus.assignedAircraftIds.includes(item.id)).map((item) => ({ type: 'Feature' as const, properties: { id: item.id, tailNumber: item.tailNumber, status: item.status, opacity: focus.visibleAircraftIds.includes(item.id) ? 1 : 0 }, geometry: { type: 'Point' as const, coordinates: [item.position.lng, item.position.lat] as [number, number] } })) : [] });
    const focusRouteFeatures: GeoJSON.Feature[] = [];
    if (focus?.active && focus.missionId) {
      const routeMission = system.missions.find((item) => item.id === focus.missionId);
      const routeAircraft = system.aircraft.find((item) => focus.visibleAircraftIds.includes(item.id) || focus.assignedAircraftIds.includes(item.id));
      if (routeMission && routeAircraft) {
        const start: [number, number] = [routeAircraft.position.lng, routeAircraft.position.lat];
        const target: [number, number] = [routeMission.target.lng, routeMission.target.lat];
        const at = (fraction: number): [number, number] => [start[0] + (target[0] - start[0]) * fraction, start[1] + (target[1] - start[1]) * fraction];
        const routeRevealed = revealedLayers.includes('route');
        const segments = [
          { phase: 'ingress', coordinates: [start, at(.55)], color: C.cyan, visible: routeRevealed },
          { phase: 'wez', coordinates: [at(.55), at(.82)], color: C.amber, visible: routeRevealed && revealedLayers.includes('wez') },
          { phase: 'release', coordinates: [at(.82), target], color: C.red, visible: routeRevealed && revealedLayers.includes('targets') },
          { phase: 'egress', coordinates: [target, at(.42)], color: C.green, visible: routeRevealed && revealedLayers.includes('egress') },
        ];
        for (const segment of segments) {
          focusRouteFeatures.push({ type: 'Feature', properties: { phase: segment.phase, color: segment.color, opacity: segment.visible ? 0.95 : 0 }, geometry: { type: 'LineString', coordinates: segment.coordinates } });
        }
      }
    }
    (map.getSource('focus-route') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: focusRouteFeatures });
    const baseSource = map.getSource('bases-gl') as maplibregl.GeoJSONSource;
    baseSource.setData({ type: 'FeatureCollection', features: IAF_BASES.map((base) => ({ type: 'Feature', properties: { id: base.id, code: base.code, label: base.name, elevation: base.elevation, selected: base.id === selBase, opacity: 1 }, geometry: { type: 'Point', coordinates: [base.lng, base.lat] } })) });

    // Clean previous threat layers & source
    const threatLayers = [
      'threat-fill-outer',
      'threat-fill-mid',
      'threat-fill-inner',
      'threat-outline-outer',
      'threat-outline-mid',
      'threat-outline-inner',
      'threat-spoofed-outline',
      'threat-spoofed-x',
    ];
    for (const lid of threatLayers) {
      if (map.getLayer(lid)) map.removeLayer(lid);
    }
    if (map.getSource('threat-zones')) map.removeSource('threat-zones');
    if (map.getSource('threat-centers')) map.removeSource('threat-centers');
    for (const id of ['airspace-fill', 'airspace-line', 'weather-fill', 'weather-line']) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    for (const id of ['airspace-zones', 'weather-systems']) {
      if (map.getSource(id)) map.removeSource(id);
    }
    for (let i = 0; i < 32; i++) {
      for (const prefix of ['coa-route-ingress', 'coa-route-wez', 'coa-route-release', 'coa-route-egress', 'coa-route-rtb', 'fuel-range']) {
        const id = `${prefix}-${i}`;
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getSource(id)) map.removeSource(id);
      }
    }

    const trailFeatures: GeoJSON.Feature[] = [];
    for (const aircraftItem of aircraft) {
      if (aircraftItem.status === 'NMC') continue;
      const points = [...(trailSnapshot[aircraftItem.id] ?? [])].slice(-7).reverse();
      const assigned = system.activeMissions.some((mission) => mission.aircraftIds.includes(aircraftItem.id) && !['COMPLETE', 'ABORTED'].includes(mission.phase));
      for (let index = 1; index < points.length; index++) {
        const alpha = (1 - (index - 1) / 6) * (assigned ? 1 : 0.18);
        trailFeatures.push({ type: 'Feature', properties: { id: aircraftItem.id, status: aircraftItem.status, opacity: alpha }, geometry: { type: 'LineString', coordinates: [points[index - 1], points[index]] } });
      }
    }
    const trailSource = map.getSource('aircraft-trails') as maplibregl.GeoJSONSource | undefined;
    const trailSignature = JSON.stringify(trailFeatures);
    if (trailSource && trailSignature !== lastTrailFeatureSignature) {
      trailSource.setData({ type: 'FeatureCollection', features: trailFeatures });
      lastTrailFeatureSignature = trailSignature;
    }

    // Add 3-tier concentric translucent threat geometry (Layer 2)
    const threatFeatures: GeoJSON.Feature[] = [];
    const threatCenterFeatures: GeoJSON.Feature[] = [];

    for (const t of threats) {
      const polygons = threatPolygons(t);
      // Center point
      const isSpoofed = spoofedTrackId === t.id;
      threatCenterFeatures.push({
        type: 'Feature',
        properties: { id: t.id, type: t.type, radius: t.radius, probability: t.probability, confidence: t.confidence, spoofed: isSpoofed },
        geometry: { type: 'Point', coordinates: [t.position.lng, t.position.lat] },
      });

      // Outer ring: 100% radius
      threatFeatures.push({
        type: 'Feature',
        properties: { id: t.id, type: t.type, radius: t.radius, probability: t.probability, confidence: t.confidence, radiusLevel: 'outer' },
        geometry: {
          type: 'Polygon',
          coordinates: [polygons.outer],
        },
      });

      // Mid ring: 66% radius
      threatFeatures.push({
        type: 'Feature',
        properties: { id: t.id, type: t.type, radius: t.radius, probability: t.probability, confidence: t.confidence, radiusLevel: 'mid' },
        geometry: {
          type: 'Polygon',
          coordinates: [polygons.mid],
        },
      });

      // Inner ring: 33% radius
      threatFeatures.push({
        type: 'Feature',
        properties: { id: t.id, type: t.type, radius: t.radius, probability: t.probability, confidence: t.confidence, radiusLevel: 'inner' },
        geometry: {
          type: 'Polygon',
          coordinates: [polygons.inner],
        },
      });
    }

    setGeoJSONSource('threat-zones', { type: 'FeatureCollection', features: threatFeatures });
    setGeoJSONSource('threat-centers', { type: 'FeatureCollection', features: threatCenterFeatures });

    const threatVis = showThreats ? 'visible' : 'none';

    // 1. Outer ring: fill 0.06
    map.addLayer({
      id: 'threat-fill-outer',
      type: 'fill',
      source: 'threat-zones',
      minzoom: 5,
      filter: ['==', 'radiusLevel', 'outer'],
      layout: { visibility: threatVis },
      paint: { 'fill-color': C.red, 'fill-opacity': 0.05 },
    });

    // 2. Mid ring: fill 0.10
    map.addLayer({
      id: 'threat-fill-mid',
      type: 'fill',
      source: 'threat-zones',
      minzoom: 5,
      filter: ['==', 'radiusLevel', 'mid'],
      layout: { visibility: threatVis },
      paint: { 'fill-color': C.red, 'fill-opacity': 0.10 },
    });

    // 3. Inner ring: fill 0.16
    map.addLayer({
      id: 'threat-fill-inner',
      type: 'fill',
      source: 'threat-zones',
      minzoom: 5,
      filter: ['==', 'radiusLevel', 'inner'],
      layout: { visibility: threatVis },
      paint: { 'fill-color': C.red, 'fill-opacity': 0.15 },
    });

    // Outer dashed outline 1px, opacity 0.45
    map.addLayer({
      id: 'threat-outline-outer',
      type: 'line',
      source: 'threat-zones',
      minzoom: 5,
      filter: ['==', 'radiusLevel', 'outer'],
      layout: { visibility: threatVis },
      paint: {
        'line-color': C.red,
        'line-width': 1,
        'line-opacity': 0.35,
        'line-dasharray': [4, 3],
      },
    });

    for (const [radiusLevel, layerId] of [['mid', 'threat-outline-mid'], ['inner', 'threat-outline-inner']] as const) {
      map.addLayer({ id: layerId, type: 'line', source: 'threat-zones', minzoom: 5, filter: ['==', 'radiusLevel', radiusLevel], layout: { visibility: threatVis }, paint: { 'line-color': C.red, 'line-width': 0.5, 'line-opacity': 0.4 } });
    }

    // Spoofed track marker: hollow red outline with X
    map.addLayer({
      id: 'threat-spoofed-outline',
      type: 'circle',
      source: 'threat-centers',
      filter: ['==', ['get', 'spoofed'], true],
      layout: { visibility: threatVis },
      paint: {
        'circle-radius': 6,
        'circle-color': 'transparent',
        'circle-stroke-width': 2,
        'circle-stroke-color': C.red,
        'circle-stroke-opacity': 0.9,
      },
    });

    // X cross for spoofed tracks
    map.addLayer({
      id: 'threat-spoofed-x',
      type: 'symbol',
      source: 'threat-centers',
      minzoom: 8,
      filter: ['==', ['get', 'spoofed'], true],
      layout: { 
        visibility: threatVis,
        'text-field': '✕',
        'text-size': 14,
        'text-anchor': 'center',
      },
      paint: {
        'text-color': C.red,
        'text-opacity': 0.9,
      },
    });

    // Operational airspace and weather layers are recreated from the current store state.
    setGeoJSONSource('airspace-zones', { type: 'FeatureCollection', features: polygonFeatures(airspace) });
    map.addLayer({
      id: 'airspace-fill', type: 'fill', source: 'airspace-zones', layout: { visibility: showAirspace ? 'visible' : 'none' },
      minzoom: 5,
      paint: { 'fill-color': ['match', ['get', 'type'], 'corridor', C.cyan, 'kill-box', C.amber, 'restricted', C.red, C.muted], 'fill-opacity': focus?.active ? ['*', ['case', ['==', ['get', 'status'], 'CLOSED'], 0.16, 0.08], 0.2] : ['case', ['==', ['get', 'status'], 'CLOSED'], 0.16, 0.08] },
    });
    map.addLayer({
      id: 'airspace-line', type: 'line', source: 'airspace-zones', layout: { visibility: showAirspace ? 'visible' : 'none' },
      minzoom: 5,
      paint: { 'line-color': ['match', ['get', 'type'], 'corridor', C.cyan, 'kill-box', C.amber, 'restricted', C.red, C.muted], 'line-width': 1.3, 'line-opacity': focus?.active ? 0.2 : 1, 'line-dasharray': [3, 2] },
    });
    setGeoJSONSource('weather-systems', { type: 'FeatureCollection', features: polygonFeatures(weather) });
    map.addLayer({
      id: 'weather-fill', type: 'fill', source: 'weather-systems', layout: { visibility: showWeather ? 'visible' : 'none' },
      minzoom: 4,
      paint: { 'fill-color': ['match', ['get', 'type'], 'storm', C.cyan, 'fog', C.secondary, 'front', C.cyan, C.green], 'fill-opacity': focus?.active ? ['*', ['interpolate', ['linear'], ['get', 'severity'], 1, 0.025, 5, 0.18], 0.2] : ['interpolate', ['linear'], ['get', 'severity'], 1, 0.025, 5, 0.18] },
    });
    map.addLayer({
      id: 'weather-line', type: 'line', source: 'weather-systems', layout: { visibility: showWeather ? 'visible' : 'none' },
      minzoom: 4,
      paint: { 'line-color': ['match', ['get', 'type'], 'storm', C.cyan, 'fog', C.secondary, 'front', C.cyan, C.green], 'line-width': 1, 'line-opacity': focus?.active ? 0.16 : 0.8 },
    });

    // Selected COA spatial plan: base → ingress → WEZ → release → egress → RTB.
    if (selectedCoa && !focus?.active) {
      let routeIndex = 0;
      for (const [missionId, ids] of Object.entries(selectedCoa.assignments)) {
        if (focus?.active && missionId !== focus.missionId) continue;
        const mission = missions.find((item) => item.id === missionId);
        if (!mission) continue;
        for (const aircraftId of ids) {
          const assignedAircraft = aircraft.find((item) => item.id === aircraftId);
          if (!assignedAircraft) continue;
          if (focus?.active && !revealedLayers.includes('route')) continue;
          const start: [number, number] = [assignedAircraft.position.lng, assignedAircraft.position.lat];
          const target: [number, number] = [mission.target.lng, mission.target.lat];
          const ingress: [number, number] = [start[0] + (target[0] - start[0]) * .55, start[1] + (target[1] - start[1]) * .55];
          const wez: [number, number] = [start[0] + (target[0] - start[0]) * .82, start[1] + (target[1] - start[1]) * .82];
          const egress: [number, number] = [start[0] + (target[0] - start[0]) * .42, start[1] + (target[1] - start[1]) * .42];
          const legs: Array<{ key: string; points: [number, number][]; color: string }> = [
            { key: 'ingress', points: [start, ingress], color: C.cyan }, { key: 'wez', points: [ingress, wez], color: C.amber },
            { key: 'release', points: [wez, target], color: C.red }, { key: 'egress', points: [target, egress], color: C.green }, { key: 'rtb', points: [egress, start], color: C.muted },
          ];
          for (const leg of legs) {
            if (focus?.active && ((leg.key === 'wez' && !revealedLayers.includes('wez')) || (leg.key === 'release' && !revealedLayers.includes('targets')) || (leg.key === 'egress' && !revealedLayers.includes('egress')) || leg.key === 'rtb')) continue;
            const id = `coa-route-${leg.key}-${routeIndex}`;
            map.addSource(id, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: leg.points } } });
            map.addLayer({ id, type: 'line', source: id, paint: { 'line-color': leg.color, 'line-width': 2.2, 'line-opacity': .82, 'line-dasharray': leg.key === 'rtb' ? [2, 2] : [1, 0] } });
          }
          const range = Math.max(50, assignedAircraft.fuel / 100 * 700);
          const fuelId = `fuel-range-${routeIndex}`;
          map.addSource(fuelId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circlePolygon(start, range)] } } });
          map.addLayer({ id: fuelId, type: 'line', source: fuelId, paint: { 'line-color': C.green, 'line-width': 1, 'line-opacity': .26, 'line-dasharray': [2, 2] } });
          routeIndex++;
        }
      }
    }

    setGeoJSONSource('missions-gl', { type: 'FeatureCollection', features: missions.map((item) => ({ type: 'Feature', properties: { id: item.id, label: item.name, priority: item.priority, risk: item.riskLevel, color: item.priority === 1 ? C.red : item.priority === 2 ? C.amber : C.muted }, geometry: { type: 'Point', coordinates: [item.target.lng, item.target.lat] } })) });
    setGeoJSONSource('assets-gl', { type: 'FeatureCollection', features: [
      ...(showGround ? GROUND_ASSETS.map((item) => ({ type: 'Feature' as const, properties: { id: item.id, family: 'ground', label: item.designation, type: item.type, status: item.status, color: C.green, opacity: !area || inArea([item.position]) ? 1 : .24, armament: item.armament, rangeKm: item.range_km }, geometry: { type: 'Point' as const, coordinates: [item.position.lng, item.position.lat] as [number, number] } })) : []),
      ...(showEnemy ? ENEMY_ASSETS.map((item) => ({ type: 'Feature' as const, properties: { id: item.id, family: 'enemy', label: item.designation, type: item.type, behaviour: item.behaviour, color: C.red, opacity: !area || inArea([item.position]) ? 1 : .24, rangeKm: item.engagementRange_km, probabilityKill: item.probabilityKill }, geometry: { type: 'Point' as const, coordinates: [item.position.lng, item.position.lat] as [number, number] } })) : []),
    ] });
    map.setLayoutProperty('ground-assets-symbols', 'visibility', 'visible');
    map.setLayoutProperty('enemy-assets-symbols', 'visibility', 'visible');
    map.setLayoutProperty('missions-gl-symbols', 'visibility', 'visible');
    applyFocusLayerFilters(focus);
      });
    }, 150);
    return () => { window.clearTimeout(debounce); if (frame) window.cancelAnimationFrame(frame); };
  });

  $effect(() => {
    const frame = getSimulationFrame();
    const focus = system.focusMode;
    const animationNeeded = system.activeScenarioFilter !== null || system.activeMissions.some((mission) => mission.phase !== 'COMPLETE' && mission.phase !== 'ABORTED');
    setSimulationAnimationActive(animationNeeded);
    if (!mapReady || !map) return;
    const aircraftSource = map.getSource('aircraft-gl') as maplibregl.GeoJSONSource | undefined;
    if (aircraftSource && Object.keys(frame.aircraft).length) aircraftSource.setData({ type: 'FeatureCollection', features: system.scenarioAircraft.map((aircraft) => { const track = frame.aircraft[aircraft.id]; const pos = track ?? aircraft.position; return { type: 'Feature' as const, properties: { id: aircraft.id, tailNumber: aircraft.tailNumber, status: aircraft.status, type: aircraft.type, fuel: aircraft.fuel, base: aircraft.base.toUpperCase(), heading: track?.heading ?? 0, scale: track?.scale ?? 1 }, geometry: { type: 'Point' as const, coordinates: [pos.lng, pos.lat] as [number, number] } }; }) });
    const trailSource = map.getSource('simulation-trails') as maplibregl.GeoJSONSource | undefined;
    const activeAssignmentIds = new Set(system.activeMissions.filter((mission) => !['COMPLETE', 'ABORTED'].includes(mission.phase)).flatMap((mission) => mission.aircraftIds));
    const simTrailFeatures = showTrails ? Object.entries(frame.aircraft).flatMap(([id, track]) => { const points = track.trail.slice(-7).reverse(); return points.slice(1).map((point, index) => ({ type: 'Feature' as const, properties: { id, opacity: (1 - index / 5) * (activeAssignmentIds.has(id) ? 1 : 0.18) }, geometry: { type: 'LineString' as const, coordinates: [points[index], point] } })); }) : [];
    const simTrailSignature = JSON.stringify(simTrailFeatures);
    if (simTrailSignature !== lastSimulationTrailFeatureSignature) {
      trailSource?.setData({ type: 'FeatureCollection', features: simTrailFeatures });
      lastSimulationTrailFeatureSignature = simTrailSignature;
    }
    const missileSource = map.getSource('simulation-missiles') as maplibregl.GeoJSONSource | undefined;
    const visibleMissiles = frame.missiles.filter((missile) => !focus?.active || missile.id.includes(focus.missionId ?? ''));
    missileSource?.setData({ type: 'FeatureCollection', features: visibleMissiles.flatMap((missile) => [{ type: 'Feature' as const, properties: { id: missile.id }, geometry: { type: 'LineString' as const, coordinates: missile.trail } }, { type: 'Feature' as const, properties: { id: missile.id }, geometry: { type: 'Point' as const, coordinates: missile.coordinates } }]) });
    const impactSource = map.getSource('simulation-impacts') as maplibregl.GeoJSONSource | undefined;
    const visibleImpacts = frame.impacts.filter((impact) => !focus?.active || impact.id === focus.missionId);
    impactSource?.setData({ type: 'FeatureCollection', features: visibleImpacts.map((impact) => ({ type: 'Feature' as const, properties: { progress: impact.progress }, geometry: { type: 'Polygon' as const, coordinates: [circlePolygon(impact.coordinates, Math.max(.05, impact.progress * 2))] } })) });
    const assetSource = map.getSource('assets-gl') as maplibregl.GeoJSONSource | undefined;
    if (assetSource && Object.keys(frame.assets).length) assetSource.setData({ type: 'FeatureCollection', features: [
      ...(showGround ? GROUND_ASSETS.map((asset) => { const pos = frame.assets[asset.id] ?? asset.position; return { type: 'Feature' as const, properties: { id: asset.id, family: 'ground', label: asset.designation, type: asset.type, status: asset.status, color: C.green, opacity: 1, armament: asset.armament, rangeKm: asset.range_km }, geometry: { type: 'Point' as const, coordinates: [pos.lng, pos.lat] as [number, number] } }; }) : []),
      ...(showEnemy ? ENEMY_ASSETS.map((asset) => ({ type: 'Feature' as const, properties: { id: asset.id, family: 'enemy', label: asset.designation, type: asset.type, behaviour: asset.behaviour, color: C.red, opacity: 1, rangeKm: asset.engagementRange_km, probabilityKill: asset.probabilityKill }, geometry: { type: 'Point' as const, coordinates: [asset.position.lng, asset.position.lat] as [number, number] } })) : []),
    ] });
    const flashSource = map.getSource('simulation-impact-flashes') as maplibregl.GeoJSONSource | undefined;
    flashSource?.setData({ type: 'FeatureCollection', features: visibleImpacts.filter((impact) => impact.flash).map((impact) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Point' as const, coordinates: impact.coordinates } })) });
    const radarSource = map.getSource('simulation-radar-sweep') as maplibregl.GeoJSONSource | undefined;
    radarSource?.setData({ type: 'FeatureCollection', features: GROUND_ASSETS.filter((asset) => (!focus?.active || focus.visibleGroundIds.includes(asset.id)) && (asset.type === 'sam' || asset.type === 'radar')).map((asset) => { const pos = frame.assets[asset.id] ?? asset.position; const angle = (frame.assets[asset.id]?.heading ?? 0) * Math.PI / 180; return { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [[pos.lng, pos.lat], [pos.lng + Math.cos(angle) * .11, pos.lat + Math.sin(angle) * .11]] } }; }) });
    const threatSource = map.getSource('simulation-threat-pulse') as maplibregl.GeoJSONSource | undefined;
    threatSource?.setData({ type: 'FeatureCollection', features: Object.entries(frame.threats).flatMap(([id, pulse]) => { const threat = system.scenarioThreats.find((item) => item.id === id); if (!threat) return []; const radius = threat.radius * (threat.probability > .7 ? 1 + pulse * .1 : 1); return [{ type: 'Feature' as const, properties: { id, radius: threat.radius, probability: threat.probability, confidence: threat.confidence, opacity: .3 + pulse * .65 }, geometry: { type: 'LineString' as const, coordinates: circlePolygon([threat.position.lng, threat.position.lat], radius) } }]; }) });
  });

  $effect(() => {
    const focus = system.focusMode;
    const focusSignature = focus?.active ? [focus.missionId, focus.visibleAircraftIds.join(','), focus.visibleThreatIds.join(','), focus.visibleTargetIds.join(','), focus.visibleGroundIds.join(','), focus.visibleEnemyIds.join(',')].join('|') : 'inactive';
    void focusSignature;
    if (!mapReady || !map) return;
    applyFocusLayerFilters(focus);
  });

  function toggleGround() {
    showGround = !showGround;
  }

  function toggleAirspace() { showAirspace = !showAirspace; }
  function toggleWeather() { showWeather = !showWeather; }
  function toggleEnemy() { showEnemy = !showEnemy; }

  function featureKind(feature: maplibregl.MapGeoJSONFeature | undefined): string {
    const source = feature?.source ?? '';
    if (source.includes('aircraft') || source === 'aircraft-gl') return 'aircraft';
    if (source.includes('base')) return 'base';
    if (source.includes('mission')) return 'mission';
    if (source.includes('threat')) return 'threat';
    if (source.includes('missile')) return 'missile';
    if (source.includes('enemy')) return 'enemy';
    if (source.includes('asset')) return 'ground';
    return 'map';
  }

  function showMapTooltip(event: maplibregl.MapMouseEvent) {
    if (!map || map.isMoving()) { mapTooltip = null; return; }
    const feature = map.queryRenderedFeatures(event.point).find((item) => featureKind(item) !== 'map');
    if (!feature) { mapTooltip = null; if (hoverTimer) clearTimeout(hoverTimer); return; }
    const kind = featureKind(feature);
    const p = feature.properties ?? {};
    const title = `${kind.toUpperCase()} · ${p.tailNumber ?? p.code ?? p.id ?? p.label ?? 'TRACK'}`;
    const state = kind === 'aircraft' ? `${p.status ?? 'UNKNOWN'} · FUEL ${p.fuel ?? '—'}% · BASE ${p.base ?? '—'}`
      : kind === 'threat' ? `RANGE ${p.radius ?? '—'}km · Pk ${p.probability ?? '—'}% · CONF ${p.confidence == null ? '—' : `${Number(p.confidence) >= 80 ? 'HIGH' : Number(p.confidence) >= 60 ? 'MEDIUM' : 'LOW'} ${p.confidence}%`}`
      : kind === 'base' ? `${p.aircraftCount ?? 'AIR'} aircraft · ${p.fmcCount ?? 'READINESS'} FMC`
      : `${p.status ?? p.type ?? p.label ?? 'OPERATIONAL TRACK'}`;
    if (hoverTimer) clearTimeout(hoverTimer);
    const x = event.point.x, y = event.point.y;
    hoverTimer = setTimeout(() => { if (map && !map.isMoving()) mapTooltip = { x, y, title, state }; }, 400);
  }

  function selectMapFeature(feature: maplibregl.MapGeoJSONFeature, point: maplibregl.LngLat) {
    if (!map) return;
    const kind = featureKind(feature), props = feature.properties ?? {}, id = String(props.id ?? props.tailNumber ?? props.code ?? '');
    const lines: string[] = [];
    if (kind === 'aircraft') {
      const aircraft = system.aircraft.find((item) => item.id === id || item.tailNumber === props.tailNumber);
      if (!aircraft) return;
      const active = system.activeMissions.find((item) => item.aircraftIds.includes(aircraft.id) && !['COMPLETE','ABORTED'].includes(item.phase));
      const planned = system.missions.find((mission) => system.coas.some((coa) => coa.assignments[mission.id]?.includes(aircraft.id)));
      const mission = active ?? planned;
      lines.push(`TYPE ${aircraft.type}`, `STATUS ${aircraft.status}`, `BASE ${aircraft.base}`, `WEAPONS ${aircraft.weapons.join(', ')}`, `FUEL ${aircraft.fuel}%`, `CREW REST ${aircraft.crewRest}H`, `MISSION ${mission?.missionName ?? mission?.name ?? 'UNASSIGNED'}`);
      if (mission) {
        const route = greatCircleCoordinates(aircraft.position, mission.target, 90);
        (map.getSource('interaction-route') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } }] });
        map.fitBounds([[aircraft.position.lng, aircraft.position.lat], [mission.target.lng, mission.target.lat]], { padding: 100, maxZoom: 7.6, duration: 900 });
      } else map.flyTo({ center: [aircraft.position.lng, aircraft.position.lat], zoom: Math.max(map.getZoom(), 6), duration: 700 });
      selectedMapCard = { kind, id: aircraft.id, title: aircraft.tailNumber, lines };
      if (dimTimer) clearTimeout(dimTimer);
      if (map.getLayer('aircraft-gl-symbols')) map.setPaintProperty('aircraft-gl-symbols', 'icon-opacity', ['case', ['==', ['get', 'id'], aircraft.id], 1, .3]);
      dimTimer = setTimeout(() => { if (map?.getLayer('aircraft-gl-symbols')) map.setPaintProperty('aircraft-gl-symbols', 'icon-opacity', ['interpolate', ['linear'], ['zoom'], 4, 0, 5, .7, 6, 1]); }, 3000);
    } else if (kind === 'mission') {
      const mission = system.missions.find((item) => item.id === id);
      if (!mission) return;
      const assigned = system.coas.find((item) => item.id === system.selectedCoaId)?.assignments[mission.id] ?? [];
      const routes = assigned.flatMap((aircraftId) => { const aircraft = system.aircraft.find((item) => item.id === aircraftId); return aircraft ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: greatCircleCoordinates(aircraft.position, mission.target, 90) } }] : []; });
      (map.getSource('interaction-route') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: routes });
      lines.push(`TARGET ${mission.targetType}`, `PRIORITY P${mission.priority}`, `STATUS ${mission.status}`, `ASSIGNED ${assigned.length} AIRCRAFT`, `RISK ${mission.riskLevel}%`);
      selectedMapCard = { kind, id: mission.id, title: mission.name, lines };
      map.flyTo({ center: [mission.target.lng, mission.target.lat], zoom: 6.5, duration: 900 });
    } else if (kind === 'missile') {
      const active = system.activeMissions.find((mission) => mission.phase === 'RELEASE');
      const weapon = active?.weaponId ? WEAPONS[active.weaponId] : null;
      if (active) {
        (map.getSource('interaction-route') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: greatCircleCoordinates(active.origins[active.aircraftIds[0]] ?? active.target, active.target, 90) } }] });
        (map.getSource('interaction-impact') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [active.target.lng, active.target.lat] } }] });
        map.flyTo({ center: [active.target.lng, active.target.lat], zoom: 6.8, duration: 700 });
      }
      const releaseElapsed = active ? Math.max(0, Date.now() - active.phaseStartTime) : 0;
      const impactSeconds = Math.max(0, Math.ceil((2000 - releaseElapsed) / 1000));
      lines.push(`TIME TO IMPACT 00:0${impactSeconds}`, `WEAPON ${weapon?.name ?? 'STANDOFF WEAPON'}`, `WARHEAD ${weapon?.warheadKg ?? '—'} KG`, `CEP ${weapon?.cepMeters ?? '—'} M`);
      selectedMapCard = { kind, id, title: 'WEAPON RELEASE', lines };
    } else {
      lines.push(...Object.entries(props).slice(0, 8).map(([key, value]) => `${key.toUpperCase()} ${String(value)}`));
      selectedMapCard = { kind, id, title: String(props.label ?? props.code ?? props.type ?? kind.toUpperCase()), lines };
      const coordinates = feature.geometry.type === 'Point' ? feature.geometry.coordinates : [point.lng, point.lat];
      map.flyTo({ center: [coordinates[0], coordinates[1]], zoom: 8, duration: 800 });
    }
    if (feature.geometry.type === 'Point') map.flyTo({ center: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]], zoom: 8, duration: 800 });
    else map.flyTo({ center: [point.lng, point.lat], zoom: 8, duration: 800 });
    window.dispatchEvent(new CustomEvent('aircommand:entity-detail', { detail: { type: kind, id } }));
    mapTooltip = null;
  }

  function handleMapContextAction(action: string) {
    if (!mapContext) return;
    const { kind, id } = mapContext;
    const aircraft = system.aircraft.find((item) => item.id === id || item.tailNumber === id);
    if (action === 'loadout' && aircraft) onLoadoutClick?.(aircraft.type, aircraft.tailNumber);
    else if (action === 'roster' && kind === 'base') onBaseSelect?.(id);
    else if (action === 'briefing') window.dispatchEvent(new CustomEvent('aircommand:mission-brief', { detail: id }));
    else if (action === 'missions' || action === 'assign') window.dispatchEvent(new CustomEvent('aircommand:map-open-panel', { detail: action === 'assign' ? 'roster' : 'missions' }));
    else if (action === 'execute') { const mission = system.missions.find((item) => item.id === id); if (mission) window.dispatchEvent(new CustomEvent('aircommand:mission-brief', { detail: mission.id })); }
    else if (action === 'rings' || action === 'cone') showThreats = true;
    if (action === 'details' || action === 'trajectory' || action === 'impact' || action === 'track' || action === 'specs' || action === 'aircraft') {
      const feature = map?.queryRenderedFeatures().find((item) => String(item.properties?.id ?? item.properties?.tailNumber ?? item.properties?.code) === id);
      if (feature && map) selectMapFeature(feature, map.getCenter());
    }
  }
</script>

<div class="map-wrap" data-tour="map">
  <div class="map-canvas" class:impact-shake={getSimulationFrame().impacts.some((impact) => impact.flash)} bind:this={container}></div>
  {#if !system.focusMode?.active && mapZoom < 5 && overviewFmcCount > 0}<div class="theater-aircraft-count" title={`${overviewFmcCount} FMC aircraft in this theater view`}>{overviewFmcCount}</div>{/if}
  {#each narrativeMarkers as marker, index (`${marker.label}-${index}`)}<div class="narrative-focus-marker" role="img" aria-label={`Map focus: ${marker.label}`} style={`left:${marker.x}px;top:${marker.y}px;opacity:${marker.opacity}`}><span aria-hidden="true">{marker.label}</span></div>{/each}
  {#if mapReady && map}<TrajectoryLayer {map} />{/if}
  {#if mapReady && map}<MapNarrativePointer {map} />{/if}
  {#if theaterMapVisible && !system.focusMode?.active}<TacticalReadout />{/if}

  <!-- LAYER 3: Scanline & Vignette Overlay -->
  <div class="scanlines" aria-hidden="true"></div>
  <div class="vignette" aria-hidden="true"></div>

  {#if system.mode === 'DEGRADED'}
    <div class="degraded mono">EDGE MODE ACTIVE · DEGRADED SENSOR FUSION</div>
  {/if}

  <div class="reticle" aria-hidden="true">
    <div class="cross-h"></div>
    <div class="cross-v"></div>
    <div class="cross-dot"></div>
  </div>

  <div class="coord tl mono">THEATER MAP · {mapCenterLabel}</div>
  <button class="theater-toggle" class:picture-hidden={!theaterMapVisible} aria-label={theaterMapVisible ? 'Hide tactical picture overlay' : 'Show tactical picture overlay'} title="Toggle tactical picture overlay" onclick={() => onToggleTheaterVisibility?.()}>{theaterMapVisible ? '◧' : '◱'}</button>
  <div class="coord tr mono">ZOOM {mapZoom.toFixed(1)} · MERCATOR</div>
  <div class="trail-controls"><button aria-pressed={showTrails} onclick={toggleTrails}>◈ TRAILS {showTrails ? 'ON' : 'OFF'}</button><button onclick={clearTrails}>× CLEAR TRAILS</button></div>
  <button class="fullscreen-btn" aria-label={fullscreen ? 'Exit map fullscreen' : 'Enter map fullscreen'} title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen map'} onclick={() => onFullscreenClick?.()}>{fullscreen ? '⛶ EXIT FULLSCREEN' : '⛶ FULLSCREEN'}</button>
  <TerrainToggle />
  {#if mapTooltip}<aside class="map-hover-tooltip" style={`left:${Math.min(mapTooltip.x + 12, 600)}px;top:${Math.max(40, mapTooltip.y + 12)}px`}><b>{mapTooltip.title}</b><span>{mapTooltip.state}</span><small>[CLICK FOR DETAIL]</small></aside>{/if}
  {#if selectedMapCard}<aside class="map-selection-card"><header><span>{selectedMapCard.kind.toUpperCase()} · {selectedMapCard.title}</span><button aria-label="Dismiss map detail card" onclick={() => selectedMapCard = null}>×</button></header>{#each selectedMapCard.lines as line}<p>{line}</p>{/each}</aside>{/if}
  <MapContextMenu open={mapContext !== null} x={mapContext?.x ?? 0} y={mapContext?.y ?? 0} kind={mapContext?.kind ?? 'map'} title={mapContext?.title ?? 'MAP ITEM'} onAction={handleMapContextAction} onClose={() => mapContext = null} />
  <div class="coord bl mono">SCALE · WGS84</div>
  <div class="coord br mono">WGS84 · EGM96</div>
  {#if diagramExplanation}<aside class="diagram-explanation" aria-live="polite"><span>TACTICAL PICTURE · DIAGRAM CONTEXT</span><p>{diagramExplanation}</p></aside>{/if}
  <div class="bearing north mono" aria-hidden="true">N · 000°</div>
  <div class="bearing east mono" aria-hidden="true">E · 090°</div>
  <div class="bearing south mono" aria-hidden="true">S · 180°</div>
  <div class="bearing west mono" aria-hidden="true">W · 270°</div>

</div>

<style>
  .map-wrap {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--bg-base);
  }
  .theater-toggle.picture-hidden { color:var(--text-muted); border-color:var(--border-subtle); }
  .map-hover-tooltip,.map-selection-card { position:absolute; z-index:14; pointer-events:auto; padding:8px 10px; border:1px solid var(--accent-cyan); background:rgba(5,8,15,.96); box-shadow:0 4px 14px rgba(0,0,0,.5); font-family:var(--font-mono); }
  .map-hover-tooltip { max-width:200px; display:flex; flex-direction:column; gap:4px; }
  .map-hover-tooltip b,.map-selection-card header { color:var(--accent-cyan); font-size:8px; letter-spacing:.08em; }
  .map-hover-tooltip span,.map-hover-tooltip small { color:var(--text-secondary); font-size:7px; }
  .map-hover-tooltip small { color:var(--text-muted); }
  .map-selection-card { top:42px; left:12px; width:min(250px,40vw); max-height:42%; overflow:auto; }
  .map-selection-card header { display:flex; justify-content:space-between; gap:8px; border-bottom:1px solid var(--border-subtle); padding-bottom:5px; }
  .map-selection-card header button { border:0; color:var(--accent-cyan); background:transparent; cursor:pointer; }
  .map-selection-card p { margin:5px 0; color:var(--text-secondary); font:8px var(--font-mono); }
  .map-canvas {
    position: absolute;
    inset: 0;
  }
  .theater-aircraft-count { position:absolute; z-index:7; top:50%; left:50%; transform:translate(-50%,-50%); width:50px; height:50px; display:grid; place-items:center; border:2px solid var(--accent-cyan); border-radius:50%; background:rgba(5,24,34,.94); box-shadow:0 0 16px color-mix(in srgb,var(--accent-cyan) 40%,transparent); color:var(--text-primary); font:700 15px var(--font-mono); pointer-events:none; }
  .narrative-focus-marker { position:absolute; z-index:8; width:80px; height:80px; transform:translate(-50%,-50%); border:2px dashed var(--accent-cyan); border-radius:50%; box-shadow:0 0 14px color-mix(in srgb,var(--accent-cyan) 35%,transparent); pointer-events:none; transition:opacity .45s ease; }
  .narrative-focus-marker span { position:absolute; left:50%; top:-18px; transform:translateX(-50%); padding:2px 4px; background:var(--bg-base); color:var(--accent-cyan); font:8px var(--font-mono); white-space:nowrap; text-shadow:0 0 4px var(--bg-base); }

  :global(.maplibregl-canvas) { filter: invert(1) hue-rotate(180deg) brightness(.66) saturate(.38) contrast(.96); }
  .map-canvas.impact-shake :global(.maplibregl-canvas-container) { animation: impact-shake .2s ease-out; }
  @keyframes impact-shake { 25% { transform:translate(2px,-1px); } 50% { transform:translate(-2px,1px); } 75% { transform:translate(1px,2px); } }

  /* LAYER 3: Scanlines and Vignette */
  .scanlines {
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      0deg,
      color-mix(in srgb, var(--accent-cyan) 2%, transparent) 0px,
      color-mix(in srgb, var(--accent-cyan) 2%, transparent) 1px,
      transparent 1px,
      transparent 3px
    );
    mix-blend-mode: overlay;
    pointer-events: none;
    z-index: 4;
  }

  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, transparent 40%, rgba(5, 8, 15, 0.6) 100%);
    pointer-events: none;
    z-index: 4;
  }

  .reticle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    pointer-events: none;
    opacity: 0.35;
    z-index: 5;
  }
  .cross-h {
    position: absolute;
    top: 50%;
    left: 0;
    width: 100%;
    height: 1px;
    background: var(--accent-cyan);
  }
  .cross-v {
    position: absolute;
    left: 50%;
    top: 0;
    height: 100%;
    width: 1px;
    background: var(--accent-cyan);
  }
  .cross-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent-cyan);
    box-shadow: 0 0 10px var(--accent-cyan);
  }

  .coord {
    position: absolute;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    color: var(--accent-cyan);
    opacity: 0.65;
    pointer-events: none;
    text-shadow: 0 0 4px color-mix(in srgb, var(--accent-cyan) 70%, transparent);
    z-index: 5;
  }
  .coord.tl { top: 8px; left: 10px; }
  .coord.tr { top: 8px; right: 10px; }
  .coord.bl { bottom: 8px; left: 10px; }
  .coord.br { bottom: 8px; right: 10px; }
  .bearing { position:absolute; z-index:5; color:var(--text-muted); font:7px var(--font-mono); opacity:.65; pointer-events:none; }
  .bearing.north { top:34px; left:50%; transform:translateX(-50%); }.bearing.south { bottom:34px; left:50%; transform:translateX(-50%); }
  .bearing.east { right:10px; top:50%; transform:translateY(-50%); writing-mode:vertical-rl; }.bearing.west { left:10px; top:50%; transform:translateY(-50%); writing-mode:vertical-rl; }
  .trail-controls { position:absolute; z-index:7; top:56px; right:10px; display:flex; gap:4px; }.trail-controls button { padding:5px 7px; color:var(--text-secondary); background:rgba(5,8,15,.9); border:1px solid var(--border-strong); font:7px var(--font-mono); cursor:pointer; }.trail-controls button[aria-pressed="true"] { color:var(--accent-cyan); border-color:var(--accent-cyan); }
  .fullscreen-btn { position:absolute; top:28px; right:10px; z-index:7; padding:6px 9px; background:rgba(5,8,15,.9); border:1px solid var(--border-strong); color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.12em; cursor:pointer; transition:background .18s,border-color .18s; }
  .theater-toggle { position:absolute; top:25px; left:10px; z-index:7; padding:4px 7px; background:rgba(5,8,15,.9); border:1px solid var(--border-strong); color:var(--accent-cyan); font:10px var(--font-mono); cursor:pointer; }
  .fullscreen-btn:hover,.fullscreen-btn:focus-visible { border-color:var(--accent-cyan); background:color-mix(in srgb, var(--accent-cyan) 10%, transparent); outline:none; }
  .diagram-explanation { position:absolute; z-index:8; left:50%; bottom:34px; transform:translateX(-50%); width:min(520px,calc(100% - 32px)); padding:11px 14px; background:rgba(5,8,15,.94); border:1px solid var(--accent-cyan); border-left:3px solid var(--accent-cyan); box-shadow:0 8px 30px rgba(0,0,0,.55); pointer-events:none; }
  .diagram-explanation span { color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.16em; }
  .diagram-explanation p { margin:5px 0 0; color:var(--text-primary); font:12px/1.45 var(--font-mono); }
  :global(.aircraft-count-cluster) { display:grid; place-items:center; width:44px; height:44px; border:2px solid var(--accent-cyan); border-radius:50%; color:var(--text-primary); background:rgba(5,24,34,.96); box-shadow:0 0 0 5px color-mix(in srgb, var(--accent-cyan) 12%, transparent),0 0 18px color-mix(in srgb, var(--accent-cyan) 35%, transparent); font:700 15px var(--font-mono); cursor:pointer; transition:transform .15s,box-shadow .15s; }
  :global(.aircraft-count-cluster:hover) { transform:scale(1.08); box-shadow:0 0 0 7px color-mix(in srgb, var(--accent-cyan) 17%, transparent),0 0 22px color-mix(in srgb, var(--accent-cyan) 50%, transparent); }

  .degraded {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 16px;
    background: color-mix(in srgb, var(--accent-red) 15%, transparent);
    border: 1px solid var(--accent-red);
    color: var(--accent-red);
    font-size: 10px;
    letter-spacing: 0.18em;
    animation: pulse 1.2s ease-in-out infinite;
    z-index: 6;
  }
  .mono { font-family: var(--font-mono); }
  :global(.mil-symbol) { position: relative; display: grid; place-items: center; width: max-content; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent-cyan) 35%, transparent)); }
  :global(.mil-symbol svg) { display: block; max-width: 36px; max-height: 36px; }
  :global(.mil-symbol-hostileAir), :global(.mil-symbol-hostileGround) { filter: drop-shadow(0 0 4px color-mix(in srgb, var(--accent-red) 45%, transparent)); }
  :global(.aircraft-status-glyph) { position: absolute; right: -4px; bottom: -4px; min-width: 12px; height: 12px; display: grid; place-items: center; border: 1px solid currentColor; background: var(--bg-base); font: 9px/1 var(--font-mono); }
  :global(.aircraft-status-fmc) { color: var(--accent-green); }
  :global(.aircraft-status-pmc) { color: var(--accent-amber); }
  :global(.aircraft-status-nmc) { color: var(--accent-red); }
  :global(.ground-status-glyph) { position:absolute; right:-3px; bottom:-3px; min-width:11px; height:11px; display:grid; place-items:center; border:1px solid currentColor; background:var(--bg-base); font:8px/1 var(--font-mono); }
  :global(.status-active) { color:var(--accent-green); }:global(.status-standby) { color:var(--accent-amber); }:global(.status-offline) { color:var(--accent-red); }
  :global(.matrix-highlight-marker) { transform:scale(1.35); filter:drop-shadow(0 0 9px var(--accent-cyan)); z-index:10; }

  :global(.maplibregl-popup) {
    z-index: 20 !important;
  }
  :global(.maplibregl-popup-content) {
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  :global(.maplibregl-popup-tip) { display: none !important; }
  :global(.maplibregl-ctrl-group) {
    background: var(--bg-panel) !important;
    border: 1px solid var(--border-strong) !important;
    border-radius: 0 !important;
  }
  :global(.maplibregl-ctrl-group button) {
    background: transparent !important;
    border-bottom: 1px solid var(--border-strong) !important;
  }
  :global(.maplibregl-ctrl-group button span) { filter: invert(1) hue-rotate(180deg); }
  :global(.maplibregl-ctrl-scale) {
    background: rgba(5, 8, 15, 0.9) !important;
    border-color: var(--border-strong) !important;
    color: var(--accent-cyan) !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 9px !important;
    letter-spacing: 0.1em !important;
  }

  /* LAYER 6: BASE MARKERS (Hexagon + Radar Sweep) */
  :global(.base-marker-wrap) {
    position: relative;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  :global(.base-marker-wrap.selected) {
    animation: baseSelectedPulse 1.2s infinite ease-in-out;
  }
  @keyframes baseSelectedPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.5); }
  }

  :global(.base-marker-wrap .hex-outer) {
    width: 14px;
    height: 14px;
    background: color-mix(in srgb, var(--accent-cyan) 20%, transparent);
    clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
    border: 1px solid var(--accent-cyan);
    box-shadow: 0 0 8px var(--accent-cyan);
    display: grid;
    place-items: center;
    transition: all 0.15s;
  }
  :global(.base-marker-wrap:hover .hex-outer) {
    box-shadow: 0 0 14px var(--accent-cyan);
    background: color-mix(in srgb, var(--accent-cyan) 40%, transparent);
  }
  :global(.base-marker-wrap .hex-inner) {
    width: 8px;
    height: 8px;
    clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
    border: 0.5px solid color-mix(in srgb, var(--accent-cyan) 80%, transparent);
    background: var(--accent-cyan);
  }

  :global(.base-marker-wrap .radar-sweep) {
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border-top: 1px solid var(--accent-cyan);
    pointer-events: none;
    animation: radarSweep 3s linear infinite;
    opacity: 0.6;
  }
  @keyframes radarSweep {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* LAYER 7: MISSION MARKERS */
  :global(.mission-marker-wrap) {
    position: relative;
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  :global(.mission-outer) {
    position: absolute;
    inset: 2px;
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  :global(.mission-inner) {
    position: absolute;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    opacity: 0.7;
  }
  :global(.mission-dot) {
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
  }

  :global(.mission-pulse) {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    border: 1px solid;
    animation: missionPulseRing 2.2s infinite ease-out;
    pointer-events: none;
  }
  @keyframes missionPulseRing {
    0% { transform: scale(0.6); opacity: 0.9; }
    100% { transform: scale(1.6); opacity: 0; }
  }
</style>

