<script lang="ts">
  import { Canvas, T } from '@threlte/core';
  import { OrbitControls } from '@threlte/extras';
  import { WebGLRenderer, type Group } from 'three';
  import { createModelInstance, loadModelAsset, type ModelAsset } from '../../three/modelAssets';

  let { modelPath, designation }: { modelPath: string; designation: string } = $props();
  let modelInstance = $state<Group | null>(null);
  let loadFailed = $state(false);
  let loadGeneration = 0;
  const createRenderer = (canvas: HTMLCanvasElement) => new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });

  $effect(() => {
    const path = modelPath;
    const generation = ++loadGeneration;
    modelInstance = null;
    loadFailed = false;
    void loadModelAsset(path).then((asset: ModelAsset) => {
      if (generation === loadGeneration) modelInstance = createModelInstance(asset);
    }).catch(() => {
      if (generation === loadGeneration) loadFailed = true;
    });
    return () => { loadGeneration += 1; };
  });
</script>

<span class="model-thumb" role="img" title={designation} aria-label={`${designation} 3D thumbnail`}>
  {#if modelInstance && !loadFailed}
    <Canvas {createRenderer} dpr={[1, 1]}>
      <T.PerspectiveCamera makeDefault position={[0, 1.2, 6]} fov={36} />
      <T.AmbientLight intensity={0.45} />
      <T.DirectionalLight position={[5, 8, 6]} intensity={1.15} color="#ffb800" />
      <T.DirectionalLight position={[-5, 4, -4]} intensity={0.35} color="#00d4ff" />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
      <T.Group>
        <T is={modelInstance} />
      </T.Group>
    </Canvas>
  {:else}
    <span class="fallback" aria-hidden="true">✈</span>
  {/if}
</span>

<style>
  .model-thumb{display:grid;place-items:center;width:40px;height:32px;overflow:hidden;border:1px solid var(--border-subtle);background:transparent;color:var(--accent-cyan)}
  .model-thumb :global(canvas){display:block;width:100%;height:100%;background:transparent!important}
  .fallback{font-size:17px}
</style>
