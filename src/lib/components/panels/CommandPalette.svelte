<script lang="ts">
  export type PaletteCommand = { id: string; label: string; category: string; keywords: string; kind: 'action' | 'mission' | 'aircraft' | 'base'; targetId?: string };
  let { open = false, commands = [], onClose, onSelect }: { open?: boolean; commands?: PaletteCommand[]; onClose?: () => void; onSelect?: (command: PaletteCommand) => void } = $props();
  let query = $state('');
  let activeIndex = $state(0);

  function score(command: PaletteCommand, text: string) {
    const q = text.trim().toLowerCase();
    if (!q) return 1;
    const target = `${command.label} ${command.category} ${command.keywords}`.toLowerCase();
    if (target.includes(q)) return 100 - target.indexOf(q);
    let cursor = 0;
    for (const char of q) { cursor = target.indexOf(char, cursor); if (cursor < 0) return 0; cursor++; }
    return Math.max(1, 50 - (cursor - q.length));
  }

  let results = $derived(commands.map((command) => ({ command, score: score(command, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.command.label.localeCompare(b.command.label))
    .slice(0, 12).map((item) => item.command));

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown') { event.preventDefault(); activeIndex = (activeIndex + 1) % Math.max(results.length, 1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); activeIndex = (activeIndex - 1 + results.length) % Math.max(results.length, 1); }
    else if (event.key === 'Enter' && results[activeIndex]) { event.preventDefault(); onSelect?.(results[activeIndex]); }
    else if (event.key === 'Escape') { event.preventDefault(); onClose?.(); }
  }

  $effect(() => { query; activeIndex = 0; });
</script>

{#if open}
  <div class="backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && onClose?.()}>
    <section class="palette" role="dialog" aria-modal="true" aria-label="Command palette" onkeydown={handleKeydown} tabindex="-1">
      <div class="search"><span>⌕</span><input bind:value={query} placeholder="SEARCH COMMANDS, MISSIONS, AIRCRAFT, BASES..." aria-label="Search commands" autofocus /><kbd>ESC</kbd></div>
      <div class="results" role="listbox">
        {#each results as command, index (command.id)}
          <button class:active={index === activeIndex} role="option" aria-selected={index === activeIndex} onclick={() => onSelect?.(command)} onmouseenter={() => activeIndex = index}>
            <span class="label">{command.label}</span><span class="category">{command.category}</span>
          </button>
        {:else}<div class="empty">NO MATCHING COMMANDS</div>{/each}
      </div>
      <footer><span>↑↓ NAVIGATE</span><span>↵ SELECT</span><span>ESC CLOSE</span></footer>
    </section>
  </div>
{/if}

<style>
  .backdrop { position:fixed; inset:0; z-index:320; display:flex; justify-content:center; align-items:flex-start; padding-top:14vh; background:rgba(0,0,0,.68); }
  .palette { width:min(640px,92vw); max-height:70vh; display:flex; flex-direction:column; background:var(--bg-panel); border:1px solid var(--accent-cyan); box-shadow:0 16px 60px rgba(0,0,0,.7); color:var(--text-secondary); font-family:var(--font-mono); }
  .search { display:flex; align-items:center; gap:10px; padding:13px 15px; border-bottom:1px solid var(--border-subtle); color:var(--accent-cyan); }
  .search input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--text-primary); font:10px var(--font-mono); letter-spacing:.08em; }
  kbd { padding:3px 5px; border:1px solid var(--border-strong); color:var(--text-muted); font:8px var(--font-mono); }
  .results { overflow:auto; padding:6px; }
  .results button { width:100%; display:flex; justify-content:space-between; padding:10px; border:1px solid transparent; background:transparent; text-align:left; color:var(--text-secondary); font:10px var(--font-mono); cursor:pointer; }
  .results button:hover,.results button.active { border-color:var(--border-strong); background:color-mix(in srgb, var(--accent-cyan) 6%, transparent); color:var(--accent-cyan); }
  .category { color:var(--text-muted); font-size:8px; letter-spacing:.13em; }
  .empty { padding:18px 10px; color:var(--text-muted); font-size:9px; }
  footer { display:flex; gap:16px; padding:8px 14px; border-top:1px solid var(--border-subtle); color:var(--text-muted); font-size:8px; letter-spacing:.1em; }
</style>
