<script lang="ts">
  import { onMount } from 'svelte';
  import { system } from '../../stores/systemStore.svelte';
  import { IAF_BASES } from '../../data/bases';
  import { WEAPONS } from '../../data/weapons';
  import ModelViewer3D from './ModelViewer3D.svelte';
  import { MODEL_MAP } from '../../three/modelAssets';
  import { phaseDuration, progressFraction } from '../../engine/missionExecutor';

  let { entityType, entityId, missionId, force2d = false }: { entityType: 'aircraft' | 'missile'; entityId: string; missionId: string; force2d?: boolean } = $props();
  let mission = $derived(system.missions.find((item) => item.id === missionId) ?? system.missions.find((item) => item.name.toLowerCase().includes(entityId.toLowerCase())) ?? null);
  let activeMission = $derived(system.activeMissions.find((item) => item.missionId === mission?.id) ?? null);
  let aircraft = $derived(system.aircraft.find((item) => item.id === entityId || item.tailNumber.toLowerCase() === entityId.toLowerCase()) ?? system.aircraft.find((item) => activeMission?.aircraftIds.includes(item.id)) ?? null);
  let origin = $derived(IAF_BASES.find((base) => [base.id, base.code, base.name].some((value) => value.toLowerCase() === (aircraft?.base ?? '').toLowerCase())) ?? (aircraft ? { lat: aircraft.position.lat, lng: aircraft.position.lng, name: aircraft.base } : null));
  let weapon = $derived(Object.values(WEAPONS).find((item) => item.id === activeMission?.weaponId || item.name === activeMission?.weaponId) ?? null);
  const path = 'M26 156 C82 149 104 116 150 112 C190 108 192 68 228 66 C268 64 279 33 316 28';
  const aircraftLabel = $derived(aircraft?.tailNumber ?? entityId.toUpperCase());
  const eta = $derived(activeMission ? `${Math.max(1, Math.round((1 - activeMission.progress) * 22))} MIN` : '—');
  const liveProgress = $derived(activeMission ? progressFraction(activeMission.phase, Math.max(0, (Date.now() - activeMission.phaseStartTime) / 60000), phaseDuration(activeMission.phase, system.activeExperience === 'training')) : null);
  const trackPosition = $derived(activeMission ? (() => { const point = activeMission.positions[aircraft?.id ?? ''] ?? aircraft?.position; return point ? `${point.lat.toFixed(2)}N ${point.lng.toFixed(2)}E` : null; })() : null);
  const modelDesignation = $derived(entityType === 'missile' ? weapon?.name ?? activeMission?.weaponId ?? 'BrahMos-A' : aircraft?.type ?? '');
  const modelPath = $derived(MODEL_MAP[modelDesignation] ?? null);
  let viewer3D = $state(!force2d);
  let modelFailed = $state(false);
  onMount(() => {
    if (!force2d) { try { viewer3D = localStorage.getItem('aircommand.arcViewerMode') !== '2d'; } catch { viewer3D = true; } }
  });
  $effect(() => { modelPath; modelFailed = false; if (force2d) viewer3D = false; });
  function toggleViewer(mode: '2d' | '3d') {
    viewer3D = mode === '3d';
    try { localStorage.setItem('aircommand.arcViewerMode', mode); } catch { /* storage is optional */ }
  }
</script>

