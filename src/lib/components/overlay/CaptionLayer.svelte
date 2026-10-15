<script lang="ts">
  import { onMount } from 'svelte';
  import { system } from '../../stores/systemStore.svelte';
  type Caption = { id: number; source: string; text: string; owner: string };
  let captions = $state<Caption[]>([]);
  let captionsOn = $state(true);
  let nextId = 0;
  const timers = new Map<number, number>();
  let activeOwner = $state(system.activeExperience === 'idle' ? 'system' : system.activeExperience);
  let captionPosition = $state<{ x: number; y: number } | null>(null);
  let dragOffset: { x: number; y: number } | null = null;

  function beginDrag(event: PointerEvent) {
    if (!(event.target instanceof HTMLElement) || !event.target.closest('.caption-drag')) return;
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    captionPosition ??= { x: box.left, y: box.top };
    dragOffset = { x: event.clientX - box.left, y: event.clientY - box.top };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent) {
    if (!dragOffset) return;
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    captionPosition = {
      x: Math.min(width - 100, Math.max(0, event.clientX - dragOffset.x)),
      y: Math.min(height - 50, Math.max(0, event.clientY - dragOffset.y)),
    };
  }
  function endDrag() { dragOffset = null; }
  function moveCaptionByKey(event: KeyboardEvent) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const box = (event.currentTarget as HTMLElement).closest('.captions')!.getBoundingClientRect();
    const current = captionPosition ?? { x: box.left, y: box.top };
    const step = event.shiftKey ? 48 : 20;
    captionPosition = {
      x: current.x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
      y: current.y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
    };
  }

  function clearCaptions() {
    captions = [];
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  }

  onMount(() => {
    try { captionsOn = localStorage.getItem('aircommand.captions') !== 'false'; } catch { captionsOn = true; }
    const setState = (event: Event) => captionsOn = Boolean((event as CustomEvent<boolean>).detail);
    const add = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: number; source: string; text: string; owner?: string; duration?: number }>).detail;
      if (!detail || (detail.owner && detail.owner !== activeOwner)) return;
      const caption = { id: detail.id ?? ++nextId, source: detail.source || 'SYSTEM', text: detail.text, owner: detail.owner ?? activeOwner };
      captions = [...captions.slice(-2), caption];
      if (detail.duration !== 0) {
        const duration = detail.duration ?? (system.simSpeed === 4 ? 1000 : system.simSpeed === 2 ? 2000 : 4000);
        timers.set(caption.id, window.setTimeout(() => {
          captions = captions.filter((item) => item.id !== caption.id);
          timers.delete(caption.id);
        }, duration));
      }
    };
    const end = (event: Event) => {
      const id = Number((event as CustomEvent<number>).detail);
      const timer = timers.get(id);
      if (timer) clearTimeout(timer);
      timers.delete(id);
      timers.set(id, window.setTimeout(() => {
        captions = captions.filter((item) => item.id !== id);
        timers.delete(id);
      }, 900));
    };
    const ownerChanged = (event: Event) => {
      activeOwner = (event as CustomEvent<{ owner: string }>).detail.owner;
      clearCaptions();
    };
    window.addEventListener('aircommand:caption', add);
    window.addEventListener('aircommand:caption-end', end);
    window.addEventListener('aircommand:captions-state', setState);
    window.addEventListener('aircommand:voice-owner', ownerChanged);
    window.addEventListener('aircommand:caption-clear', clearCaptions);
    return () => { window.removeEventListener('aircommand:caption', add); window.removeEventListener('aircommand:caption-end', end); window.removeEventListener('aircommand:captions-state', setState); window.removeEventListener('aircommand:voice-owner', ownerChanged); window.removeEventListener('aircommand:caption-clear', clearCaptions); clearCaptions(); };
  });
</script>

<svelte:window onpointermove={moveDrag} onpointerup={endDrag} />
<div class="captions" class:disabled={!captionsOn} style={captionPosition ? `left:${captionPosition.x}px;top:${captionPosition.y}px;right:auto;bottom:auto;transform:none;` : ''} onpointerdown={beginDrag} aria-live="polite" aria-atomic="false">
  {#each captions as caption (caption.id)}
    <article class="caption"><button type="button" class="caption-drag" aria-label="Move captions with arrow keys or drag" title="Drag captions to reposition" onkeydown={moveCaptionByKey}>⋮⋮ {caption.source.toUpperCase()} · DRAG</button><p>{caption.text}</p></article>
  {/each}
</div>

<style>
  .captions { position:fixed; left:50%; bottom:60px; transform:translateX(-50%); z-index:150; display:flex; flex-direction:column-reverse; gap:6px; width:min(560px,calc(100vw - 32px)); pointer-events:none; }
  .captions.disabled { display:none; }
  .caption { padding:7px 10px 8px; background:rgba(5,8,15,.72); backdrop-filter:blur(5px); border:1px solid var(--border-subtle); border-left:1px solid var(--accent-cyan); box-shadow:0 6px 18px rgba(0,0,0,.25); animation:caption-in .18s ease-out both; pointer-events:auto; }
  .caption-drag { display:block; width:max-content; max-width:100%; padding:0; border:0; background:transparent; color:var(--accent-amber); font:8px var(--font-mono); letter-spacing:.12em; text-align:left; cursor:grab; touch-action:none; user-select:none; }
  .caption-drag:active { cursor:grabbing; }
  p { margin:4px 0 0; color:var(--text-primary); font:12px/1.45 var(--font-mono); letter-spacing:.025em; }
  @keyframes caption-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
</style>
