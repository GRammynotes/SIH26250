<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { IAF_BASES } from '../../data/bases';
  import { getAircraftSvg } from '../../data/aircraftIcons';
  import { system } from '../../stores/systemStore.svelte';

  let {
    onBaseSelect,
  }: { onBaseSelect?: (baseId: string) => void } = $props();

  let container: HTMLDivElement;
  let map: maplibregl.Map | null = null;
  let mapReady = $state(false);
  let dynamicMarkers: maplibregl.Marker[] = [];

  const C = { cyan: '#00d4ff', amber: '#ffb800', red: '#ff2d7c', green: '#39ff14', muted: '#64748b' };

  const trails: Record<string, [number, number][]> = {};

  const MAP_STYLE: maplibregl.StyleSpecification = {
    version: 8,
    sources: {
      'osm': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [{ id: 'bg', type: 'raster', source: 'osm' }],
  };

  function el(html: string): HTMLDivElement {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild as HTMLDivElement;
  }

  function baseMarker(baseId: string): HTMLDivElement {
    const node = el(`<div style="width:12px;height:12px;transform:rotate(45deg);border:1.5px solid ${C.cyan};box-shadow:0 0 10px ${C.cyan},inset 0 0 6px rgba(0,212,255,0.6);background:rgba(0,212,255,0.15);cursor:pointer;"></div>`);
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      onBaseSelect?.(baseId);
    });
    return node;
  }

  function missionMarker(priority: number): HTMLDivElement {
    const color = priority === 1 ? C.red : priority === 2 ? C.amber : C.muted;
    return el(`<div style="position:relative;width:18px;height:18px;">
      <div style="position:absolute;inset:0;border:2px solid ${color};border-radius:50%;box-shadow:0 0 12px ${color},inset 0 0 6px rgba(255,45,124,0.4);"></div>
      <div style="position:absolute;inset:4px;border:1px solid ${color};border-radius:50%;opacity:0.6;"></div>
      <div style="position:absolute;top:50%;left:50%;width:4px;height:4px;margin:-2px 0 0 -2px;background:${color};border-radius:50%;box-shadow:0 0 6px ${color};"></div>
    </div>`);
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

  onMount(() => {
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
      for (const base of IAF_BASES) {
        new maplibregl.Marker({ element: baseMarker(base.id) })
          .setLngLat([base.lng, base.lat])
          .setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
            `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;background:#0a0e1a;border:1px solid #2a3447;padding:10px 14px;">
              <div style="color:#00d4ff;letter-spacing:0.15em;">${base.code}</div>
              <div style="color:#94a3b8;font-size:10px;margin-top:4px;">${base.name}</div>
              <div style="color:#64748b;font-size:9px;margin-top:2px;">ELEV ${base.elevation}m · CLICK FOR DETAIL</div>
            </div>`))
          .addTo(m);
      }
      mapReady = true;
    });

    return () => { map?.remove(); map = null; };
  });

  $effect(() => {
    if (!mapReady || !map) return;
    const aircraft = system.aircraft;
    const missions = system.missions;
    const threats = system.threats;

    for (const m of dynamicMarkers) m.remove();
    dynamicMarkers = [];

    for (const ac of aircraft) {
      if (!trails[ac.id]) trails[ac.id] = [];
      const last = trails[ac.id][trails[ac.id].length - 1];
      const pos: [number, number] = [ac.position.lng, ac.position.lat];
      if (!last || last[0] !== pos[0] || last[1] !== pos[1]) {
        trails[ac.id].push(pos);
        if (trails[ac.id].length > 12) trails[ac.id].shift();
      }
    }

    for (let i = 0; i < 20; i++) {
      if (map.getLayer(`trail-line-${i}`)) map.removeLayer(`trail-line-${i}`);
      if (map.getSource(`trail-${i}`)) map.removeSource(`trail-${i}`);
    }
    if (map.getLayer('threat-fill')) map.removeLayer('threat-fill');
    if (map.getLayer('threat-outline')) map.removeLayer('threat-outline');
    if (map.getLayer('threat-inner')) map.removeLayer('threat-inner');
    if (map.getSource('threat-zones')) map.removeSource('threat-zones');

    aircraft.forEach((ac, i) => {
      const pts = trails[ac.id];
      if (pts.length < 2) return;
      const color = ac.status === 'FMC' ? C.green : ac.status === 'PMC' ? C.amber : C.red;
      map!.addSource(`trail-${i}`, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts } },
      });
      map!.addLayer({
        id: `trail-line-${i}`,
        type: 'line',
        source: `trail-${i}`,
        paint: { 'line-color': color, 'line-width': 1.5, 'line-opacity': 0.55, 'line-blur': 0.8 },
      });
    });

    const threatFeatures = threats.map((t) => ({
      type: 'Feature' as const,
      properties: { id: t.id, type: t.type },
      geometry: { type: 'Polygon' as const, coordinates: [circlePolygon([t.position.lng, t.position.lat], t.radius)] },
    }));
    map!.addSource('threat-zones', { type: 'geojson', data: { type: 'FeatureCollection', features: threatFeatures } });
    map!.addLayer({ id: 'threat-fill', type: 'fill', source: 'threat-zones', paint: { 'fill-color': C.red, 'fill-opacity': 0.08 } });
    map!.addLayer({ id: 'threat-outline', type: 'line', source: 'threat-zones', paint: { 'line-color': C.red, 'line-width': 1.2, 'line-opacity': 0.7, 'line-dasharray': [3, 2] } });
    map!.addLayer({ id: 'threat-inner', type: 'line', source: 'threat-zones', paint: { 'line-color': C.red, 'line-width': 0.5, 'line-opacity': 0.35, 'line-blur': 2 } });

    for (const mission of missions) {
      dynamicMarkers.push(
        new maplibregl.Marker({ element: missionMarker(mission.priority) })
          .setLngLat([mission.target.lng, mission.target.lat])
          .setPopup(new maplibregl.Popup({ offset: 14, closeButton: false }).setHTML(
            `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;background:#0a0e1a;border:1px solid #2a3447;padding:10px 14px;">
              <div style="color:#ffb800;letter-spacing:0.15em;">${mission.name}</div>
              <div style="color:#94a3b8;font-size:10px;margin-top:4px;">PRIORITY ${mission.priority}</div>
              <div style="color:#64748b;font-size:9px;">RISK ${mission.riskLevel}/100</div>
            </div>`))
          .addTo(map!),
      );
    }

    for (const ac of aircraft) {
      const color = ac.status === 'FMC' ? C.green : ac.status === 'PMC' ? C.amber : C.red;
      const wrapper = el(`<div style="cursor:pointer;">${getAircraftSvg(ac.type, color, ac.heading, 26)}</div>`);
      dynamicMarkers.push(
        new maplibregl.Marker({ element: wrapper })
          .setLngLat([ac.position.lng, ac.position.lat])
          .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
            `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e2e8f0;background:#0a0e1a;border:1px solid #2a3447;padding:10px 14px;min-width:200px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="color:#00d4ff;letter-spacing:0.15em;">${ac.tailNumber}</span>
                <span style="color:${color};font-size:9px;letter-spacing:0.1em;">${ac.status}</span>
              </div>
              <div style="color:#94a3b8;font-size:10px;">${ac.type}</div>
              <div style="color:#64748b;font-size:9px;margin-top:6px;">FUEL ${ac.fuel}% · CREW ${ac.crewRest}h · BASE ${ac.base.toUpperCase()}</div>
              <div style="color:#64748b;font-size:9px;margin-top:2px;">HDG ${ac.heading}° · SPD ${ac.speed}</div>
            </div>`))
          .addTo(map!),
      );
    }
  });
