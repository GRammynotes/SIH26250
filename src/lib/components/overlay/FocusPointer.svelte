<script lang="ts">
  import { onMount } from 'svelte';
  type FocusCue = { id: number; selector: string; text: string; x: number; y: number; w: number; h: number; expires: number };
  let cues = $state<FocusCue[]>([]);
  let sequence = 0;
  let timer = 0;

  function dismiss() { cues = []; }
  function handleUserClick() { if (cues.length) dismiss(); }
  function refresh() {
    cues = cues.flatMap((cue) => {
      const el = document.querySelector(cue.selector.split(',')[0].trim()) ?? document.querySelector(cue.selector.split(',')[1]?.trim() ?? '');
      if (!el || cue.expires <= Date.now()) return [];
      const r = el.getBoundingClientRect();
      return [{ ...cue, x: r.left, y: r.top, w: r.width, h: r.height }];
    });
  }

  onMount(() => {
    const add = (event: Event) => {
      const detail = (event as CustomEvent<{ selector: string; duration: number; text: string }>).detail;
      const el = document.querySelector(detail.selector.split(',')[0].trim()) ?? document.querySelector(detail.selector.split(',')[1]?.trim() ?? '');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      cues = [...cues.slice(-1), { id: ++sequence, selector: detail.selector, text: detail.text, x: rect.left, y: rect.top, w: rect.width, h: rect.height, expires: Date.now() + Math.min(detail.duration || 3000, 3000) }];
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, Math.min(detail.duration || 3000, 3000));
    };
    window.addEventListener('aircommand:focus', add);
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    window.addEventListener('click', handleUserClick, true);
    return () => { window.removeEventListener('aircommand:focus', add); window.removeEventListener('resize', refresh); window.removeEventListener('scroll', refresh, true); window.removeEventListener('click', handleUserClick, true); window.clearTimeout(timer); };
  });

  const maskPath = $derived.by(() => {
    if (!cues.length) return '';
    const w = window.innerWidth; const h = window.innerHeight;
    const holes = cues.map((c) => `M ${c.x - 7} ${c.y - 7} H ${c.x + c.w + 7} V ${c.y + c.h + 7} H ${c.x - 7} Z`).join(' ');
    return `M 0 0 H ${w} V ${h} H 0 Z ${holes}`;
  });
</script>

{#if cues.length}
  <div class="focus-layer" aria-hidden="true">
    <svg class="dimmer" aria-hidden="true"><path d={maskPath} fill="rgba(5,8,15,.60)" fill-rule="evenodd" /></svg>
    {#each cues as cue (cue.id)}
      <div class="ring" style:left="{cue.x - 7}px" style:top="{cue.y - 7}px" style:width="{cue.w + 14}px" style:height="{cue.h + 14}px"></div>
      <div class="arrow" style:left="{Math.max(8,Math.min(window.innerWidth - 36,cue.x + cue.w / 2 - 9))}px" style:top="{Math.max(8,cue.y - 33)}px">↘</div>
      <div class="bubble" style:left="{Math.min(window.innerWidth - 330,Math.max(12,cue.x + cue.w + 14))}px" style:top="{Math.min(window.innerHeight - 84,Math.max(12,cue.y + cue.h / 2 - 24))}px">{cue.text}</div>
    {/each}
  </div>
{/if}

<style>
  .focus-layer { position:fixed; inset:0; z-index:250; pointer-events:none; }
  .dimmer { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
  .ring { position:fixed; border:2px dashed var(--accent-cyan); border-radius:3px; box-shadow:0 0 10px rgba(0,212,255,.45); animation:ring-pulse .8s ease-in-out infinite alternate; pointer-events:none; }
  .arrow { position:fixed; color:var(--accent-cyan); text-shadow:0 0 8px var(--accent-cyan); font:22px var(--font-mono); pointer-events:none; }
  .bubble { position:fixed; width:min(310px,calc(100vw - 24px)); padding:8px 10px; background:rgba(5,8,15,.96); border:1px solid var(--accent-cyan); color:var(--text-primary); font:10px/1.45 var(--font-mono); box-shadow:0 0 14px rgba(0,212,255,.2); pointer-events:none; }
  @keyframes ring-pulse { to { border-color:rgba(0,212,255,.5); box-shadow:0 0 18px rgba(0,212,255,.25); } }
</style>
