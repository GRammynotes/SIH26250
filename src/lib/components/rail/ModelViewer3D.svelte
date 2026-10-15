<script lang="ts">
  import { onMount } from 'svelte';
  import { Canvas } from '@threlte/core';
  import { WebGLRenderer, type Group } from 'three';
  import ModelScene from './ModelScene.svelte';
  import ModelExpandView from './ModelExpandView.svelte';
  import { createModelInstance, loadModelAsset, type ModelAsset } from '../../three/modelAssets';

  let {
    modelPath,
    designation,
    entityType,
    trajectory,
    size = 380,
    fuel = '—',
    eta = '—',
    onLoadError,
  }: {
    modelPath: string;
    designation: string;
    entityType: 'aircraft' | 'missile' | 'ground';
    trajectory: 'ingress' | 'wez' | 'release' | 'egress' | null;
    size?: number;
    fuel?: string;
    eta?: string;
    onLoadError?: () => void;
  } = $props();

  let modelInstance = $state<Group | null>(null);
  let host: HTMLDivElement;
  let observer: ResizeObserver | undefined;
  let width = $state(0);
  let loadGeneration = 0;
  let expanded = $state(false);
  const createRenderer = (canvas: HTMLCanvasElement) => new WebGLRenderer({ canvas, alpha: true, antialias: true });

  $effect(() => {
    const path = modelPath;
    const generation = ++loadGeneration;
    modelInstance = null;
    void loadModelAsset(path).then((asset: ModelAsset) => {
      if (generation === loadGeneration) modelInstance = createModelInstance(asset);
    }).catch(() => {
      if (generation === loadGeneration) onLoadError?.();
    });
    return () => { loadGeneration += 1; };
  });

  onMount(() => {
    const probe = document.createElement('canvas');
    const webgl = probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (!webgl) onLoadError?.();
    else webgl.getExtension('WEBGL_lose_context')?.loseContext();
    observer = new ResizeObserver(([entry]) => { width = entry.contentRect.width; });
    observer.observe(host);
    return () => observer?.disconnect();
  });
</script>

<div class="model-viewer" bind:this={host} style={`height:${size}px;--model-width:${width}px`}>
  {#if modelInstance}
    <Canvas {createRenderer} dpr={[1, 1.5]}>
      <ModelScene {modelInstance} {trajectory} />
    </Canvas>
  {:else}
    <div class="loading" aria-label={`Loading ${designation} 3D model`}>LOADING LOCAL MODEL…</div>
  {/if}
  <span class="designation">{designation} · {entityType.toUpperCase()}</span>
  <button class="expand" onclick={() => expanded = true} title={`Expand ${designation} 3D view`}>⛶ EXPAND</button>
  <div class="status-chips"><span>{trajectory?.toUpperCase() ?? 'STAGED'}</span><span>FUEL {fuel}</span><span>ETA {eta}</span></div>
</div>

{#if expanded}<ModelExpandView {modelPath} {designation} {entityType} {trajectory} {fuel} {eta} onClose={() => expanded = false} />{/if}

<style>
  .model-viewer{position:relative;width:100%;overflow:hidden;background:transparent;min-height:180px;isolation:isolate}
  :global(.model-viewer canvas){background:transparent!important}
  .designation{position:absolute;top:8px;left:9px;color:var(--accent-cyan);font:10px var(--font-mono);letter-spacing:.08em;pointer-events:none}
  .expand{position:absolute;top:7px;right:8px;padding:4px 6px;border:1px solid var(--border-strong);background:rgba(5,8,15,.72);color:var(--accent-cyan);font:7px var(--font-mono);letter-spacing:.06em;cursor:pointer}.expand:hover{border-color:var(--accent-cyan);background:color-mix(in srgb,var(--accent-cyan) 12%,transparent)}
  .status-chips{position:absolute;right:8px;bottom:7px;display:flex;gap:4px;pointer-events:none}
  .status-chips span{border:1px solid var(--border-strong);background:rgba(5,8,15,.72);padding:3px 5px;color:var(--text-muted);font:7px var(--font-mono)}
  .loading{position:absolute;inset:0;display:grid;place-items:center;color:var(--accent-cyan);font:9px var(--font-mono);letter-spacing:.08em}
</style>
