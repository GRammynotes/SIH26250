<script lang="ts">
  import { onMount } from 'svelte';
  import { Canvas } from '@threlte/core';
  import { WebGLRenderer, type Group } from 'three';
  import ModelScene from './ModelScene.svelte';
  import { createModelInstance, loadModelAsset, type ModelAsset } from '../../three/modelAssets';
  import { system } from '../../stores/systemStore.svelte';

  let { modelPath, designation, entityType, trajectory, fuel = '—', eta = '—', onClose }: {
    modelPath: string;
    designation: string;
    entityType: 'aircraft' | 'missile' | 'ground';
    trajectory: 'ingress' | 'wez' | 'release' | 'egress' | null;
    fuel?: string;
    eta?: string;
    onClose?: () => void;
  } = $props();

  let modelInstance = $state<Group | null>(null);
  let rotationOffset = $state(0);
  let resetKey = $state(0);
  let interacting = $state(false);
  let ownsFocus = false;
  let interactionTimer: ReturnType<typeof setTimeout> | undefined;
  const createRenderer = (canvas: HTMLCanvasElement) => new WebGLRenderer({ canvas, alpha: true, antialias: true });

  $effect(() => {
    let cancelled = false;
    modelInstance = null;
    void loadModelAsset(modelPath).then((asset: ModelAsset) => {
      if (!cancelled) modelInstance = createModelInstance(asset);
    });
    return () => { cancelled = true; };
  });

  function markInteraction() {
    interacting = true;
    if (interactionTimer) clearTimeout(interactionTimer);
    interactionTimer = setTimeout(() => interacting = false, 1100);
  }

  function close() { onClose?.(); }

  onMount(() => {
    const activeMission = system.activeMissions.find((mission) => !['COMPLETE', 'ABORTED'].includes(mission.phase));
    if (!system.focusMode?.active && activeMission) {
      system.enterFocusMode(activeMission.missionId);
      ownsFocus = true;
    }
    window.dispatchEvent(new CustomEvent('aircommand:focus-lock', { detail: true }));
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    };
    window.addEventListener('keydown', onKeydown);
    return () => {
      if (interactionTimer) clearTimeout(interactionTimer);
      if (ownsFocus) system.exitFocusMode();
      window.dispatchEvent(new CustomEvent('aircommand:focus-lock', { detail: false }));
      window.removeEventListener('keydown', onKeydown);
    };
  });
</script>

<section class="overlay" role="dialog" aria-modal="true" aria-label={`${designation} 3D focus view`} onpointerdown={markInteraction} onwheel={markInteraction}>
  <div class="frame" onclick={(event) => event.stopPropagation()} role="presentation">
    <header>
      <span>◈ ENTITY FOCUS · {entityType.toUpperCase()}</span>
      <div class="header-actions"><button onclick={() => rotationOffset -= Math.PI / 12} title="Rotate 15 degrees left">◀</button><button onclick={() => rotationOffset += Math.PI / 12} title="Rotate 15 degrees right">▶</button><button onclick={() => { rotationOffset = 0; resetKey += 1; }} title="Reset view">↻</button><button onclick={close} title="Shrink to embedded view">⛶ SHRINK</button><button onclick={close} class="close" aria-label="Close 3D focus view">×</button></div>
    </header>
    <main>
      <div class="canvas-wrap" onpointerdown={markInteraction} onpointerup={markInteraction}>
        {#if modelInstance}
          {#key resetKey}
            <Canvas {createRenderer} dpr={[1, 1.5]}>
              <ModelScene {modelInstance} {trajectory} interactive autoRotate={!interacting} {rotationOffset} />
            </Canvas>
          {/key}
        {:else}<div class="loading">LOADING LOCAL MODEL…</div>{/if}
        <span class="gesture">DRAG ROTATE · SCROLL ZOOM · RIGHT-DRAG PAN</span>
      </div>
      <aside>
        <span class="eyebrow">LOCAL 3D ASSET</span>
        <h2>{designation}</h2>
        <dl><div><dt>TYPE</dt><dd>{entityType.toUpperCase()}</dd></div><div><dt>STATE</dt><dd>{trajectory?.toUpperCase() ?? 'STAGED'}</dd></div><div><dt>FUEL</dt><dd>{fuel}</dd></div><div><dt>ETA</dt><dd>{eta}</dd></div></dl>
        <p>{interacting ? 'MANUAL VIEW CONTROL' : 'AUTO ROTATE ACTIVE'}</p>
      </aside>
    </main>
  </div>
</section>

<style>
  .overlay{position:fixed;inset:0;z-index:700;display:grid;place-items:center;padding:7vh 8vw;background:rgba(5,8,15,.8);backdrop-filter:blur(4px);font-family:var(--font-mono);box-sizing:border-box}
  .frame{width:min(1180px,84vw);height:min(690px,82vh);display:flex;flex-direction:column;border:1px solid var(--accent-cyan);background:var(--bg-panel);box-shadow:0 20px 70px rgba(0,0,0,.65)}
  header{display:flex;justify-content:space-between;align-items:center;padding:9px 11px;border-bottom:1px solid var(--border-subtle);color:var(--accent-cyan);font-size:9px;letter-spacing:.12em}.header-actions{display:flex;gap:5px}.header-actions button{border:1px solid var(--border-strong);background:transparent;color:var(--text-secondary);padding:5px 7px;font:8px var(--font-mono);cursor:pointer}.header-actions button:hover{color:var(--accent-cyan);border-color:var(--accent-cyan)}.header-actions .close{font-size:15px;line-height:8px}
  main{min-height:0;flex:1;display:grid;grid-template-columns:minmax(0,3fr) minmax(230px,1fr)}.canvas-wrap{position:relative;min-height:0;background:radial-gradient(ellipse at center,rgba(0,212,255,.07),transparent 64%);overflow:hidden}.canvas-wrap :global(canvas){background:transparent!important}.loading{position:absolute;inset:0;display:grid;place-items:center;color:var(--accent-cyan);font-size:10px;letter-spacing:.12em}.gesture{position:absolute;bottom:12px;left:14px;color:var(--text-muted);font-size:7px;letter-spacing:.1em;pointer-events:none}
  aside{padding:22px 18px;border-left:1px solid var(--border-subtle);background:var(--bg-elevated);color:var(--text-secondary)}.eyebrow{color:var(--accent-cyan);font-size:8px;letter-spacing:.12em}h2{margin:9px 0 25px;color:var(--text-primary);font-size:16px;letter-spacing:.06em}dl{margin:0;display:grid;gap:12px}dl div{display:flex;justify-content:space-between;gap:12px;padding-bottom:8px;border-bottom:1px solid var(--border-subtle)}dt{color:var(--text-muted);font-size:8px;letter-spacing:.1em}dd{margin:0;color:var(--accent-cyan);font-size:9px}p{margin-top:24px;color:var(--accent-amber);font-size:8px;letter-spacing:.1em}
  @media(max-width:700px){.overlay{padding:3vh 3vw}.frame{width:94vw;height:90vh}main{grid-template-columns:1fr;grid-template-rows:1fr auto}aside{border-left:0;border-top:1px solid var(--border-subtle);padding:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px}aside h2{margin:4px 0}aside p{margin:4px 0}.header-actions button:nth-child(4){display:none}}
</style>
