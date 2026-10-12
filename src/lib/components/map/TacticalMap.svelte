<script lang="ts">
  import { onMount } from 'svelte';
  import maplibregl from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  let container: HTMLDivElement;
  const MAP_STYLE = {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      'carto-dark': {
        type: 'raster',
        tiles: [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap © CARTO'
      }
    },
    layers: [{ id: 'bg', type: 'raster', source: 'carto-dark' }]
  };

  onMount(() => {
    const map = new maplibregl.Map({
      container,
      style: MAP_STYLE,
      center: [79, 31],
      zoom: 4.2
    });
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 80, unit: 'metric' }), 'bottom-left');
    const canvas = map.getCanvas();
    console.log('Map canvas dimensions:', canvas.width, canvas.height);
  });
</script>

<style>
  .map-container {
    width: 100%;
    height: 100%;
  }
</style>

<div bind:this={container} class="map-container"></div>
