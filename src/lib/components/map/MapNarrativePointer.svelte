<script lang="ts">
  import { onMount } from 'svelte';
  import type maplibregl from 'maplibre-gl';
  import type { NarrativeMarker } from '../../engine/mapNarrative';
  let { map }: { map: maplibregl.Map } = $props();
  type PositionedMarker = NarrativeMarker & { x: number; y: number };
  let markers = $state<PositionedMarker[]>([]);
  let timer: number | undefined;
  let refreshFrame = 0;
  let plainText = $state('');

  onMount(() => {
    const refresh = () => {
      if (refreshFrame) cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => {
        const bounds = map.getContainer().getBoundingClientRect();
        markers = markers.map((marker) => {
          const point = map.project([marker.lng, marker.lat]);
          return { ...marker, x: point.x, y: point.y };
        }).filter((marker) => marker.x >= 0 && marker.y >= 0 && marker.x <= bounds.width && marker.y <= bounds.height);
      });
    };
    const receive = (event: Event) => {
      const detail = (event as CustomEvent<{ markers: NarrativeMarker[]; text: string; duration: number }>).detail;
      plainText = detail.text;
      markers = detail.markers.map((marker) => ({ ...marker, ...map.project([marker.lng, marker.lat]) }));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { markers = []; plainText = ''; }, Math.min(3000, detail.duration || 3000));
      refresh();
    };
    window.addEventListener('aircommand:map-narrative-markers', receive);
    window.addEventListener('aircommand:focus-clear', () => { markers = []; plainText = ''; window.clearTimeout(timer); });
    map.on('move', refresh);
    window.addEventListener('resize', refresh);
    return () => { window.removeEventListener('aircommand:map-narrative-markers', receive); map.off('move', refresh); window.removeEventListener('resize', refresh); window.clearTimeout(timer); cancelAnimationFrame(refreshFrame); };
  });
</script>

{#if markers.length}
  <svg class="narrative-pointer" aria-hidden="true">
    <defs><marker id="narrative-arrowhead" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="var(--accent-cyan)" /></marker></defs>
    {#each markers as marker (marker.id + marker.kind)}
      <line x1="100%" y1="50%" x2={marker.x} y2={marker.y} marker-end="url(#narrative-arrowhead)" />
      <circle cx={marker.x} cy={marker.y} r="18" />
      <circle class="core" cx={marker.x} cy={marker.y} r="3" />
      <text x={Math.min(marker.x + 20, 800)} y={Math.max(14, marker.y - 22)}>{marker.kind.toUpperCase()} · {marker.label}</text>
    {/each}
    <title>{plainText}</title>
  </svg>
{/if}

<style>
  .narrative-pointer { position:absolute; inset:0; z-index:25; width:100%; height:100%; overflow:visible; pointer-events:none; }
  line { stroke:var(--accent-cyan); stroke-width:1; opacity:.8; }
  circle { fill:none; stroke:var(--accent-cyan); stroke-width:2; stroke-dasharray:5 4; animation:target-ring 1.1s linear infinite; }
  circle.core { fill:var(--accent-cyan); stroke:none; }
  text { fill:var(--accent-cyan); font:8px var(--font-mono); paint-order:stroke; stroke:rgba(5,8,15,.94); stroke-width:3px; }
  @keyframes target-ring { to { stroke-dashoffset:-18; } }
</style>