</script>

<div class="map-wrap">
  <div class="map-canvas" bind:this={container}></div>

  {#if system.mode === 'DEGRADED'}
    <div class="degraded mono">EDGE MODE ACTIVE · DEGRADED SENSOR FUSION</div>
  {/if}

  <div class="reticle" aria-hidden="true">
    <div class="cross-h"></div>
    <div class="cross-v"></div>
    <div class="cross-dot"></div>
  </div>

  <div class="coord tl mono">GRID 34°N / 78°E · SECTOR KASHMIR</div>
  <div class="coord tr mono">ZOOM 4.2 · MERCATOR</div>
  <div class="coord bl mono">SCALE 1:5,000,000</div>
  <div class="coord br mono">WGS84 · EGM96</div>
</div>

<style>
  .map-wrap { position: relative; width: 100%; height: 100%; overflow: hidden; background: #05080f; }
  .map-canvas { position: absolute; inset: 0; }

  :global(.maplibregl-canvas) { filter: invert(1) hue-rotate(180deg) brightness(0.82) saturate(0.5) contrast(1.12); }

  .reticle { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 44px; height: 44px; pointer-events: none; opacity: 0.35; }
  .cross-h { position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: var(--accent-cyan); }
  .cross-v { position: absolute; left: 50%; top: 0; height: 100%; width: 1px; background: var(--accent-cyan); }
  .cross-dot { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 5px; height: 5px; border-radius: 50%; background: var(--accent-cyan); box-shadow: 0 0 10px var(--accent-cyan); }

  .coord { position: absolute; font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.15em; color: var(--accent-cyan); opacity: 0.65; pointer-events: none; text-shadow: 0 0 4px rgba(0,212,255,0.7); }
  .coord.tl { top: 8px; left: 10px; }
  .coord.tr { top: 8px; right: 10px; }
  .coord.bl { bottom: 8px; left: 10px; }
  .coord.br { bottom: 8px; right: 10px; }

  .degraded {
    position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
    padding: 6px 16px;
    background: rgba(255,45,124,0.15);
    border: 1px solid var(--accent-red);
    color: var(--accent-red);
    font-size: 10px; letter-spacing: 0.18em;
    animation: pulse 1.2s ease-in-out infinite;
    z-index: 6;
  }
  .mono { font-family: var(--font-mono); }

  :global(.maplibregl-popup-content) { padding: 0 !important; background: transparent !important; box-shadow: none !important; border-radius: 0 !important; }
  :global(.maplibregl-popup-tip) { display: none !important; }
  :global(.maplibregl-ctrl-group) { background: #0a0e1a !important; border: 1px solid #2a3447 !important; border-radius: 0 !important; }
  :global(.maplibregl-ctrl-group button) { background: transparent !important; border-bottom: 1px solid #2a3447 !important; }
  :global(.maplibregl-ctrl-group button span) { filter: invert(1) hue-rotate(180deg); }
  :global(.maplibregl-ctrl-scale) { background: rgba(5,8,15,0.9) !important; border-color: #2a3447 !important; color: #00d4ff !important; font-family: 'JetBrains Mono', monospace !important; font-size: 9px !important; letter-spacing: 0.1em !important; }
</style>
