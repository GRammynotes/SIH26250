<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { IAF_BASES } from '../../data/bases';
  import type { Aircraft, Mission, Threat } from '../../types';

  let { aircraft = [], missions = [], threats = [] }: {
    aircraft?: Aircraft[]; missions?: Mission[]; threats?: Threat[];
  } = $props();

  let container: HTMLDivElement;
  let map: maplibregl.Map | null = null;

  const C = { cyan: '#00f0ff', amber: '#ffaa00', red: '#ff3366', green: '#00ff88', muted: '#5a6a7a' };

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

  function baseMarker(): HTMLDivElement {
    return el(`<div style="width:10px;height:10px;transform:rotate(45deg);border:1.5px solid ${C.cyan};box-shadow:0 0 8px ${C.cyan},inset 0 0 4px ${C.cyan};"></div>`);
  }

  function aircraftMarker(status: string, heading: number): HTMLDivElement {
    const color = status === 'FMC' ? C.green : status === 'PMC' ? C.amber : C.red;
    return el(`<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:12px solid ${color};filter:drop-shadow(0 0 4px ${color});transform:rotate(${heading}deg);transform-origin:50% 60%;"></div>`);
  }

  function missionMarker(priority: number): HTMLDivElement {
    const color = priority === 1 ? C.red : priority === 2 ? C.amber : C.muted;
    return el(`<div style="width:14px;height:14px;border:2px solid ${color};border-radius:50%;box-shadow:0 0 10px ${color};"></div>`);
  }

  function circlePolygon(center: [number, number], radiusKm: number, points = 48): number[][] {
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
      const threatFeatures = threats.map((t) => ({
        type: 'Feature' as const,
        properties: { id: t.id, type: t.type },
        geometry: { type: 'Polygon' as const, coordinates: [circlePolygon([t.position.lng, t.position.lat], t.radius)] },
      }));
      m.addSource('threat-zones', { type: 'geojson', data: { type: 'FeatureCollection', features: threatFeatures } });
      m.addLayer({ id: 'threat-fill', type: 'fill', source: 'threat-zones', paint: { 'fill-color': C.red, 'fill-opacity': 0.10 } });
      m.addLayer({ id: 'threat-outline', type: 'line', source: 'threat-zones', paint: { 'line-color': C.red, 'line-width': 1, 'line-opacity': 0.55, 'line-dasharray': [2, 2] } });

      for (const base of IAF_BASES) {
        new maplibregl.Marker({ element: baseMarker() })
          .setLngLat([base.lng, base.lat])
          .setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
            `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e8eef5;background:#0a0d12;border:1px solid #1a242e;padding:8px 12px;">
              <div style="color:#00f0ff;letter-spacing:0.15em;">${base.code}</div>
              <div style="color:#9aa8b8;font-size:10px;margin-top:3px;">${base.name}</div>
              <div style="color:#5a6a7a;font-size:9px;margin-top:2px;">ELEV ${base.elevation}m</div>
            </div>`))
          .addTo(m);
      }

      for (const mission of missions) {
        new maplibregl.Marker({ element: missionMarker(mission.priority) })
          .setLngLat([mission.target.lng, mission.target.lat])
          .setPopup(new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(
            `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e8eef5;background:#0a0d12;border:1px solid #1a242e;padding:8px 12px;">
              <div style="color:#ffaa00;letter-spacing:0.15em;">${mission.name}</div>
              <div style="color:#9aa8b8;font-size:10px;margin-top:3px;">PRIORITY ${mission.priority}</div>
              <div style="color:#5a6a7a;font-size:9px;">RISK ${mission.riskLevel}/100</div>
            </div>`))
          .addTo(m);
      }

      for (const ac of aircraft) {
        new maplibregl.Marker({ element: aircraftMarker(ac.status, ac.heading) })
          .setLngLat([ac.position.lng, ac.position.lat])
          .setPopup(new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
            `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#e8eef5;background:#0a0d12;border:1px solid #1a242e;padding:8px 12px;min-width:180px;">
              <div style="color:#00f0ff;letter-spacing:0.15em;">${ac.tailNumber}</div>
              <div style="color:#9aa8b8;font-size:10px;margin-top:3px;">${ac.type}</div>
              <div style="color:#5a6a7a;font-size:9px;margin-top:2px;">STATUS ${ac.status} · FUEL ${ac.fuel}% · CREW ${ac.crewRest}h</div>
            </div>`))
          .addTo(m);
      }
    });

    return () => { map?.remove(); map = null; };
  });
