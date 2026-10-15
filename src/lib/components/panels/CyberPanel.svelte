<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';

  const linkStatus = $derived(system.spoofedTrackId ? 'LINK COMPROMISED' : system.mode === 'DEGRADED' ? 'KEY ROTATION DUE' : 'LINK SECURE');
  const linkGlyph = $derived(system.spoofedTrackId ? '×' : system.mode === 'DEGRADED' ? '△' : '✓');
  const sensorState = $derived(system.mode === 'DEGRADED' ? 'SINGLE-SOURCE · VALIDATION DISABLED' : 'CROSS-SENSOR VALIDATION NOMINAL');
  const spoofCount = $derived(system.spoofedTrackId ? 1 : 0);
</script>

<section class="cyber-panel" aria-label="Exercise cyber status">
  <header><strong>CYBER / LINK ASSURANCE</strong><span>SIMULATED · UNCLASSIFIED</span></header>
  <div class="status-card" class:bad={system.spoofedTrackId} class:warn={!system.spoofedTrackId && system.mode === 'DEGRADED'}>
    <span class="glyph" aria-hidden="true">{linkGlyph}</span><div><small>LINK STATUS</small><b>{linkStatus}</b></div>
  </div>
  <div class="readout"><span>ENCRYPTION</span><b title="Simulated AES-GCM encryption">🔒 SIMULATED</b></div>
  <div class="readout"><span>SENSOR MESH</span><b title={sensorState}>⌘ {system.mode === 'DEGRADED' ? 'DEGRADED' : 'NOMINAL'}</b></div>
  <div class="readout"><span>SPOOFED TRACKS</span><b class:bad-text={spoofCount > 0}>{spoofCount} · {spoofCount > 0 ? 'FLAGGED' : 'NONE'}</b></div>
  <div class="footnote" title="EXERCISE INDICATORS ONLY · NO LIVE NETWORK OR SENSOR CONNECTION">EXERCISE DATA · NO LIVE LINK</div>
</section>

<style>
  .cyber-panel { height:100%; overflow:auto; padding:10px; box-sizing:border-box; background:var(--bg-panel); color:var(--text-secondary); font:9px var(--font-mono); }
  header { display:flex; flex-direction:column; gap:4px; padding:2px 0 10px; border-bottom:1px solid var(--border-subtle); color:var(--accent-cyan); letter-spacing:.1em; }
  header span { color:var(--text-muted); font-size:7px; }
  .status-card { display:flex; gap:10px; align-items:center; margin:10px 0; padding:12px 9px; border:1px solid var(--accent-green); color:var(--accent-green); }
  .status-card.warn { border-color:var(--accent-amber); color:var(--accent-amber); }.status-card.bad { border-color:var(--accent-red); color:var(--accent-red); }
  .glyph { display:grid; place-items:center; width:24px; height:24px; border:1px solid currentColor; font-size:15px; }
  .status-card div { display:grid; gap:3px; }.status-card small { color:var(--text-muted); font-size:7px; }.status-card b { font-size:9px; letter-spacing:.1em; }
  .readout { display:flex; flex-direction:column; gap:4px; padding:10px 4px; border-bottom:1px solid var(--border-subtle); }.readout span { color:var(--text-muted); font-size:7px; letter-spacing:.12em; }.readout b { color:var(--text-primary); font-weight:400; font-size:8px; }
  .bad-text { color:var(--accent-red)!important; }
  .footnote { margin-top:14px; padding:8px; border:1px dashed var(--border-strong); color:var(--text-muted); font-size:7px; line-height:1.6; }
</style>
