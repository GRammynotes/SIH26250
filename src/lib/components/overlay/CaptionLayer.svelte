<script lang="ts">
  import { onMount } from 'svelte';
  import { system } from '../../stores/systemStore.svelte';
  type Caption = { id: number; source: string; text: string; owner: string };
  let captions = $state<Caption[]>([]);
  let captionsOn = $state(true);
  let nextId = 0;
  const timers = new Map<number, number>();
  let activeOwner = $state(system.activeExperience === 'idle' ? 'system' : system.activeExperience);

  function clearCaptions() {
    captions = [];
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  }

  onMount(() => {
    try { captionsOn = localStorage.getItem('aircommand.captions') !== 'false'; } catch { captionsOn = true; }
    const setState = (event: Event) => captionsOn = Boolean((event as CustomEvent<boolean>).detail);
    const add = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: number; source: string; text: string; owner?: string }>).detail;
      if (!detail || (detail.owner && detail.owner !== activeOwner)) return;
      const caption = { id: detail.id ?? ++nextId, source: detail.source || 'SYSTEM', text: detail.text, owner: detail.owner ?? activeOwner };
      captions = [...captions.slice(-2), caption];
      const duration = system.simSpeed === 4 ? 1000 : system.simSpeed === 2 ? 2000 : 4000;
      timers.set(caption.id, window.setTimeout(() => {
        captions = captions.filter((item) => item.id !== caption.id);
        timers.delete(caption.id);
      }, duration));
    };
    const ownerChanged = (event: Event) => {
      activeOwner = (event as CustomEvent<{ owner: string }>).detail.owner;
      clearCaptions();
    };
    window.addEventListener('aircommand:caption', add);
    window.addEventListener('aircommand:captions-state', setState);
    window.addEventListener('aircommand:voice-owner', ownerChanged);
    window.addEventListener('aircommand:caption-clear', clearCaptions);
    return () => { window.removeEventListener('aircommand:caption', add); window.removeEventListener('aircommand:captions-state', setState); window.removeEventListener('aircommand:voice-owner', ownerChanged); window.removeEventListener('aircommand:caption-clear', clearCaptions); clearCaptions(); };
  });
</script>

<div class="captions" class:disabled={!captionsOn} aria-live="polite" aria-atomic="false">
  {#each captions as caption (caption.id)}
    <article class="caption"><span class="source">[{caption.source.toUpperCase()}]</span><p>{caption.text}</p></article>
  {/each}
</div>

<style>
  .captions { position:fixed; left:50%; bottom:60px; transform:translateX(-50%); z-index:150; display:flex; flex-direction:column-reverse; gap:6px; width:min(560px,calc(100vw - 32px)); pointer-events:none; }
  .captions.disabled { opacity:.4; }
  .caption { padding:8px 12px 9px; background:rgba(5,8,15,.92); border:1px solid var(--border-subtle); border-left:1px solid var(--accent-cyan); box-shadow:0 6px 18px rgba(0,0,0,.35); animation:caption-in .18s ease-out both; }
  .source { color:var(--accent-amber); font:9px var(--font-mono); letter-spacing:.14em; }
  p { margin:4px 0 0; color:var(--text-primary); font:12px/1.45 var(--font-mono); letter-spacing:.025em; }
  @keyframes caption-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
</style>
