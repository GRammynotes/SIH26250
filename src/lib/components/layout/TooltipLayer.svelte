<script lang="ts">
  import { onMount } from 'svelte';

  let text = $state('');
  let x = $state(0);
  let y = $state(0);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let activeTarget: HTMLElement | null = null;
  let observer: MutationObserver | undefined;

  function labelButton(button: HTMLButtonElement) {
    const title = button.getAttribute('title');
    if (title && !button.hasAttribute('aria-label')) button.setAttribute('aria-label', title);
    if (title) button.removeAttribute('title');
  }

  function findTarget(target: EventTarget | null): HTMLButtonElement | null {
    if (!(target instanceof Element)) return null;
    const button = target.closest('button');
    if (!(button instanceof HTMLButtonElement)) return null;
    labelButton(button);
    const label = button.getAttribute('aria-label');
    const visibleText = button.textContent?.trim() ?? '';
    return label && (!visibleText || /^[^\p{L}\p{N}]+$/u.test(visibleText)) ? button : null;
  }

  function showFor(button: HTMLButtonElement, event?: Event) {
    clearTimeout(timer);
    activeTarget = button;
    const label = button.getAttribute('aria-label');
    if (!label) return;
    timer = setTimeout(() => {
      if (activeTarget !== button) return;
      const rect = button.getBoundingClientRect();
      x = Math.min(Math.max(8, event instanceof PointerEvent ? event.clientX : rect.left + rect.width / 2), window.innerWidth - 220);
      y = Math.min(rect.bottom + 8, window.innerHeight - 42);
      text = label;
    }, 400);
  }

  function hide() { clearTimeout(timer); activeTarget = null; text = ''; }

  onMount(() => {
    document.querySelectorAll<HTMLButtonElement>('button[title]').forEach(labelButton);
    observer = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof HTMLButtonElement) labelButton(node);
        if (node instanceof Element) node.querySelectorAll<HTMLButtonElement>('button[title]').forEach(labelButton);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const over = (event: PointerEvent) => { const button = findTarget(event.target); if (button) showFor(button, event); };
    const out = (event: PointerEvent) => { if (activeTarget && event.target instanceof Node && activeTarget.contains(event.target) && !(event.relatedTarget instanceof Node && activeTarget.contains(event.relatedTarget))) hide(); };
    const focus = (event: FocusEvent) => { const button = findTarget(event.target); if (button) showFor(button); };
    document.addEventListener('pointerover', over); document.addEventListener('pointerout', out);
    document.addEventListener('focusin', focus); document.addEventListener('focusout', hide);
    return () => {
      observer?.disconnect(); document.removeEventListener('pointerover', over); document.removeEventListener('pointerout', out);
      document.removeEventListener('focusin', focus); document.removeEventListener('focusout', hide); clearTimeout(timer);
    };
  });
</script>

{#if text}<div class="tooltip" style:left="{x}px" style:top="{y}px" role="tooltip">{text}</div>{/if}

<style>
  .tooltip { position:fixed; z-index:1000; pointer-events:none; max-width:220px; padding:6px 8px; background:var(--bg-panel); border:1px solid var(--accent-cyan); color:var(--text-primary); box-shadow:0 4px 14px rgba(0,0,0,.55); font:10px var(--font-mono); letter-spacing:.08em; white-space:nowrap; }
</style>
