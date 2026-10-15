<script lang="ts">
  import { WEAPONS } from '../../data/weapons';
  import { system } from '../../stores/systemStore.svelte';
  import { MODEL_MAP } from '../../three/modelAssets';
  import ModelViewer3D from '../rail/ModelViewer3D.svelte';
  import ArcViewer from '../rail/ArcViewer.svelte';

  let { weaponId, onClose }: { weaponId: string; onClose: () => void } = $props();
  const weapon = $derived(WEAPONS[weaponId] ?? Object.values(WEAPONS).find((item) => item.name === weaponId) ?? null);
  const modelPath = $derived(weapon ? MODEL_MAP[weapon.name] ?? null : null);
  let modelFailed = $state(false);
  $effect(() => { weaponId; modelFailed = false; });
  function openPlatform(platform: string) {
    const aircraft = system.aircraft.find((item) => item.type === platform);
    window.dispatchEvent(new CustomEvent('aircommand:entity-detail', { detail: { type: 'aircraft', id: aircraft?.id ?? platform } }));
  }
</script>

<section class="weapon-detail" aria-label="Weapon specification">
  <header><button class="back" onclick={onClose}>← BACK</button><span>WEAPON SPEC</span></header>
  {#if weapon}
    <div class="weapon-model" aria-label={`${weapon.name} visual specification`}>
      {#if modelPath && !modelFailed}
        <ModelViewer3D modelPath={modelPath} designation={weapon.name} entityType="missile" trajectory={null} size={220} onLoadError={() => modelFailed = true} />
      {:else if modelPath}
        <ArcViewer entityType="missile" entityId={weapon.name} missionId="" force2d={true} />
      {:else}
        <div class="glyph" aria-hidden="true">⌖</div>
      {/if}
    </div>
    <h2>{weapon.name}</h2>
    <dl>
      <div><dt>ROLE</dt><dd>{weapon.domain.toUpperCase()}</dd></div>
      <div><dt>GUIDANCE</dt><dd>{weapon.guidance.toUpperCase()}</dd></div>
      <div><dt>MAX RANGE</dt><dd>{weapon.rangeKm} KM</dd></div>
      <div><dt>MIN RANGE</dt><dd>{weapon.minRangeKm} KM</dd></div>
      <div><dt>SPEED</dt><dd>MACH {weapon.speedMach}</dd></div>
      <div><dt>WARHEAD</dt><dd>{weapon.warheadKg == null ? 'UNVERIFIED' : `${weapon.warheadKg} KG`}</dd></div>
      <div><dt>CEP</dt><dd>{weapon.cepMeters == null ? 'UNVERIFIED' : `${weapon.cepMeters} M`}</dd></div>
      <div><dt>PLATFORMS</dt><dd class="platforms">{#each weapon.platforms as platform (platform)}<button onclick={() => openPlatform(platform)}>{platform}</button>{/each}</dd></div>
    </dl>
    <p title={weapon.notes}>ⓘ <span>{weapon.notes.length > 25 ? `${weapon.notes.slice(0, 22)}…` : weapon.notes}</span></p>
  {:else}
    <p>Specification unavailable.</p>
  {/if}
</section>

<style>
  .weapon-detail{height:100%;overflow:auto;padding:10px;color:var(--text-primary);font-family:var(--font-mono);font-size:10px}
  .weapon-model{min-height:170px;display:grid;place-items:center;overflow:hidden}.weapon-model :global(.model-viewer){width:100%;max-width:100%}.weapon-model :global(.arc-viewer){width:100%;margin:0}
  header{display:flex;align-items:center;justify-content:space-between;padding-bottom:9px;border-bottom:1px solid var(--border-subtle);color:var(--accent-cyan);font-size:8px;letter-spacing:.14em}
  .back{padding:6px 8px;border:1px solid var(--border-strong);background:transparent;color:var(--accent-cyan);font:8px var(--font-mono);cursor:pointer}
  .glyph{display:grid;place-items:center;width:44px;height:44px;margin:15px auto 7px;border:1px solid var(--accent-cyan);border-radius:50%;color:var(--accent-cyan);font-size:23px}
  h2{margin:6px 0 12px;text-align:center;font-size:14px;color:var(--text-primary)}
  dl{display:grid;gap:0;margin:9px 0}dl div{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-subtle)}
  dt{color:var(--text-muted);font-size:8px}dd{margin:0;text-align:right;color:var(--accent-cyan)}
  dd.platforms{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px}dd.platforms button{padding:2px 4px;border:1px solid var(--border-subtle);background:transparent;color:var(--accent-cyan);font:8px var(--font-mono);cursor:pointer}dd.platforms button:hover{border-color:var(--accent-cyan)}
  p{display:flex;gap:6px;align-items:flex-start;margin-top:12px;color:var(--accent-amber);font-size:8px;line-height:1.5}p span{color:var(--text-secondary)}
</style>
