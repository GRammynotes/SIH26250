<script lang="ts">
  import { onMount } from 'svelte';
  type FocusCue = { id: number; selector: string; text: string; x: number; y: number; w: number; h: number; expires: number };
  let cues = $state<FocusCue[]>([]);
  let sequence = 0;
  let timer = 0;

  function dismiss() { cues = []; }
  function findTarget(selector: string): Element | null {
    for (const candidate of selector.split(',').map((item) => item.trim()).filter(Boolean)) {
      try { const target = document.querySelector(candidate); if (target) return target; } catch { /* Ignore malformed optional selectors. */ }
    }
    return null;
  }
  function refresh() {
    cues = cues.flatMap((cue) => {
      const element = findTarget(cue.selector);
      if (!element || cue.expires <= Date.now()) return [];
      const rect = element.getBoundingClientRect();
      return [{ ...cue, x: rect.left, y: rect.top, w: rect.width, h: rect.height }];
    });
  }
  function consoleArea() {
    const shell = document.querySelector<HTMLElement>('.shell');
    const rect = shell?.getBoundingClientRect();
    const rail = document.querySelector<HTMLElement>('.rail-right:not(.hidden)');
    const right = rail?.getBoundingClientRect().left ?? rect?.right ?? window.innerWidth;
    return { left: rect?.left ?? 0, top: rect?.top ?? 0, right: Math.min(right, rect?.right ?? right), bottom: rect?.bottom ?? window.innerHeight };
  }
  function connector(cue: FocusCue) {
    const { right } = consoleArea();
    const x1 = right; const y1 = cue.y + cue.h / 2;
    const cx = cue.x + cue.w / 2; const cy = cue.y + cue.h / 2;
    const dx = cx - x1; const dy = cy - y1;
    const scale = Math.min((cue.w / 2 + 8) / Math.max(1, Math.abs(dx)), (cue.h / 2 + 8) / Math.max(1, Math.abs(dy)));
    return { x1, y1, x2: cx - dx * scale, y2: cy - dy * scale };
  }
  onMount(() => {
    const add = (event: Event) => {
      const detail = (event as CustomEvent<{ selector: string; duration: number; text: string }>).detail;
      const element = findTarget(detail.selector);
      if (!element) { cues = []; return; }
      const rect = element.getBoundingClientRect();
      cues = [...cues.slice(-1), { id: ++sequence, selector: detail.selector, text: detail.text, x: rect.left, y: rect.top, w: rect.width, h: rect.height, expires: Date.now() + Math.min(detail.duration || 3000, 3000) }];
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, Math.min(detail.duration || 3000, 3000));
    };
    const clear = () => { cues = []; window.clearTimeout(timer); };
    window.addEventListener('aircommand:focus', add);
    window.addEventListener('aircommand:focus-clear', clear);
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    window.addEventListener('click', clear, true);
    return () => { window.removeEventListener('aircommand:focus', add); window.removeEventListener('aircommand:focus-clear', clear); window.removeEventListener('resize', refresh); window.removeEventListener('scroll', refresh, true); window.removeEventListener('click', clear, true); window.clearTimeout(timer); };
  });
  const maskPath = $derived.by(() => {
    if (!cues.length) return '';
    const area = consoleArea();
    const holes = cues.map((cue) => `M ${cue.x - 8} ${cue.y - 8} H ${cue.x + cue.w + 8} V ${cue.y + cue.h + 8} H ${cue.x - 8} Z`).join(' ');
    return `M ${area.left} ${area.top} H ${area.right} V ${area.bottom} H ${area.left} Z ${holes}`;
  });
</script>

{#if cues.length}
  <div class="focus-layer" aria-hidden="true">
    <svg class="dimmer" aria-hidden="true"><path d={maskPath} fill="rgba(5,8,15,.65)" fill-rule="evenodd" /></svg>
    {#each cues as cue (cue.id)}
      {@const line = connector(cue)}
      <svg class="connector" aria-hidden="true"><defs><marker id="focus-pointer-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="var(--accent-cyan)" /></marker></defs><line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} marker-end="url(#focus-pointer-arrow)" /></svg>
      <div class="ring" style:left="{cue.x - 8}px" style:top="{cue.y - 8}px" style:width="{cue.w + 16}px" style:height="{cue.h + 16}px"></div>
      <div class="bubble" style:left="{Math.min(window.innerWidth - 330,Math.max(12,cue.x + cue.w + 14))}px" style:top="{Math.min(window.innerHeight - 84,Math.max(12,cue.y + cue.h / 2 - 24))}px">{cue.text}</div>
    {/each}
  </div>
{/if}

<style>
  .focus-layer { position:fixed; inset:0; z-index:250; pointer-events:none; }
  .dimmer,.connector { position:fixed; inset:0; width:100%; height:100%; pointer-events:none; }
  .connector line { stroke:var(--accent-cyan); stroke-width:1; }
  .ring { position:fixed; border:2px dashed var(--accent-cyan); border-radius:3px; box-shadow:0 0 10px color-mix(in srgb, var(--accent-cyan) 45%, transparent); animation:dash-rotate 1.5s linear infinite; pointer-events:none; }
  .bubble { position:fixed; width:min(310px,calc(100vw - 24px)); padding:8px 10px; background:rgba(5,8,15,.96); border:1px solid var(--accent-cyan); color:var(--text-primary); font:10px/1.45 var(--font-mono); box-shadow:0 0 14px color-mix(in srgb, var(--accent-cyan) 20%, transparent); pointer-events:none; }
  @keyframes dash-rotate { to { stroke-dashoffset:-24; } }
</style>
