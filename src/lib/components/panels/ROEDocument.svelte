<script lang="ts">
  let { onClose }: { onClose?: () => void } = $props();
</script>

<div class="roe-overlay">
  <article class="roe-document" role="dialog" aria-modal="true" aria-labelledby="roe-title">
    <header><div><span>OPERATIONAL GOVERNANCE · EXERCISE</span><h2 id="roe-title">RULES OF ENGAGEMENT</h2></div><button aria-label="Close rules of engagement" onclick={() => onClose?.()}>×</button></header>
    <p class="active">ROE ACTIVE · POSITIVE ID REQUIRED · COLLATERAL LIMIT: LOW · WEAPONS FREE: NO</p>
    <h3>1. Identification</h3><p>Positive identification of a hostile target is required before engagement. Uncertain or uncorroborated tracks remain under observation and are elevated for review.</p>
    <h3>2. Collateral constraint</h3><p>Collateral tolerance is LOW. Reassess target context and expected effects before authorizing a weapon release.</p>
    <h3>3. Authority</h3><p>Weapons are not free. Engagement authority remains with the designated tasking and mission authorities; this console records exercise decisions and does not issue operational tasking.</p>
    <h3>4. Uncertainty and abort</h3><p>When identification, airspace deconfliction, or mission safety is uncertain, hold, investigate, or abort and refer the decision to the appropriate authority.</p>
    <footer>SIMULATED EXERCISE POLICY · NOT AN OPERATIONAL DIRECTIVE</footer>
  </article>
</div>

<style>
  .roe-overlay{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:20px;background:rgba(5,8,15,.88);backdrop-filter:blur(4px)}.roe-document{width:min(680px,94vw);max-height:88vh;overflow:auto;padding:22px;background:var(--bg-panel);border:1px solid var(--accent-cyan);color:var(--text-secondary);font:12px/1.55 var(--font-sans)}header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid var(--border-subtle);padding-bottom:12px}header span,footer{color:var(--text-muted);font:8px var(--font-mono);letter-spacing:.12em}h2{margin:5px 0;color:var(--accent-cyan);font:14px var(--font-mono);letter-spacing:.15em}header button{border:1px solid var(--border-subtle);background:transparent;color:var(--text-primary);font-size:20px;cursor:pointer}.active{padding:10px;border-left:2px solid var(--accent-amber);background:color-mix(in srgb,var(--accent-amber) 6%,transparent);color:var(--accent-amber);font:9px var(--font-mono)}h3{margin:16px 0 3px;color:var(--text-primary);font:10px var(--font-mono);letter-spacing:.1em}p{margin:5px 0}footer{margin-top:20px;padding-top:10px;border-top:1px solid var(--border-subtle)}
</style>
