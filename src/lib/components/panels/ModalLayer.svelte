<script lang="ts">
  import type { Snippet } from 'svelte';
  let { label, zIndex, visible = true, onMinimize, children }: { label: string; zIndex: number; visible?: boolean; onMinimize: () => void; children: Snippet } = $props();
</script>

<div class="layer" class:hidden={!visible} style:z-index={zIndex}>
  {@render children()}
  {#if visible}<button class="minimize" style:top={`${48 + (zIndex - 200) * 30}px`} aria-label="Minimize {label}" title="Minimize {label}" onclick={onMinimize}>─</button>{/if}
</div>

<style>
  .layer { position:fixed; inset:0; pointer-events:none; }
  .layer :global(.overlay),.layer :global([role="dialog"]) { pointer-events:auto; }
  .layer.hidden { display:none; }
  .minimize { position:fixed; right:18px; z-index:400; width:30px; height:25px; border:1px solid var(--accent-cyan); background:var(--bg-panel); color:var(--accent-cyan); font:12px var(--font-mono); cursor:pointer; pointer-events:auto; }
</style>
