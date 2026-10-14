<script lang="ts">
  import type { Snippet } from 'svelte';
  let { label, zIndex, visible = true, onMinimize, children }: { label: string; zIndex: number; visible?: boolean; onMinimize: () => void; children: Snippet } = $props();
</script>

<div class="layer" class:hidden={!visible} style:z-index={zIndex}>
  {@render children()}
  {#if visible}<span class="class-mark" style:top={`${18 + (zIndex - 200) * 30}px`} aria-label="{label}: unclassified exercise data">UNCLASSIFIED · EXERCISE</span><button class="minimize" style:top={`${48 + (zIndex - 200) * 30}px`} aria-label="Minimize {label}" title="Minimize {label}" onclick={onMinimize}>─</button>{/if}
</div>

<style>
  .layer { position:fixed; inset:0; pointer-events:none; }
  .layer :global(.overlay),.layer :global([role="dialog"]) { pointer-events:auto; }
  .layer.hidden { display:none; }
  .minimize { position:fixed; right:18px; z-index:400; width:30px; height:25px; border:1px solid var(--accent-cyan); background:var(--bg-panel); color:var(--accent-cyan); font:12px var(--font-mono); cursor:pointer; pointer-events:auto; }
  .class-mark { position:fixed; right:56px; z-index:400; padding:5px 8px; border:1px solid var(--border-strong); background:var(--bg-panel); color:var(--text-muted); font:7px var(--font-mono); letter-spacing:.1em; pointer-events:none; }
</style>
