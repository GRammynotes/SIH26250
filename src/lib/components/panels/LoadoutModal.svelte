<script lang="ts">
  import { WEAPONS } from '../../data/weapons';
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
  const stationWeaponId = $derived(aircraftType === 'Rafale' ? 'meteor' : aircraftType === 'Tejas' ? 'astra-mk1' : aircraftType === 'Mirage-2000' ? 'mica-rf' : 'r-77');
  const stationWeapon = $derived(WEAPONS[stationWeaponId]);
  let selectedStation = $state(false);
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
        {#if diagram}
          <img src={diagram} alt={`${aircraftType} loadout`} loading="lazy" decoding="async" />
          <button class="station" class:selected={selectedStation} onclick={() => selectedStation = !selectedStation} aria-expanded={selectedStation}>
            <span>ST05 · {stationWeapon.name.toUpperCase()}</span><span>VIEW SPEC ↗</span>
          </button>
          {#if selectedStation}
            <section class="weapon-card" aria-label="Weapon specification">
              <header><strong>WEAPON</strong><strong>RANGE</strong><strong>CEP</strong><strong>WARHEAD</strong><strong>TARGET TYPES</strong></header>
              <div><span>{stationWeapon.name}</span><span>{stationWeapon.rangeKm} km</span><span>{stationWeapon.cepMeters ?? 'UNVERIFIED'}</span><span>{stationWeapon.warheadKg ?? 'UNVERIFIED'}</span><span>{stationWeapon.targetTypes.join(', ')}</span></div>
            </section>
          {/if}
        {:else}
          <div class="empty">
            <div class="empty-label">DIAGRAM PENDING</div>
            <div class="empty-msg">No reference loadout graphic is available for {aircraftType}. The platform remains available to the weaponeering engine.</div>
          </div>
        {/if}
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
    width: min(900px, 94vw);
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
    padding: 16px;
    overflow: auto;
    background: var(--bg-base);
    display: grid; place-items: center;
    gap: 12px;
  }
  .body img { display: block; width: 100%; height: auto; max-height: 62vh; object-fit: contain; }
  .station { display:flex; justify-content:space-between; width:min(100%,700px); padding:9px 12px; color:var(--text-secondary); background:transparent; border:1px dashed var(--accent-cyan); font:9px var(--font-mono); cursor:pointer; }
  .station:hover,.station.selected { color:var(--accent-cyan); background:color-mix(in srgb, var(--accent-cyan) 8%, transparent); }
  .weapon-card { width:min(100%,700px); border:1px solid var(--accent-cyan); background:var(--bg-panel); font:9px/1.45 var(--font-mono); }
  .weapon-card header,.weapon-card>div { display:grid; grid-template-columns:1.3fr .7fr .5fr .8fr 1.5fr; gap:8px; padding:9px; }
  .weapon-card header { color:var(--accent-cyan); border-bottom:1px solid var(--border-subtle); }
  .weapon-card>div { color:var(--text-secondary); }

  .empty {
    padding: 40px;
    text-align: center;
    font-family: var(--font-mono);
  }
  .empty-label { color: var(--accent-amber); font-size: 11px; letter-spacing: 0.2em; margin-bottom: 10px; }
  .empty-msg { color: var(--text-muted); font-size: 11px; letter-spacing: 0.08em; line-height: 1.6; max-width: 420px; }
</style>

