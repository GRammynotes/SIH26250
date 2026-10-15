<script lang="ts">
  let { modelPath: _modelPath, designation }: { modelPath: string; designation: string } = $props();
</script>

<span class="model-thumb" role="img" title={designation} aria-label={`${designation} aircraft thumbnail`}>
  <svg viewBox="0 0 40 32" aria-hidden="true">
    <path d="M20 3 23 13 35 20 35 23 23 20 22 27 28 30 28 31 20 29 12 31 12 30 18 27 17 20 5 23 5 20 17 13Z" />
  </svg>
</span>

<style>
  .model-thumb{display:grid;place-items:center;width:40px;height:32px;overflow:hidden;border:1px solid var(--border-subtle);background:transparent;color:var(--accent-cyan)}
  svg{display:block;width:32px;height:26px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
</style>
