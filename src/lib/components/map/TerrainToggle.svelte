<script lang="ts">
let enabled = $state(false);

function toggle() {
  enabled = !enabled;
  window.dispatchEvent(new CustomEvent('aircommand:terrain-3d', { detail: enabled }));
}
</script>

<button class="terrain-btn" class:active={enabled} aria-label="Toggle 3D terrain" aria-pressed={enabled} onclick={toggle} title="Toggle 3D terrain">
  ◢ {enabled ? '3D ON' : '3D'}
</button>

<style>
  .terrain-btn { position:absolute; top:28px; right:124px; z-index:7; padding:6px 9px; background:rgba(5,8,15,.9); border:1px solid var(--border-strong); color:var(--text-secondary); font:8px var(--font-mono); letter-spacing:.12em; cursor:pointer; transition:background .18s,border-color .18s,color .18s; }
  .terrain-btn:hover,.terrain-btn:focus-visible,.terrain-btn.active { border-color:var(--accent-cyan); color:var(--accent-cyan); background:rgba(0,212,255,.1); outline:none; }
</style>
