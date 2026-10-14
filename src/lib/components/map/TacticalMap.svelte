<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { IAF_BASES } from '../../data/bases';
  import { GROUND_ASSETS, type GroundAsset } from '../../data/groundAssets';
  import { ENEMY_ASSETS, type EnemyAsset } from '../../data/enemyAssets';
  import { militarySymbolElement, type MilitarySymbolKind } from '../../data/militarySymbols';
  import TerrainToggle from './TerrainToggle.svelte';
  import { type AirspaceZone, type WeatherSystem } from '../../types';
  import { system } from '../../stores/systemStore.svelte';

  let {
    onBaseSelect,
    onLoadoutClick,
    onFullscreenClick,
    fullscreen = false,
  }: {
    onBaseSelect?: (baseId: string) => void;
    onLoadoutClick?: (type: string, tail: string) => void;
    onFullscreenClick?: () => void;
    fullscreen?: boolean;
  } = $props();

  let container: HTMLDivElement;
  let map: maplibregl.Map | null = null;
  let mapReady = $state(false);
  let dynamicMarkers: maplibregl.Marker[] = [];
  let groundMarkersList: maplibregl.Marker[] = [];
  let baseMarkersList: { id: string; marker: maplibregl.Marker; el: HTMLElement }[] = [];

  // Map layer toggle states
  let showTerrain = $state(true);
  let showGrid = $state(true);
  let showTrails = $state(true);
  let showThreats = $state(true);
  let showGround = $state(true);
  let showAirspace = $state(true);
  let showWeather = $state(true);
  let showEnemy = $state(true);

  const C = {
    cyan: '#00d4ff',
    amber: '#ffb800',
    red: '#ff2d7c',
    green: '#39ff14',
    muted: '#64748b',
    border: '#2a3447',
  };

  const trails: Record<string, [number, number][]> = {};

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
        maxzoom: 15,
        attribution: 'Terrain: Mapzen/AWS',
      },
      'tactical-grid': {
        type: 'geojson',
        data: createGridGeoJson(),
      },
    },
    layers: [
      { id: 'bg', type: 'raster', source: 'osm' },
      {
        id: 'hillshade-base',
        type: 'hillshade',
        source: 'terrain-dem',
        layout: { visibility: 'visible' },
        paint: {
          'hillshade-shadow-color': '#000814',
          'hillshade-highlight-color': '#1a3a5c',
          'hillshade-exaggeration': 0.35,
          'hillshade-illumination-anchor': 'viewport',
          'hillshade-illumination-direction': 315,
          'hillshade-accent-color': '#000814',
        },
      },
      {
        id: 'hillshade-detail',
        type: 'hillshade',
        source: 'terrain-dem',
        layout: { visibility: 'visible' },
        paint: {
          'hillshade-shadow-color': '#00101f',
          'hillshade-highlight-color': '#0d2a44',
          'hillshade-exaggeration': 0.5,
          'hillshade-accent-color': '#00101f',
        },
      },
      {
        id: 'grid-lines',
        type: 'line',
        source: 'tactical-grid',
        layout: { visibility: 'visible' },
        paint: {
          'line-color': 'rgba(0, 212, 255, 0.08)',
          'line-width': 1,
        },
      },
    ],
  };

  function el(html: string): HTMLDivElement {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild as HTMLDivElement;
  }

  // Upgraded Hexagonal Base Marker with rotating radar sweep
  function createBaseMarker(baseId: string): HTMLDivElement {
    const wrapper = el(`<div class="base-marker-wrap" data-base="${baseId}"></div>`);
    wrapper.append(militarySymbolElement('friendlyInstallation', 28));
    const sweep = document.createElement('div');
    sweep.className = 'radar-sweep';
    wrapper.append(sweep);
    wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      onBaseSelect?.(baseId);
    });
    return wrapper;
  }

  // Upgraded Mission Marker with concentric rings and priority pulse
  function missionMarker(priority: number): HTMLDivElement {
    const color = priority === 1 ? C.red : priority === 2 ? C.amber : C.muted;
    const pulseHtml = priority === 1 ? `<div class="mission-pulse" style="border-color:${color};"></div>` : '';
    const borderStyle = priority === 3 ? 'dashed' : 'solid';

    return el(`
      <div class="mission-marker-wrap">
        ${pulseHtml}
        <div class="mission-outer" style="border:1.5px ${borderStyle} ${color}; box-shadow:0 0 10px ${color}, inset 0 0 5px rgba(255,45,124,0.3);">
          <div class="mission-inner" style="border:1px solid ${color};"></div>
          <div class="mission-dot" style="background:${color}; box-shadow:0 0 6px ${color};"></div>
        </div>
      </div>
    `);
  }

  // Ground Asset Marker factory (Tank, UAV, SAM, Radar)
  function createGroundAssetMarker(asset: GroundAsset): HTMLDivElement {
    let innerSvg = '';
    if (asset.type === 'tank') {
      // solid square 10x10 with green fill at 30% + green border
      innerSvg = `<div style="width:10px;height:10px;background:rgba(57,255,20,0.3);border:1.2px solid ${C.green};box-shadow:0 0 6px ${C.green};"></div>`;
    } else if (asset.type === 'uav') {
      // hollow triangle similar to aircraft
      innerSvg = `
        <svg viewBox="0 0 20 20" style="width:14px;height:14px;">
          <polygon points="10,2 18,17 10,14 2,17" fill="none" stroke="${C.cyan}" stroke-width="1.5" />
        </svg>`;
    } else if (asset.type === 'sam') {
      // circle with crosshairs at N/E/S/W
      innerSvg = `
        <svg viewBox="0 0 20 20" style="width:14px;height:14px;">
          <circle cx="10" cy="10" r="5" fill="none" stroke="${C.amber}" stroke-width="1.2" />
          <line x1="10" y1="1" x2="10" y2="4" stroke="${C.amber}" stroke-width="1.2" />
          <line x1="10" y1="16" x2="10" y2="19" stroke="${C.amber}" stroke-width="1.2" />
          <line x1="1" y1="10" x2="4" y2="10" stroke="${C.amber}" stroke-width="1.2" />
          <line x1="16" y1="10" x2="19" y2="10" stroke="${C.amber}" stroke-width="1.2" />
        </svg>`;
    } else {
      // radar arc segment marker (half circle)
      innerSvg = `
        <svg viewBox="0 0 20 20" style="width:14px;height:14px;">
          <path d="M3,15 A7,7 0 0,1 17,15" fill="none" stroke="${C.cyan}" stroke-width="1.5" />
          <circle cx="10" cy="15" r="2" fill="${C.cyan}" />
        </svg>`;
    }

    return el(`
      <div class="ground-marker-wrap" style="cursor:pointer; display:grid; place-items:center;">
        ${innerSvg}
      </div>
    `);
  }

  function createEnemyMarker(asset: EnemyAsset): HTMLDivElement {
    const kind: MilitarySymbolKind = asset.type === 'aircraft' ? 'hostileAir' : 'hostileGround';
    const wrapper = militarySymbolElement(kind, 32);
    wrapper.title = asset.designation;
    return wrapper;
  }

  function circlePolygon(center: [number, number], radiusKm: number, points = 64): number[][] {
    const [lng, lat] = center;
    const dx = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
    const dy = radiusKm / 110.574;
    const coords: number[][] = [];
    for (let i = 0; i <= points; i++) {
      const theta = (i / points) * 2 * Math.PI;
      coords.push([lng + dx * Math.cos(theta), lat + dy * Math.sin(theta)]);
    }
    return coords;
  }

  function polygonFeatures(items: Array<AirspaceZone | WeatherSystem>): GeoJSON.Feature[] {
    return items.map((item) => ({
      type: 'Feature',
      properties: 'status' in item ? { id: item.id, type: item.type, status: item.status } : { id: item.id, type: item.type, severity: item.severity },
      geometry: { type: 'Polygon', coordinates: [[...item.polygon.map((point) => [point.lng, point.lat]), [item.polygon[0].lng, item.polygon[0].lat]]] },
    }));
  }

  onMount(() => {
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

    map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: [79, 31],
      zoom: 4.2,
      attributionControl: false,
      dragRotate: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      const m = map!;
      m.addSource('matrix-highlight', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'matrix-highlight-fuel', type: 'line', source: 'matrix-highlight', filter: ['==', ['get', 'kind'], 'fuel'], paint: { 'line-color': C.green, 'line-width': 1.5, 'line-dasharray': [2, 2], 'line-opacity': .85 } });
      m.addLayer({ id: 'matrix-highlight-wez', type: 'line', source: 'matrix-highlight', filter: ['==', ['get', 'kind'], 'wez'], paint: { 'line-color': C.red, 'line-width': 1.5, 'line-dasharray': [1, 2], 'line-opacity': .95 } });
      m.addLayer({ id: 'matrix-highlight-route', type: 'line', source: 'matrix-highlight', filter: ['==', ['get', 'kind'], 'route'], paint: { 'line-color': C.cyan, 'line-width': 2.5, 'line-opacity': .95 } });
      baseMarkersList = [];
      for (const base of IAF_BASES) {
        const markerEl = createBaseMarker(base.id);
        const mk = new maplibregl.Marker({ element: markerEl })
          .setLngLat([base.lng, base.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
              `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;background:#0a0e1a;border:1px solid #2a3447;padding:10px 14px;">
                <div style="color:#00d4ff;letter-spacing:0.15em;">${base.code}</div>
                <div style="color:#94a3b8;font-size:10px;margin-top:4px;">${base.name}</div>
                <div style="color:#64748b;font-size:9px;margin-top:2px;">ELEV ${base.elevation}m · CLICK FOR DETAIL</div>
              </div>`
            )
          )
          .addTo(m);
        baseMarkersList.push({ id: base.id, marker: mk, el: markerEl });
      }
      mapReady = true;
    });

    return () => {
      window.removeEventListener('aircommand:map-layer', handleLayerToggle);
      window.removeEventListener('aircommand:terrain-3d', handleTerrain3d);
      window.removeEventListener('aircommand:matrix-highlight', handleMatrixHighlight);
      delete (window as any).__airCommandLoadout;
      map?.remove();
      map = null;
    };
  });

  // Layer control toggle handlers
  function toggleTerrain() {
    showTerrain = !showTerrain;
    if (!map) return;
    const vis = showTerrain ? 'visible' : 'none';
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
    const aircraft = system.aircraft;
    const missions = system.missions;
    const threats = system.threats;
    const airspace = system.airspaceZones;
    const weather = system.weatherSystems;
    const selectedCoa = system.coas.find((coa) => coa.id === system.selectedCoaId) ?? null;
    const selBase = system.selectedBaseId;

    // Update selected base styling
    for (const b of baseMarkersList) {
      if (b.id === selBase) {
        b.el.classList.add('selected');
      } else {
        b.el.classList.remove('selected');
      }
    }

    for (const m of dynamicMarkers) m.remove();
    dynamicMarkers = [];

    // Track coordinates for trails
    for (const ac of aircraft) {
      if (!trails[ac.id]) trails[ac.id] = [];
      const last = trails[ac.id][trails[ac.id].length - 1];
      const pos: [number, number] = [ac.position.lng, ac.position.lat];
      if (!last || last[0] !== pos[0] || last[1] !== pos[1]) {
        trails[ac.id].push(pos);
        if (trails[ac.id].length > 14) trails[ac.id].shift();
      }
    }

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
      const pts = trails[ac.id];
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
          'circle-stroke-color': '#05080f',
        },
      });
    });

    // Add 3-tier concentric translucent threat geometry (Layer 2)
    const threatFeatures: GeoJSON.Feature[] = [];
    const threatCenterFeatures: GeoJSON.Feature[] = [];

    for (const t of threats) {
      // Center point
      const isSpoofed = system.spoofedTrackId === t.id;
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
          coordinates: [circlePolygon([t.position.lng, t.position.lat], t.radius)],
        },
      });

      // Mid ring: 66% radius
      threatFeatures.push({
        type: 'Feature',
        properties: { id: t.id, type: t.type, radiusLevel: 'mid' },
        geometry: {
          type: 'Polygon',
          coordinates: [circlePolygon([t.position.lng, t.position.lat], t.radius * 0.66)],
        },
      });

      // Inner ring: 33% radius
      threatFeatures.push({
        type: 'Feature',
        properties: { id: t.id, type: t.type, radiusLevel: 'inner' },
        geometry: {
          type: 'Polygon',
          coordinates: [circlePolygon([t.position.lng, t.position.lat], t.radius * 0.33)],
        },
      });
    }

    map.addSource('threat-zones', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: threatFeatures },
    });

    map.addSource('threat-centers', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: threatCenterFeatures },
    });

    const threatVis = showThreats ? 'visible' : 'none';

    // 1. Outer ring: fill 0.06
    map.addLayer({
      id: 'threat-fill-outer',
      type: 'fill',
      source: 'threat-zones',
      filter: ['==', 'radiusLevel', 'outer'],
      layout: { visibility: threatVis },
      paint: { 'fill-color': C.red, 'fill-opacity': 0.06 },
    });

    // 2. Mid ring: fill 0.10
    map.addLayer({
      id: 'threat-fill-mid',
      type: 'fill',
      source: 'threat-zones',
      filter: ['==', 'radiusLevel', 'mid'],
      layout: { visibility: threatVis },
      paint: { 'fill-color': C.red, 'fill-opacity': 0.10 },
    });

    // 3. Inner ring: fill 0.16
    map.addLayer({
      id: 'threat-fill-inner',
      type: 'fill',
      source: 'threat-zones',
      filter: ['==', 'radiusLevel', 'inner'],
      layout: { visibility: threatVis },
      paint: { 'fill-color': C.red, 'fill-opacity': 0.16 },
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

    // Center marker: solid 3px dot
    map.addLayer({
      id: 'threat-center-dot',
      type: 'circle',
      source: 'threat-centers',
      filter: ['!', ['get', 'spoofed']],
      layout: { visibility: threatVis },
      paint: {
        'circle-radius': 3,
        'circle-color': C.red,
        'circle-opacity': 0.95,
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
    map.addSource('airspace-zones', { type: 'geojson', data: { type: 'FeatureCollection', features: polygonFeatures(airspace) } });
    map.addLayer({
      id: 'airspace-fill', type: 'fill', source: 'airspace-zones', layout: { visibility: showAirspace ? 'visible' : 'none' },
      paint: { 'fill-color': ['match', ['get', 'type'], 'corridor', C.cyan, 'kill-box', C.amber, 'restricted', C.red, '#64748b'], 'fill-opacity': ['case', ['==', ['get', 'status'], 'CLOSED'], 0.16, 0.08] },
    });
    map.addLayer({
      id: 'airspace-line', type: 'line', source: 'airspace-zones', layout: { visibility: showAirspace ? 'visible' : 'none' },
      paint: { 'line-color': ['match', ['get', 'type'], 'corridor', C.cyan, 'kill-box', C.amber, 'restricted', C.red, '#64748b'], 'line-width': 1.3, 'line-dasharray': [3, 2] },
    });
    map.addSource('weather-systems', { type: 'geojson', data: { type: 'FeatureCollection', features: polygonFeatures(weather) } });
    map.addLayer({
      id: 'weather-fill', type: 'fill', source: 'weather-systems', layout: { visibility: showWeather ? 'visible' : 'none' },
      paint: { 'fill-color': ['match', ['get', 'type'], 'storm', '#2878ff', 'fog', '#94a3b8', 'front', '#00d4ff', '#39ff14'], 'fill-opacity': ['interpolate', ['linear'], ['get', 'severity'], 1, 0.025, 5, 0.18] },
    });
    map.addLayer({
      id: 'weather-line', type: 'line', source: 'weather-systems', layout: { visibility: showWeather ? 'visible' : 'none' },
      paint: { 'line-color': ['match', ['get', 'type'], 'storm', '#2878ff', 'fog', '#94a3b8', 'front', '#00d4ff', '#39ff14'], 'line-width': 1, 'line-opacity': 0.8 },
    });

    // Selected COA spatial plan: base → ingress → WEZ → release → egress → RTB.
    if (selectedCoa) {
      let routeIndex = 0;
      for (const [missionId, ids] of Object.entries(selectedCoa.assignments)) {
        const mission = missions.find((item) => item.id === missionId);
        if (!mission) continue;
        for (const aircraftId of ids) {
          const aircraft = aircraft.find((item) => item.id === aircraftId);
          if (!aircraft) continue;
          const start: [number, number] = [aircraft.position.lng, aircraft.position.lat];
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
          const range = Math.max(50, aircraft.fuel / 100 * 700);
          const fuelId = `fuel-range-${routeIndex}`;
          map.addSource(fuelId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [circlePolygon(start, range)] } } });
          map.addLayer({ id: fuelId, type: 'line', source: fuelId, paint: { 'line-color': C.green, 'line-width': 1, 'line-opacity': .26, 'line-dasharray': [2, 2] } });
          routeIndex++;
        }
      }
    }

    // Upgraded Mission markers (Layer 7)
    for (const mission of missions) {
      dynamicMarkers.push(
        new maplibregl.Marker({ element: missionMarker(mission.priority) })
          .setLngLat([mission.target.lng, mission.target.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
              `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;background:#0a0e1a;border:1px solid #2a3447;padding:10px 14px;">
                <div style="color:#ffb800;letter-spacing:0.15em;">${mission.name}</div>
                <div style="color:#94a3b8;font-size:10px;margin-top:4px;">PRIORITY ${mission.priority}</div>
                <div style="color:#64748b;font-size:9px;">RISK ${mission.riskLevel}/100</div>
              </div>`
            )
          )
          .addTo(map)
      );
    }

    // Aircraft markers
    for (const ac of aircraft) {
      const color = ac.status === 'FMC' ? C.green : ac.status === 'PMC' ? C.amber : C.red;
      const wrapper = militarySymbolElement('friendlyAir', 30);
      wrapper.dataset.aircraftId = ac.id;
      wrapper.style.cursor = 'pointer';
      wrapper.style.transition = 'transform 0.15s ease';
      wrapper.title = `${ac.tailNumber} · ${ac.status}`;
      const statusGlyph = document.createElement('span');
      statusGlyph.className = `aircraft-status-glyph aircraft-status-${ac.status.toLowerCase()}`;
      statusGlyph.textContent = ac.status === 'FMC' ? '✓' : ac.status === 'PMC' ? '◐' : '×';
      statusGlyph.setAttribute('aria-label', ac.status);
      wrapper.append(statusGlyph);
      dynamicMarkers.push(
        new maplibregl.Marker({ element: wrapper })
          .setLngLat([ac.position.lng, ac.position.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
              `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;background:#0a0e1a;border:1px solid #2a3447;padding:10px 14px;min-width:210px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                  <span style="color:#00d4ff;letter-spacing:0.15em;">${ac.tailNumber}</span>
                  <span style="color:${color};font-size:9px;letter-spacing:0.1em;">${ac.status}</span>
                </div>
                <div style="color:#94a3b8;font-size:10px;">${ac.type}</div>
                <div style="color:#64748b;font-size:9px;margin-top:6px;">FUEL ${ac.fuel}% · CREW ${ac.crewRest}h · BASE ${ac.base.toUpperCase()}</div>
                <div style="color:#64748b;font-size:9px;margin-top:2px;">HDG ${ac.heading}° · SPD ${ac.speed}</div>
                <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #2a3447;">
                  <button
                    style="background:transparent;border:1px solid #00d4ff;color:#00d4ff;font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:0.12em;padding:3px 8px;cursor:pointer;width:100%;text-align:center;"
                    onclick="window.__airCommandLoadout && window.__airCommandLoadout('${ac.type}','${ac.tailNumber}')"
                  >
                    ◈ OPEN LOADOUT DIAGRAM
                  </button>
                </div>
              </div>`
            )
          )
          .addTo(map)
      );
    }

    // Ground asset markers (Layer A3)
    if (showGround) {
      for (const ga of GROUND_ASSETS) {
        const markerEl = createGroundAssetMarker(ga);
        dynamicMarkers.push(
          new maplibregl.Marker({ element: markerEl })
            .setLngLat([ga.position.lng, ga.position.lat])
            .setPopup(
              new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
                `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;background:#0a0e1a;border:1px solid #2a3447;padding:10px 14px;min-width:200px;">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span style="color:#39ff14;letter-spacing:0.14em;font-weight:700;">${ga.designation}</span>
                    <span style="color:#00d4ff;font-size:8px;letter-spacing:0.1em;border:1px solid #00d4ff;padding:1px 4px;">${ga.type.toUpperCase()}</span>
                  </div>
                  <div style="color:#94a3b8;font-size:9.5px;">${ga.specs}</div>
                  <div style="color:#64748b;font-size:8.5px;margin-top:4px;">ARMAMENT: ${ga.armament}</div>
                  <div style="color:#ffb800;font-size:8.5px;margin-top:2px;">RANGE: ${ga.range_km} KM · BASE: ${ga.base.toUpperCase()} · STATUS: ${ga.status}</div>
                </div>`
              )
            )
            .addTo(map)
        );
      }
    }

    if (showEnemy) {
      for (const asset of ENEMY_ASSETS) {
        const markerEl = createEnemyMarker(asset);
        dynamicMarkers.push(new maplibregl.Marker({ element: markerEl })
          .setLngLat([asset.position.lng, asset.position.lat])
          .setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
            `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#e2e8f0;background:#0a0e1a;border:1px solid #ff2d7c;padding:10px 12px;min-width:210px;">
              <div style="color:#ff2d7c;letter-spacing:.12em;">${asset.designation}</div>
              <div style="color:#94a3b8;margin-top:5px;">${asset.type.toUpperCase()} · ${asset.behaviour.toUpperCase()}</div>
              <div style="color:#64748b;margin-top:4px;">RANGE ${asset.engagementRange_km}KM · PK ${Math.round(asset.probabilityKill * 100)}% · EMISSION ${asset.emissionState.toUpperCase()}</div>
            </div>`)).addTo(map));
      }
    }
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

  <div class="coord tl mono">THEATER MAP / GRID 78 · 34°N / 78°E</div>
  <div class="coord tr mono">ZOOM 4.2 · MERCATOR</div>
  <button class="fullscreen-btn" aria-label={fullscreen ? 'Exit map fullscreen' : 'Enter map fullscreen'} title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen map'} onclick={() => onFullscreenClick?.()}>{fullscreen ? '⛶ EXIT FULLSCREEN' : '⛶ FULLSCREEN'}</button>
  <TerrainToggle />
  <div class="coord bl mono">SCALE 1:5,000,000</div>
  <div class="coord br mono">WGS84 · EGM96</div>
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
    background: #05080f;
  }
  .map-canvas {
    position: absolute;
    inset: 0;
  }

  :global(.maplibregl-canvas) {
    filter: invert(1) hue-rotate(180deg) brightness(0.82) saturate(0.5) contrast(1.12);
  }

  /* LAYER 3: Scanlines and Vignette */
  .scanlines {
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      0deg,
      rgba(0, 212, 255, 0.02) 0px,
      rgba(0, 212, 255, 0.02) 1px,
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
    text-shadow: 0 0 4px rgba(0, 212, 255, 0.7);
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
  .fullscreen-btn:hover,.fullscreen-btn:focus-visible { border-color:var(--accent-cyan); background:rgba(0,212,255,.1); outline:none; }

  .degraded {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 16px;
    background: rgba(255, 45, 124, 0.15);
    border: 1px solid var(--accent-red);
    color: var(--accent-red);
    font-size: 10px;
    letter-spacing: 0.18em;
    animation: pulse 1.2s ease-in-out infinite;
    z-index: 6;
  }
  .mono { font-family: var(--font-mono); }
  :global(.mil-symbol) { position: relative; display: grid; place-items: center; width: max-content; filter: drop-shadow(0 0 4px rgba(0, 212, 255, .35)); }
  :global(.mil-symbol svg) { display: block; max-width: 36px; max-height: 36px; }
  :global(.mil-symbol-hostileAir), :global(.mil-symbol-hostileGround) { filter: drop-shadow(0 0 4px rgba(255, 45, 124, .45)); }
  :global(.aircraft-status-glyph) { position: absolute; right: -4px; bottom: -4px; min-width: 12px; height: 12px; display: grid; place-items: center; border: 1px solid currentColor; background: #05080f; font: 9px/1 var(--font-mono); }
  :global(.aircraft-status-fmc) { color: var(--accent-green); }
  :global(.aircraft-status-pmc) { color: var(--accent-amber); }
  :global(.aircraft-status-nmc) { color: var(--accent-red); }
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
    background: #0a0e1a !important;
    border: 1px solid #2a3447 !important;
    border-radius: 0 !important;
  }
  :global(.maplibregl-ctrl-group button) {
    background: transparent !important;
    border-bottom: 1px solid #2a3447 !important;
  }
  :global(.maplibregl-ctrl-group button span) { filter: invert(1) hue-rotate(180deg); }
  :global(.maplibregl-ctrl-scale) {
    background: rgba(5, 8, 15, 0.9) !important;
    border-color: #2a3447 !important;
    color: #00d4ff !important;
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
    background: rgba(0, 212, 255, 0.2);
    clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
    border: 1px solid #00d4ff;
    box-shadow: 0 0 8px #00d4ff;
    display: grid;
    place-items: center;
    transition: all 0.15s;
  }
  :global(.base-marker-wrap:hover .hex-outer) {
    box-shadow: 0 0 14px #00d4ff;
    background: rgba(0, 212, 255, 0.4);
  }
  :global(.base-marker-wrap .hex-inner) {
    width: 8px;
    height: 8px;
    clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
    border: 0.5px solid rgba(0, 212, 255, 0.8);
    background: #00d4ff;
  }

  :global(.base-marker-wrap .radar-sweep) {
    position: absolute;
    inset: -3px;
    border-radius: 50%;
    border-top: 1px solid #00d4ff;
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
