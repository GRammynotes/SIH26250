<script lang="ts">
  import { WEAPONS } from '../../data/weapons';
  import ModelViewer3D from '../rail/ModelViewer3D.svelte';
  import ArcViewer from '../rail/ArcViewer.svelte';
  import { MODEL_MAP } from '../../three/modelAssets';
  let {
    open = false,
    aircraftType = 'Su-30MKI',
    tailNumber = '',
    onClose,
  }: {
    open?: boolean;
    aircraftType?: string;
    tailNumber?: string;
    onClose?: () => void;
  } = $props();

  const LOADOUT_MAP: Record<string, string> = {
    'Su-30MKI': '/assets/su30mki_loadout_alpha.svg',
    'Rafale': '/assets/rafale_loadout_bravo.svg',
    'Mirage-2000': '/assets/mirage2000_loadout_charlie.svg',
    'Tejas': '/assets/tejas_loadout_delta.svg',
    'Jaguar': '/assets/jaguar_loadout_echo.svg',
    'MiG-29UPG': '/assets/mig29_loadout_foxtrot.svg',
  };

  const diagram = $derived(LOADOUT_MAP[aircraftType] ?? null);
  const modelPath = $derived(MODEL_MAP[aircraftType] ?? null);
  const stationWeaponId = $derived(aircraftType === 'Rafale' ? 'meteor' : aircraftType === 'Tejas' ? 'astra-mk1' : aircraftType === 'Mirage-2000' ? 'mica-rf' : 'r-77');
  const stationWeapon = $derived(WEAPONS[stationWeaponId]);
  let selectedStation = $state(false);
  let modelFailed = $state(false);
  $effect(() => { aircraftType; modelFailed = false; selectedStation = false; });
</script>

{#if open}
  <div class="overlay" onclick={(e) => e.target === e.currentTarget && onClose?.()}>
    <div class="frame">
      <header>
        <div>
          <span class="eyebrow">WEAPON LOADOUT · {tailNumber}</span>
          <h2>{aircraftType.toUpperCase()} · ALPHA CONFIG</h2>
        </div>
        <button onclick={() => onClose?.()} aria-label="Close">×</button>
      </header>
      <div class="body">
        <div class="loadout-split">
          <section class="diagram-pane" aria-label="2D loadout diagram">
            {#if diagram}
              <img src={diagram} alt={`${aircraftType} loadout`} loading="lazy" decoding="async" />
            {:else}
              <div class="empty">
                <div class="empty-label">DIAGRAM PENDING</div>
                <div class="empty-msg">No reference loadout graphic is available for {aircraftType}. The platform remains available to the weaponeering engine.</div>
              </div>
            {/if}
            <button class="station" class:selected={selectedStation} onclick={() => selectedStation = !selectedStation} aria-expanded={selectedStation}>
              <span>ST05 · {stationWeapon.name.toUpperCase()}</span><span>VIEW SPEC ↗</span>
            </button>
            {#if selectedStation}
              <section class="weapon-card" aria-label="Weapon specification">
                <header><strong>WEAPON</strong><strong>RANGE</strong><strong>CEP</strong><strong>WARHEAD</strong><strong>TARGET TYPES</strong></header>
                 <div><span>{stationWeapon.name}</span><span>{stationWeapon.rangeKm} km</span><span>{stationWeapon.cepMeters == null ? 'UNVERIFIED' : `${stationWeapon.cepMeters} m`}</span><span>{stationWeapon.warheadKg == null ? 'UNVERIFIED' : `${stationWeapon.warheadKg} kg`}</span><span>{stationWeapon.targetTypes.join(', ')}</span></div>
              </section>
            {/if}
          </section>
          <section class="model-pane" aria-label={`${aircraftType} model preview`}>
            {#if modelPath && !modelFailed}
              <ModelViewer3D modelPath={modelPath} designation={aircraftType} entityType="aircraft" trajectory={null} size={360} onLoadError={() => modelFailed = true} />
            {:else}
              <ArcViewer entityType="aircraft" entityId={tailNumber || aircraftType} missionId="" force2d={true} />
            {/if}
          </section>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(5, 8, 15, 0.92);
    backdrop-filter: blur(4px);
    display: grid; place-items: center;
    z-index: 200;
    animation: fadein 0.15s ease-out;
  }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

  .frame {
    width: min(1120px, 96vw);
    max-height: 92vh;
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    box-shadow: 0 0 60px color-mix(in srgb, var(--accent-cyan) 25%, transparent);
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--accent-cyan) 3%, transparent);
  }
  .eyebrow {
    display: block;
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: 0.22em; color: var(--accent-cyan);
    margin-bottom: 4px;
  }
  h2 {
    margin: 0;
    font-family: var(--font-mono); font-size: 14px;
    letter-spacing: 0.1em; color: var(--text-primary);
    font-weight: 500;
  }
  header button {
    background: transparent; border: 0;
    color: var(--text-muted); font-size: 22px; line-height: 1;
    cursor: pointer; padding: 0 6px;
  }
  header button:hover { color: var(--accent-red); }

  .body {
    flex: 1;
    min-height: 0;
    padding: 12px;
    overflow: auto;
    background: var(--bg-base);
  }
  .loadout-split { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); align-items:stretch; gap:12px; min-height:min(560px,68vh); }
  .diagram-pane,.model-pane { min-width:0; padding:8px; border:1px solid var(--border-subtle); background:var(--bg-panel); }
  .diagram-pane { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; }
  .model-pane { display:flex; align-items:center; justify-content:center; overflow:hidden; }
  .model-pane :global(.model-viewer) { width:100%; max-width:100%; }
  .model-pane :global(.arc-viewer) { width:100%; margin:0; }
  .diagram-pane img { display:block; width:100%; max-height:52vh; object-fit:contain; }
  .diagram-pane .empty { margin:auto; }
  .station { display:flex; justify-content:space-between; width:100%; padding:9px 12px; color:var(--text-secondary); background:transparent; border:1px dashed var(--accent-cyan); font:9px var(--font-mono); cursor:pointer; }
  .station:hover,.station.selected { color:var(--accent-cyan); background:color-mix(in srgb, var(--accent-cyan) 8%, transparent); }
  .weapon-card { width:100%; border:1px solid var(--accent-cyan); background:var(--bg-panel); font:9px/1.45 var(--font-mono); }
  .weapon-card header,.weapon-card>div { display:grid; grid-template-columns:1.3fr .7fr .5fr .8fr 1.5fr; gap:5px; padding:7px; }
  .weapon-card header { color:var(--accent-cyan); border-bottom:1px solid var(--border-subtle); }
  .weapon-card>div { color:var(--text-secondary); }

  .empty {
    padding: 40px;
    text-align: center;
    font-family: var(--font-mono);
  }
  .empty-label { color: var(--accent-amber); font-size: 11px; letter-spacing: 0.2em; margin-bottom: 10px; }
  .empty-msg { color: var(--text-muted); font-size: 11px; letter-spacing: 0.08em; line-height: 1.6; max-width: 420px; }
  @media(max-width:760px) { .loadout-split { grid-template-columns:minmax(0,1fr); } .model-pane { min-height:300px; } }
</style>

