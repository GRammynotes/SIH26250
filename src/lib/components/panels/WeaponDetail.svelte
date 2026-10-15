<script lang="ts">
  import { WEAPONS } from '../../data/weapons';

  let { weaponId, onClose }: { weaponId: string; onClose: () => void } = $props();
  const weapon = $derived(WEAPONS[weaponId] ?? Object.values(WEAPONS).find((item) => item.name === weaponId) ?? null);
</script>

<section class="weapon-detail" aria-label="Weapon specification">
  <header><button class="back" onclick={onClose}>← BACK</button><span>WEAPON SPEC</span></header>
  {#if weapon}
    <div class="glyph" aria-hidden="true">⌖</div>
    <h2>{weapon.name}</h2>
    <dl>
      <div><dt>ROLE</dt><dd>{weapon.domain.toUpperCase()}</dd></div>
      <div><dt>GUIDANCE</dt><dd>{weapon.guidance.toUpperCase()}</dd></div>
      <div><dt>MAX RANGE</dt><dd>{weapon.rangeKm} KM</dd></div>
      <div><dt>MIN RANGE</dt><dd>{weapon.minRangeKm} KM</dd></div>
      <div><dt>SPEED</dt><dd>MACH {weapon.speedMach}</dd></div>
      <div><dt>WARHEAD</dt><dd>{weapon.warheadKg === null ? 'UNVERIFIED' : `${weapon.warheadKg} KG`}</dd></div>
      <div><dt>CEP</dt><dd>{weapon.cepMeters === null ? 'UNVERIFIED' : `${weapon.cepMeters} M`}</dd></div>
      <div><dt>PLATFORMS</dt><dd>{weapon.platforms.join(' · ')}</dd></div>
    </dl>
    <p title={weapon.notes}>ⓘ <span>{weapon.notes.length > 40 ? `${weapon.notes.slice(0, 37)}…` : weapon.notes}</span></p>
  {:else}
    <p>Specification unavailable.</p>
  {/if}
</section>

<style>
  .weapon-detail{height:100%;overflow:auto;padding:10px;color:var(--text-primary);font-family:var(--font-mono);font-size:10px}
  header{display:flex;align-items:center;justify-content:space-between;padding-bottom:9px;border-bottom:1px solid var(--border-subtle);color:var(--accent-cyan);font-size:8px;letter-spacing:.14em}
  .back{padding:6px 8px;border:1px solid var(--border-strong);background:transparent;color:var(--accent-cyan);font:8px var(--font-mono);cursor:pointer}
  .glyph{display:grid;place-items:center;width:44px;height:44px;margin:15px auto 7px;border:1px solid var(--accent-cyan);border-radius:50%;color:var(--accent-cyan);font-size:23px}
  h2{margin:6px 0 12px;text-align:center;font-size:14px;color:var(--text-primary)}
  dl{display:grid;gap:0;margin:9px 0}dl div{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-subtle)}
  dt{color:var(--text-muted);font-size:8px}dd{margin:0;text-align:right;color:var(--accent-cyan)}
  p{display:flex;gap:6px;align-items:flex-start;margin-top:12px;color:var(--accent-amber);font-size:8px;line-height:1.5}p span{color:var(--text-secondary)}
</style>
