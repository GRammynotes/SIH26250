<script lang="ts">
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

  // Only Su-30MKI has a loadout diagram so far
  const hasDiagram = $derived(aircraftType === 'Su-30MKI');
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
        {#if hasDiagram}
          <img src="/assets/su30mki_loadout_alpha.svg" alt="Su-30MKI Loadout" />
        {:else}
          <div class="empty">
            <div class="empty-label">NO DIAGRAM AVAILABLE</div>
            <div class="empty-msg">Loadout diagrams are available for Su-30MKI. {aircraftType} uses the same weaponeering engine but has no graphic yet.</div>
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
    box-shadow: 0 0 60px rgba(0, 212, 255, 0.25);
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border-subtle);
    background: rgba(0, 212, 255, 0.03);
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
    background: #05080f;
    display: grid; place-items: center;
  }
  .body img { display: block; width: 100%; height: auto; max-height: 76vh; object-fit: contain; }

  .empty {
    padding: 40px;
    text-align: center;
    font-family: var(--font-mono);
  }
  .empty-label { color: var(--accent-amber); font-size: 11px; letter-spacing: 0.2em; margin-bottom: 10px; }
  .empty-msg { color: var(--text-muted); font-size: 11px; letter-spacing: 0.08em; line-height: 1.6; max-width: 420px; }
</style>
