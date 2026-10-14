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
  import { experienceBounds } from '../../data/scenarioBounds';
  import TacticalReadout from './TacticalReadout.svelte';

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
  let lastAircraftPositionKey = '';
  const deriveTrailPaths = createTrailPathDeriver();

  $effect(() => {
    const aircraft = system.aircraft;
    const key = JSON.stringify(aircraft.map((ac) => [ac.id, ac.position.lng, ac.position.lat]));
    if (key === lastAircraftPositionKey) return;
    lastAircraftPositionKey = key;
    const next = { ...untrack(() => trailHistory) };
    for (const ac of aircraft) {
      const points = [...(next[ac.id] ?? [])];
      const position: [number, number] = [ac.position.lng, ac.position.lat];
      const last = points[points.length - 1];
      if (!last || last[0] !== position[0] || last[1] !== position[1]) points.push(position);
      if (points.length > 14) points.splice(0, points.length - 14);
      next[ac.id] = points;
    }
    trailHistory = next;
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
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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
    }
    if (!map.getSource('aircraft-gl')) map.addSource('aircraft-gl', {
      type: 'geojson', data: { type: 'FeatureCollection', features: [] }, cluster: true, clusterMaxZoom: 6, clusterRadius: 50,
      clusterProperties: { fmc: ['+', ['case', ['==', ['get', 'status'], 'FMC'], 1, 0]] },
    });
    if (!map.getLayer('aircraft-clusters')) map.addLayer({
      id: 'aircraft-clusters', type: 'circle', source: 'aircraft-gl', maxzoom: 6, filter: ['has', 'point_count'],
      paint: { 'circle-color': C.cyan, 'circle-stroke-color': C.cyan, 'circle-stroke-width': 1, 'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 10, 50, 20, 200, 30], 'circle-opacity': 0.35 },
    });
    if (!map.getLayer('aircraft-cluster-count')) map.addLayer({
      id: 'aircraft-cluster-count', type: 'symbol', source: 'aircraft-gl', maxzoom: 6, filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count'], 'text-font': ['Open Sans Bold'], 'text-size': 13, 'text-allow-overlap': true },
      paint: { 'text-color': C.text, 'text-halo-color': C.base, 'text-halo-width': 1.6 },
    });
    if (!map.getLayer('aircraft-gl-symbols')) map.addLayer({
      id: 'aircraft-gl-symbols', type: 'symbol', source: 'aircraft-gl', minzoom: 4, filter: ['!', ['has', 'point_count']],
      layout: { 'icon-image': ['match', ['get', 'status'], 'FMC', 'aircraft-FMC', 'PMC', 'aircraft-PMC', 'aircraft-NMC'], 'icon-size': ['interpolate', ['linear'], ['zoom'], 4, 0.3, 7, 0.6, 10, 1, 13, 1.3], 'icon-allow-overlap': true, 'icon-ignore-placement': true, 'text-field': ['get', 'tailNumber'], 'text-font': ['Open Sans Regular'], 'text-size': 10, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-optional': true, 'text-allow-overlap': true, 'text-ignore-placement': true },
      paint: { 'icon-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0, 5, 0.7, 6, 1], 'text-color': C.cyan, 'text-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0, 5, 0.7, 6, 1], 'text-halo-color': C.base, 'text-halo-width': 1.5 },
    });
    if (!map.getLayer('aircraft-gl-labels')) map.addLayer({
      id: 'aircraft-gl-labels', type: 'symbol', source: 'aircraft-gl', minzoom: 5, filter: ['!', ['has', 'point_count']],
      layout: { 'text-field': ['get', 'tailNumber'], 'text-font': ['Open Sans Bold'], 'text-size': 10, 'text-offset': [0, 1.7], 'text-anchor': 'top', 'text-allow-overlap': true, 'text-ignore-placement': true },
      paint: { 'text-color': C.cyan, 'text-halo-color': C.base, 'text-halo-width': 2 },
    });
    if (!aircraftLayerClickAttached) {
      map.on('click', 'aircraft-gl-symbols', (event) => {
        const feature = event.features?.[0];
        const props = feature?.properties;
        if (!props || !event.lngLat) return;
        new maplibregl.Popup({ offset: 14, closeButton: false }).setLngLat(event.lngLat).setHTML(`<div style="font:10px 'JetBrains Mono',monospace;color:${C.text};background:${C.base};border:1px solid ${C.border};padding:9px 12px"><b style="color:${C.cyan}">${props.tailNumber}</b><br>${props.type} · ${props.status}<br>FUEL ${props.fuel}% · BASE ${props.base}</div>`).addTo(map!);
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
    if (!map.getLayer('bases-gl-symbols')) map.addLayer({ id: 'bases-gl-symbols', type: 'circle', source: 'bases-gl', minzoom: 3.5, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 8, 7], 'circle-color': C.cyan, 'circle-stroke-color': C.base, 'circle-stroke-width': 1.5 } });
    if (!map.getLayer('bases-gl-labels')) map.addLayer({ id: 'bases-gl-labels', type: 'symbol', source: 'bases-gl', minzoom: 5, layout: { 'text-field': ['get', 'code'], 'text-font': ['Open Sans Bold'], 'text-size': 9, 'text-offset': [0, 1.2], 'text-allow-overlap': true }, paint: { 'text-color': C.cyan, 'text-halo-color': C.base, 'text-halo-width': 1.5 } });
    if (!map.getLayer('missions-gl-symbols')) map.addLayer({ id: 'missions-gl-symbols', type: 'circle', source: 'missions-gl', minzoom: 4, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 4, 9, 8], 'circle-color': ['match', ['get', 'priority'], 1, C.red, 2, C.amber, C.muted], 'circle-stroke-color': C.base, 'circle-stroke-width': 1.5 } });
    if (!map.getLayer('missions-gl-labels')) map.addLayer({ id: 'missions-gl-labels', type: 'symbol', source: 'missions-gl', minzoom: 5, layout: { 'text-field': ['get', 'label'], 'text-font': ['Open Sans Bold'], 'text-size': 9, 'text-offset': [0, 1.3], 'text-allow-overlap': true }, paint: { 'text-color': C.amber, 'text-halo-color': C.base, 'text-halo-width': 1.5 } });
    if (!map.getLayer('assets-gl-symbols')) map.addLayer({ id: 'assets-gl-symbols', type: 'circle', source: 'assets-gl', minzoom: 4, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 3, 8, 6], 'circle-color': ['get', 'color'], 'circle-stroke-color': C.base, 'circle-stroke-width': 1.3, 'circle-opacity': ['get', 'opacity'] } });
    if (!map.getLayer('assets-gl-labels')) map.addLayer({ id: 'assets-gl-labels', type: 'symbol', source: 'assets-gl', minzoom: 6, layout: { 'text-field': ['get', 'label'], 'text-font': ['Open Sans Regular'], 'text-size': 8, 'text-offset': [0, 1.2], 'text-allow-overlap': true }, paint: { 'text-color': ['get', 'color'], 'text-halo-color': C.base, 'text-halo-width': 1.3 } });
    for (const layerId of ['bases-gl-symbols', 'missions-gl-symbols', 'assets-gl-symbols']) {
      map.on('mouseenter', layerId, () => { if (map) map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', layerId, () => { if (map) map.getCanvas().style.cursor = ''; });
      map.on('click', layerId, (event) => {
        const feature = event.features?.[0];
        if (!feature || !event.lngLat || !map) return;
        const props = feature.properties ?? {};
        if (feature.source === 'bases-gl') onBaseSelect?.(String(props.id));
        const heading = String(props.label ?? props.code ?? 'OPERATIONAL TRACK');
        const details = Object.entries(props).filter(([key]) => !['label', 'code', 'color', 'opacity'].includes(key)).map(([key, value]) => `${key.toUpperCase()}: ${String(value)}`).join('<br>');
        new maplibregl.Popup({ offset: 12, closeButton: false }).setLngLat(event.lngLat).setHTML(`<div style="font:9px 'JetBrains Mono',monospace;color:${C.text};background:${C.base};border:1px solid ${C.border};padding:9px 12px"><b style="color:${String(props.color ?? C.cyan)}">${heading}</b><br>${details}</div>`).addTo(map);
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

  onMount(() => {
    const applyFocusLock = (locked: boolean) => {
      mapFocusLocked = locked;
      if (!map) return;
      if (locked) { map.dragPan.disable(); map.scrollZoom.disable(); map.doubleClickZoom.disable(); map.keyboard.disable(); }
      else { map.dragPan.enable(); map.scrollZoom.enable(); map.doubleClickZoom.enable(); map.keyboard.enable(); }
    };
    const handleFocusLock = (event: Event) => applyFocusLock(Boolean((event as CustomEvent<boolean>).detail));
    const refocus = () => map?.fitBounds(experienceBounds(system.activeScenarioFilter ?? 'deep_strike'), { padding: 80, duration: 1200 });
    const handleExperienceMode = (event: Event) => {
      const { mode, scenario } = (event as CustomEvent<{ mode: string | null; scenario: string | null }>).detail;
      if (mode) {
        const key = scenario ?? (mode === 'training' ? 'deep_strike' : null);
        map?.fitBounds(experienceBounds(key), { padding: 80, duration: 1200 });
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
    window.addEventListener('aircommand:diagram-focus', onDiagramFocus);
    map.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    map.on('movestart', () => {
      if (terrainResumeTimer) clearTimeout(terrainResumeTimer);
      if (map && terrain3dEnabled && terrainPaused) { map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 }); terrainPaused = false; }
    });
    map.on('moveend', () => {
      if (map) {
        const center = map.getCenter();
        mapCenterLabel = `${Math.abs(center.lat).toFixed(1)}°${center.lat >= 0 ? 'N' : 'S'} / ${Math.abs(center.lng).toFixed(1)}°${center.lng >= 0 ? 'E' : 'W'}`;
      }
      if (map && terrain3dEnabled) {
        map.setTerrain(null); terrainPaused = true;
        if (terrainResumeTimer) clearTimeout(terrainResumeTimer);
        terrainResumeTimer = setTimeout(() => {
          if (map && terrain3dEnabled) { map.setTerrain({ source: 'terrain-dem', exaggeration: 1.5 }); terrainPaused = false; }
        }, 200);
      }
    });
    map.on('zoom', () => {
      if (!map) return;
      const zoom = map.getZoom();
      mapZoom = zoom;
      const center = map.getCenter();
      mapCenterLabel = `${Math.abs(center.lat).toFixed(1)}°${center.lat >= 0 ? 'N' : 'S'} / ${Math.abs(center.lng).toFixed(1)}°${center.lng >= 0 ? 'E' : 'W'}`;
      const hillshadeVisibility = showTerrain && zoom >= 8 ? 'visible' : 'none';
      if (map.getLayer('hillshade-base')) map.setLayoutProperty('hillshade-base', 'visibility', hillshadeVisibility);
      if (map.getLayer('hillshade-detail')) map.setLayoutProperty('hillshade-detail', 'visibility', hillshadeVisibility);
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      const m = map!;
      ensureOperationalPointLayers();
      m.addSource('scenario-area', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'scenario-area-fill', type: 'fill', source: 'scenario-area', paint: { 'fill-color': C.cyan, 'fill-opacity': 0.035 } });
      m.addLayer({ id: 'scenario-area-outline', type: 'line', source: 'scenario-area', paint: { 'line-color': C.cyan, 'line-width': 1.6, 'line-opacity': 0.78, 'line-dasharray': [1.2, 1.6] } });
      m.addSource('diagram-focus-area', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'diagram-focus-outline', type: 'line', source: 'diagram-focus-area', paint: { 'line-color': C.cyan, 'line-width': 3, 'line-opacity': 0.95, 'line-dasharray': [1, 1.5] } });
      const hillshadeVisibility = showTerrain && m.getZoom() >= 8 ? 'visible' : 'none';
      m.setLayoutProperty('hillshade-base', 'visibility', hillshadeVisibility);
      m.setLayoutProperty('hillshade-detail', 'visibility', hillshadeVisibility);
      m.addSource('matrix-highlight', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'matrix-highlight-fuel', type: 'line', source: 'matrix-highlight', filter: ['==', ['get', 'kind'], 'fuel'], paint: { 'line-color': C.green, 'line-width': 1.5, 'line-dasharray': [2, 2], 'line-opacity': .85 } });
      m.addLayer({ id: 'matrix-highlight-wez', type: 'line', source: 'matrix-highlight', filter: ['==', ['get', 'kind'], 'wez'], paint: { 'line-color': C.red, 'line-width': 1.5, 'line-dasharray': [1, 2], 'line-opacity': .95 } });
      m.addLayer({ id: 'matrix-highlight-route', type: 'line', source: 'matrix-highlight', filter: ['==', ['get', 'kind'], 'route'], paint: { 'line-color': C.cyan, 'line-width': 2.5, 'line-opacity': .95 } });
      m.fire('zoom');
      mapReady = true;
    });

    return () => {
      window.removeEventListener('aircommand:diagram-focus', onDiagramFocus);
      window.removeEventListener('aircommand:focus-lock', handleFocusLock);
      window.removeEventListener('aircommand:refocus', refocus);
      window.removeEventListener('aircommand:experience-mode', handleExperienceMode);
      if (diagramExplanationTimer) clearTimeout(diagramExplanationTimer);
      window.removeEventListener('aircommand:map-layer', handleLayerToggle);
      window.removeEventListener('aircommand:terrain-3d', handleTerrain3d);
      window.removeEventListener('aircommand:matrix-highlight', handleMatrixHighlight);
      delete (window as any).__airCommandLoadout;
      if (terrainResumeTimer) clearTimeout(terrainResumeTimer);
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

  function toggleGrid() {
    showGrid = !showGrid;
    if (!map) return;
    const vis = showGrid ? 'visible' : 'none';
    if (map.getLayer('grid-lines')) map.setLayoutProperty('grid-lines', 'visibility', vis);
  }

  function toggleTrails() {
    showTrails = !showTrails;
    if (!map) return;
    const vis = showTrails ? 'visible' : 'none';
    for (let i = 0; i < 40; i++) {
      if (map.getLayer(`trail-line-${i}`)) map.setLayoutProperty(`trail-line-${i}`, 'visibility', vis);
      if (map.getLayer(`trail-head-${i}`)) map.setLayoutProperty(`trail-head-${i}`, 'visibility', vis);
    }
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
      'threat-center-dot',
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
    const aircraft = system.scenarioAircraft;
    const missions = system.scenarioMissions;
    const threats = system.scenarioThreats;
    const area = scenarioKey ? (SCENARIO_AREAS[scenarioKey] ?? experienceBounds(scenarioKey)) : null;
    const inArea = (points: { lng: number; lat: number }[]) => !area || points.some((p) => p.lng >= area[0][0] && p.lng <= area[1][0] && p.lat >= area[0][1] && p.lat <= area[1][1]);
    const airspace = scenarioKey ? system.airspaceZones.filter((zone) => inArea(zone.polygon)) : system.airspaceZones;
    const weather = scenarioKey ? system.weatherSystems.filter((item) => inArea(item.polygon)) : system.weatherSystems;
    const trailSnapshot = trails;
    const spoofedTrackId = system.spoofedTrackId;
    if (scenarioKey !== lastScenarioView) {
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
    const selectedCoa = system.coas.find((coa) => coa.id === system.selectedCoaId) ?? null;
    const selBase = system.selectedBaseId;
    // Capture layer toggles as dependencies so their latest values drive the batched render.
    const layerState = [showTerrain, showGrid, showTrails, showThreats, showGround, showAirspace, showWeather, showEnemy];
    void layerState;
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
    const baseSource = map.getSource('bases-gl') as maplibregl.GeoJSONSource;
    baseSource.setData({ type: 'FeatureCollection', features: IAF_BASES.map((base) => ({ type: 'Feature', properties: { id: base.id, code: base.code, label: base.name, elevation: base.elevation, selected: base.id === selBase }, geometry: { type: 'Point', coordinates: [base.lng, base.lat] } })) });

    // Clean previous trail layers
    for (let i = 0; i < 40; i++) {
      if (map.getLayer(`trail-line-${i}`)) map.removeLayer(`trail-line-${i}`);
      if (map.getLayer(`trail-head-${i}`)) map.removeLayer(`trail-head-${i}`);
      if (map.getSource(`trail-${i}`)) map.removeSource(`trail-${i}`);
      if (map.getSource(`trail-head-src-${i}`)) map.removeSource(`trail-head-src-${i}`);
    }

    // Clean previous threat layers & source
    const threatLayers = [
      'threat-fill-outer',
      'threat-fill-mid',
      'threat-fill-inner',
      'threat-outline-outer',
      'threat-center-dot',
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

    // Add upgraded aircraft trails (Layer 5)
    aircraft.forEach((ac, i) => {
      if (ac.status === 'NMC') return; // Hidden for NMC
      const pts = trailSnapshot[ac.id] ?? [];
      if (pts.length < 2) return;

      const isFmc = ac.status === 'FMC';
      const color = isFmc ? C.green : C.amber;
      const opacity = isFmc ? 0.75 : 0.4;
      const width = isFmc ? 2 : 1.5;

      map!.addSource(`trail-${i}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: pts },
        },
      });

      map!.addLayer({
        id: `trail-line-${i}`,
        type: 'line',
        source: `trail-${i}`,
        layout: { visibility: showTrails ? 'visible' : 'none' },
        paint: {
          'line-color': color,
          'line-width': width,
          'line-opacity': opacity,
          'line-blur': 0.8,
        },
      });

      // Trail pulse at current head position
      const headPos = pts[pts.length - 1];
      map!.addSource(`trail-head-src-${i}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: headPos },
        },
      });

      map!.addLayer({
        id: `trail-head-${i}`,
        type: 'circle',
        source: `trail-head-src-${i}`,
        layout: { visibility: showTrails ? 'visible' : 'none' },
        paint: {
          'circle-radius': isFmc ? 4 : 3,
          'circle-color': color,
          'circle-opacity': 0.85,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': C.base,
        },
      });
    });

    // Add 3-tier concentric translucent threat geometry (Layer 2)
    const threatFeatures: GeoJSON.Feature[] = [];
    const threatCenterFeatures: GeoJSON.Feature[] = [];

    for (const t of threats) {
      const polygons = threatPolygons(t);
      // Center point
      const isSpoofed = spoofedTrackId === t.id;
      threatCenterFeatures.push({
        type: 'Feature',
        properties: { id: t.id, type: t.type, spoofed: isSpoofed },
        geometry: { type: 'Point', coordinates: [t.position.lng, t.position.lat] },
      });

      // Outer ring: 100% radius
      threatFeatures.push({
        type: 'Feature',
        properties: { id: t.id, type: t.type, radiusLevel: 'outer' },
        geometry: {
          type: 'Polygon',
          coordinates: [polygons.outer],
        },
      });

      // Mid ring: 66% radius
      threatFeatures.push({
        type: 'Feature',
        properties: { id: t.id, type: t.type, radiusLevel: 'mid' },
        geometry: {
          type: 'Polygon',
          coordinates: [polygons.mid],
        },
      });

      // Inner ring: 33% radius
      threatFeatures.push({
        type: 'Feature',
        properties: { id: t.id, type: t.type, radiusLevel: 'inner' },
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
      filter: ['==', 'radiusLevel', 'outer'],
      layout: { visibility: threatVis },
      paint: { 'fill-color': C.red, 'fill-opacity': 0.022 },
    });

    // 2. Mid ring: fill 0.10
    map.addLayer({
      id: 'threat-fill-mid',
      type: 'fill',
      source: 'threat-zones',
      filter: ['==', 'radiusLevel', 'mid'],
      layout: { visibility: threatVis },
      paint: { 'fill-color': C.red, 'fill-opacity': 0.04 },
    });

    // 3. Inner ring: fill 0.16
    map.addLayer({
      id: 'threat-fill-inner',
      type: 'fill',
      source: 'threat-zones',
      filter: ['==', 'radiusLevel', 'inner'],
      layout: { visibility: threatVis },
      paint: { 'fill-color': C.red, 'fill-opacity': 0.07 },
    });

    // Outer dashed outline 1px, opacity 0.45
    map.addLayer({
      id: 'threat-outline-outer',
      type: 'line',
      source: 'threat-zones',
      filter: ['==', 'radiusLevel', 'outer'],
      layout: { visibility: threatVis },
      paint: {
        'line-color': C.red,
        'line-width': 1,
        'line-opacity': 0.45,
        'line-dasharray': [4, 3],
      },
    });

    // Hostile assessment marker: diamond glyph keeps the indicator readable without color.
    map.addLayer({
      id: 'threat-center-dot',
      type: 'symbol',
      source: 'threat-centers',
      filter: ['!', ['get', 'spoofed']],
      layout: { visibility: threatVis, 'text-field': '◆', 'text-size': 11, 'text-allow-overlap': true, 'text-ignore-placement': true },
      paint: {
        'text-color': C.red,
        'text-halo-color': C.base,
        'text-halo-width': 1,
      },
    });

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
      paint: { 'fill-color': ['match', ['get', 'type'], 'corridor', C.cyan, 'kill-box', C.amber, 'restricted', C.red, C.muted], 'fill-opacity': ['case', ['==', ['get', 'status'], 'CLOSED'], 0.16, 0.08] },
    });
    map.addLayer({
      id: 'airspace-line', type: 'line', source: 'airspace-zones', layout: { visibility: showAirspace ? 'visible' : 'none' },
      paint: { 'line-color': ['match', ['get', 'type'], 'corridor', C.cyan, 'kill-box', C.amber, 'restricted', C.red, C.muted], 'line-width': 1.3, 'line-dasharray': [3, 2] },
    });
    setGeoJSONSource('weather-systems', { type: 'FeatureCollection', features: polygonFeatures(weather) });
    map.addLayer({
      id: 'weather-fill', type: 'fill', source: 'weather-systems', layout: { visibility: showWeather ? 'visible' : 'none' },
      paint: { 'fill-color': ['match', ['get', 'type'], 'storm', C.cyan, 'fog', C.secondary, 'front', C.cyan, C.green], 'fill-opacity': ['interpolate', ['linear'], ['get', 'severity'], 1, 0.025, 5, 0.18] },
    });
    map.addLayer({
      id: 'weather-line', type: 'line', source: 'weather-systems', layout: { visibility: showWeather ? 'visible' : 'none' },
      paint: { 'line-color': ['match', ['get', 'type'], 'storm', C.cyan, 'fog', C.secondary, 'front', C.cyan, C.green], 'line-width': 1, 'line-opacity': 0.8 },
    });

    // Selected COA spatial plan: base → ingress → WEZ → release → egress → RTB.
    if (selectedCoa) {
      let routeIndex = 0;
      for (const [missionId, ids] of Object.entries(selectedCoa.assignments)) {
        const mission = missions.find((item) => item.id === missionId);
        if (!mission) continue;
        for (const aircraftId of ids) {
          const assignedAircraft = aircraft.find((item) => item.id === aircraftId);
          if (!assignedAircraft) continue;
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
      ...(showGround ? GROUND_ASSETS.map((item) => ({ type: 'Feature' as const, properties: { id: item.id, label: item.designation, type: item.type, status: item.status, color: C.green, opacity: !area || inArea([item.position]) ? 1 : .24, armament: item.armament, rangeKm: item.range_km }, geometry: { type: 'Point' as const, coordinates: [item.position.lng, item.position.lat] as [number, number] } })) : []),
      ...(showEnemy ? ENEMY_ASSETS.map((item) => ({ type: 'Feature' as const, properties: { id: item.id, label: item.designation, type: item.type, behaviour: item.behaviour, color: C.red, opacity: !area || inArea([item.position]) ? 1 : .24, rangeKm: item.engagementRange_km, probabilityKill: item.probabilityKill }, geometry: { type: 'Point' as const, coordinates: [item.position.lng, item.position.lat] as [number, number] } })) : []),
    ] });
    map.setLayoutProperty('assets-gl-symbols', 'visibility', 'visible');
    map.setLayoutProperty('missions-gl-symbols', 'visibility', 'visible');
      });
    }, 150);
    return () => { window.clearTimeout(debounce); if (frame) window.cancelAnimationFrame(frame); };
  });

  function toggleGround() {
    showGround = !showGround;
  }

  function toggleAirspace() { showAirspace = !showAirspace; }
  function toggleWeather() { showWeather = !showWeather; }
  function toggleEnemy() { showEnemy = !showEnemy; }
</script>

<div class="map-wrap">
  <div class="map-canvas" bind:this={container}></div>
  {#if mapReady && map}<TrajectoryLayer {map} />{/if}
  {#if theaterMapVisible}<TacticalReadout />{/if}

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
  <button class="theater-toggle" aria-label={theaterMapVisible ? 'Hide theater data panel' : 'Show theater data panel'} title="Toggle theater data panel; map remains visible" onclick={() => onToggleTheaterVisibility?.()}>◉</button>
  <div class="coord tr mono">ZOOM {mapZoom.toFixed(1)} · MERCATOR</div>
  <button class="fullscreen-btn" aria-label={fullscreen ? 'Exit map fullscreen' : 'Enter map fullscreen'} title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen map'} onclick={() => onFullscreenClick?.()}>{fullscreen ? '⛶ EXIT FULLSCREEN' : '⛶ FULLSCREEN'}</button>
  <TerrainToggle />
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
  .map-canvas {
    position: absolute;
    inset: 0;
  }

  :global(.maplibregl-canvas) { filter: invert(1) hue-rotate(180deg) brightness(.66) saturate(.38) contrast(.96); }

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