<section class="arc-viewer" aria-label="Mission trajectory viewer">
  <div class="entity-head"><b>{entityType === 'missile' ? 'WEAPON TRACK' : 'AIRCRAFT TRACK'} · {aircraftLabel}</b><span>{activeMission?.phase ?? aircraft?.status ?? 'STAGED'}</span>{#if !force2d}<div class="viewer-toggle" aria-label="Trajectory viewer mode"><button class:active={!viewer3D || !modelPath || modelFailed} onclick={() => toggleViewer('2d')}>2D</button><button class:active={viewer3D && !!modelPath && !modelFailed} disabled={!modelPath || modelFailed} onclick={() => toggleViewer('3d')}>3D</button></div>{/if}</div>
  {#if !force2d && viewer3D && modelPath && !modelFailed}
    <ModelViewer3D modelPath={modelPath} designation={modelDesignation} {entityType} trajectory={activeMission?.phase?.toLowerCase() as 'ingress' | 'wez' | 'release' | 'egress' | null} fuel={aircraft ? `${aircraft.fuel}%` : '—'} {eta} {liveProgress} {trackPosition} onLoadError={() => modelFailed = true} />
  {:else}
  <svg viewBox="0 0 340 200" role="img" aria-label="Mission arc from {origin?.name ?? 'origin'} through engagement zone to {mission?.name ?? 'target'}">
    <path class="arc-bg" d={path} />
    <path class="ingress" d="M26 156 C82 149 104 116 150 112" />
    <path class="wez" d="M150 112 C190 108 192 68 228 66" />
    <path class="release" d="M228 66 C268 64 279 33 316 28" />
    <path class="egress" d="M316 28 C279 33 268 64 228 66" />
    <circle class="waypoint" cx="26" cy="156" r="4" /><circle class="waypoint" cx="150" cy="112" r="4" />
    <circle class="target" cx="316" cy="28" r="7" />
    <text x="20" y="180">{origin?.code ?? 'ORIGIN'}</text><text x="122" y="137">WEZ</text>
    <text x="258" y="18">{mission?.name?.slice(0, 14) ?? 'TARGET'}</text>
    <circle class="traveler" r="4"><animateMotion dur="6s" repeatCount="indefinite" path={path} /></circle>
  </svg>
  {/if}
  <div class="legend"><span>INGRESS</span><span>WEZ</span><span>RELEASE</span><span>EGRESS</span></div>
  <div class="data-card"><span><b>{aircraft?.type ?? entityType.toUpperCase()}</b><small>{weapon?.name ?? activeMission?.weaponId ?? 'NO WEAPON ASSIGNED'}</small></span><span>FUEL <b>{aircraft ? `${aircraft.fuel}%` : '—'}</b></span><span>ETA <b>{eta}</b></span></div>
</section>

<style>
  .arc-viewer{margin:8px 10px 4px;padding:8px;border:1px solid var(--accent-cyan);color:var(--text-primary);font-family:var(--font-mono);position:relative;background:var(--bg-base)}
  .arc-viewer:before,.arc-viewer:after{content:"";position:absolute;width:8px;height:8px;border-color:var(--accent-cyan);border-style:solid}.arc-viewer:before{left:-1px;top:-1px;border-width:1px 0 0 1px}.arc-viewer:after{right:-1px;bottom:-1px;border-width:0 1px 1px 0}
  .entity-head{display:flex;align-items:center;justify-content:space-between;gap:5px;color:var(--accent-cyan);font-size:7px;letter-spacing:.07em}.entity-head>span{color:var(--accent-amber)}
  .viewer-toggle{display:flex;gap:3px}.viewer-toggle button{border:1px solid var(--border-strong);background:transparent;color:var(--text-muted);font:7px var(--font-mono);padding:3px 5px;cursor:pointer}.viewer-toggle button.active{border-color:var(--accent-cyan);color:var(--accent-cyan)}.viewer-toggle button:disabled{opacity:.4;cursor:not-allowed}
  svg{width:100%;height:auto;display:block;margin-top:3px}.arc-bg{fill:none;stroke:var(--border-strong);stroke-width:1.3;stroke-dasharray:2 4}.ingress,.wez,.release,.egress{fill:none;stroke-width:3;stroke-linecap:round}.ingress{stroke:var(--accent-cyan)}.wez{stroke:var(--accent-amber)}.release{stroke:var(--accent-red)}.egress{stroke:var(--accent-green)}
  .waypoint{fill:var(--bg-base);stroke:var(--accent-cyan);stroke-width:2}.target{fill:var(--accent-red);stroke:var(--text-primary);stroke-width:1.5}text{fill:var(--text-muted);font:7px var(--font-mono)}.traveler{fill:var(--text-primary);stroke:var(--accent-cyan);stroke-width:2}
  .legend{display:flex;justify-content:space-between;color:var(--text-muted);font-size:6px;letter-spacing:.05em}.data-card{display:flex;justify-content:space-between;gap:6px;border-top:1px solid var(--border-subtle);padding-top:6px;margin-top:5px;font-size:7px;color:var(--text-muted)}.data-card span{display:grid;gap:3px}.data-card b{color:var(--text-primary);font-size:8px}.data-card small{color:var(--accent-amber);font-size:6px}
</style>