</script>

<div class="map-wrap">
  <div class="map-canvas" bind:this={container}></div>

  <div class="reticle" aria-hidden="true">
    <div class="cross-h"></div>
    <div class="cross-v"></div>
    <div class="cross-dot"></div>
  </div>

  <div class="coord tl mono">GRID 34°N / 78°E · SECTOR KASHMIR</div>
  <div class="coord tr mono">ZOOM 4.2 · MERCATOR</div>
  <div class="coord bl mono">SCALE 1:5,000,000</div>
  <div class="coord br mono">WGS84 · EGM96</div>

  <div class="corners tl-corner"></div>
  <div class="corners tr-corner"></div>
  <div class="corners bl-corner"></div>
  <div class="corners br-corner"></div>
</div>

<style>
  .map-wrap { position: relative; width: 100%; height: 100%; overflow: hidden; background: #050608; }
  .map-canvas { position: absolute; inset: 0; }

  :global(.maplibregl-canvas) {
    filter: invert(1) hue-rotate(180deg) brightness(0.85) saturate(0.55) contrast(1.08);
  }

  .reticle {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 40px; height: 40px; pointer-events: none; opacity: 0.35;
  }
  .cross-h { position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: var(--accent-cyan); }
  .cross-v { position: absolute; left: 50%; top: 0; height: 100%; width: 1px; background: var(--accent-cyan); }
  .cross-dot {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);
    width: 4px; height: 4px; border-radius: 50%; background: var(--accent-cyan);
    box-shadow: 0 0 8px var(--accent-cyan);
  }

  .coord {
    position: absolute;
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.15em;
    color: var(--accent-cyan); opacity: 0.6;
    pointer-events: none;
    text-shadow: 0 0 4px rgba(0,240,255,0.6);
  }
  .coord.tl { top: 8px; left: 10px; }
  .coord.tr { top: 8px; right: 10px; }
  .coord.bl { bottom: 8px; left: 10px; }
  .coord.br { bottom: 8px; right: 10px; }

  .corners { position: absolute; width: 14px; height: 14px; pointer-events: none; }
  .corners::before, .corners::after { content: ''; position: absolute; background: var(--accent-cyan); opacity: 0.55; }
  .corners.tl-corner { top: 6px; left: 6px; border-left: 1px solid var(--accent-cyan); border-top: 1px solid var(--accent-cyan); }
  .corners.tr-corner { top: 6px; right: 6px; border-right: 1px solid var(--accent-cyan); border-top: 1px solid var(--accent-cyan); }
  .corners.bl-corner { bottom: 6px; left: 6px; border-left: 1px solid var(--accent-cyan); border-bottom: 1px solid var(--accent-cyan); }
  .corners.br-corner { bottom: 6px; right: 6px; border-right: 1px solid var(--accent-cyan); border-bottom: 1px solid var(--accent-cyan); }

  :global(.maplibregl-popup-content) { padding: 0 !important; background: transparent !important; box-shadow: none !important; border-radius: 0 !important; }
  :global(.maplibregl-popup-tip) { display: none !important; }
  :global(.maplibregl-ctrl-group) { background: #0a0d12 !important; border: 1px solid #1a242e !important; border-radius: 0 !important; }
  :global(.maplibregl-ctrl-group button) { background: transparent !important; border-bottom: 1px solid #1a242e !important; }
  :global(.maplibregl-ctrl-group button span) { filter: invert(1) hue-rotate(180deg); }
  :global(.maplibregl-ctrl-scale) {
    background: rgba(5,6,8,0.9) !important; border-color: #2a3844 !important;
    color: #00f0ff !important; font-family: 'JetBrains Mono', monospace !important;
    font-size: 9px !important; letter-spacing: 0.1em !important;
  }
</style>
