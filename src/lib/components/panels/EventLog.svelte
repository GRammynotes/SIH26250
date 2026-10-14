<script lang="ts">
  import { system, type EventLevel } from '../../stores/systemStore.svelte';
  let { collapsed = false, onToggle }: { collapsed?: boolean; onToggle?: () => void } = $props();

  function levelColor(l: EventLevel) {
    return l === 'ok' ? 'var(--accent-green)'
         : l === 'warn' ? 'var(--accent-amber)'
         : l === 'alert' ? 'var(--accent-red)'
         : 'var(--accent-cyan)';
  }
</script>

<div class="log">
  <div class="hdr">
    <span>EVENT LOG</span>
    <span class="log-actions"><span class="count">{system.events.length} ENTRIES</span><button aria-label={collapsed ? 'Expand event log' : 'Collapse event log'} title={collapsed ? 'Expand event log' : 'Collapse event log'} onclick={() => onToggle?.()}>{collapsed ? '⌃' : '⌄'}</button></span>
  </div>
  {#if !collapsed}<div class="entries">
    {#each system.events as e}
      <div class="entry">
        <span class="t">[{e.time}Z]</span>
        <span class="classification-tag">[U]</span>
        <span class="src" style="color:{levelColor(e.level)};">{e.source}</span>
        <span class="msg">{e.msg}</span>
      </div>
    {/each}
  </div>{/if}
</div>

<style>
  .log { grid-area: log; background: var(--bg-panel); border-top: 1px solid var(--border-subtle); display: flex; flex-direction: column; overflow: hidden; position: relative; }
  .log::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--accent-cyan), transparent); opacity: 0.15; }
  .hdr { display: flex; justify-content: space-between; align-items: center; padding: 6px 14px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; }
  .entries { flex: 1; padding: 6px 14px; overflow-y: auto; }
  .log-actions { display:flex; align-items:center; gap:10px; } .log-actions button { background:transparent; border:0; color:var(--accent-cyan); cursor:pointer; font:12px var(--font-mono); }
  .entries::-webkit-scrollbar { width: 3px; }
  .entries::-webkit-scrollbar-thumb { background: var(--border-strong); }
  .entry { display: flex; gap: 10px; font-family: var(--font-mono); font-size: 10px; line-height: 1.6; }
  .t { color: var(--text-muted); }
  .classification-tag { color:var(--accent-cyan); min-width:18px; }
  .src { min-width: 70px; letter-spacing: 0.1em; }
  .msg { color: var(--text-secondary); }
</style>
