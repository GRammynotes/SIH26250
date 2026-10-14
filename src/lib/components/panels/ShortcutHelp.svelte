<script lang="ts">
  let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props();
  const navigation = [ ['G', 'Generate COA'], ['R', 'Open reference library'], ['F', 'Open mission flow'], ['M', 'Open metrics'], ['D', 'Start demo'], ['Esc', 'Close top modal'] ];
  const panels = [ ['Ctrl+B', 'Toggle event log'], ['Ctrl+L', 'Toggle left panel'], ['1 / 2 / 3', 'Select COA rank'], ['?', 'Open shortcut help'] ];
</script>

{#if open}
  <div class="overlay" role="presentation" onclick={(event) => event.target === event.currentTarget && onClose?.()}>
    <section class="modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <header><span>⌨ KEYBOARD SHORTCUTS</span><button onclick={() => onClose?.()}>×</button></header>
      <div class="columns">
        <div><h2>NAVIGATION</h2>{#each navigation as [key, description]}<div class="row"><kbd>{key}</kbd><span>{description}</span></div>{/each}</div>
        <div><h2>PANELS</h2>{#each panels as [key, description]}<div class="row"><kbd>{key}</kbd><span>{description}</span></div>{/each}</div>
      </div>
    </section>
  </div>
{/if}

<style>
  .overlay { position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; background: rgba(0,0,0,.72); }
  .modal { width: min(620px, 92vw); background: var(--bg-panel); border: 1px solid var(--border-strong); color: var(--text-secondary); font-family: var(--font-mono); }
  header { display:flex; justify-content:space-between; padding:14px 18px; border-bottom:1px solid var(--border-subtle); color:var(--accent-cyan); letter-spacing:.15em; font-size:11px; }
  header button { background:none; border:0; color:var(--text-muted); font-size:20px; cursor:pointer; }
  .columns { display:grid; grid-template-columns:1fr 1fr; gap:28px; padding:20px; }
  h2 { font-size:9px; letter-spacing:.18em; color:var(--text-muted); margin:0 0 12px; }
  .row { display:flex; align-items:center; gap:12px; margin:10px 0; font-size:10px; }
  kbd { min-width:54px; text-align:center; padding:5px 7px; color:var(--accent-cyan); border:1px solid var(--accent-cyan); font:10px var(--font-mono); }
  @media (max-width:520px) { .columns { grid-template-columns:1fr; gap:16px; } }
</style>
