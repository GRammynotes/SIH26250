<script lang="ts">
  let { open = false, x = 0, y = 0, kind = 'map', title = 'MAP ITEM', onAction, onClose }: { open?: boolean; x?: number; y?: number; kind?: string; title?: string; onAction?: (action: string) => void; onClose?: () => void } = $props();
  const actions: Record<string, Array<[string, string]>> = {
    aircraft: [['loadout', '◈ Loadout Diagram'], ['track', '◐ Track Mission'], ['assign', '▸ Assign to Mission'], ['details', '◫ Details']],
    base: [['roster', '◈ Aircraft Roster'], ['missions', '▸ View Missions'], ['details', '◫ Details']],
    mission: [['briefing', '◈ Briefing'], ['execute', '▸ Execute'], ['aircraft', '◫ Assigned Aircraft'], ['details', '◫ Details']],
    threat: [['rings', '◈ Range Rings'], ['cone', '◫ Probability Cone'], ['details', '◫ Details']],
    missile: [['trajectory', '◈ Trajectory'], ['impact', '◫ Impact Analysis'], ['details', '◫ Details']],
    ground: [['specs', '◈ Specs'], ['details', '◫ Details']],
    enemy: [['details', '◫ Details']],
  };
  function handleKeydown(event: KeyboardEvent) { if (event.key === 'Escape' && open) { event.preventDefault(); onClose?.(); } }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <div class="context-backdrop" role="presentation" onclick={onClose} oncontextmenu={(event) => { event.preventDefault(); onClose?.(); }}>
    <nav class="context-menu" aria-label={`${kind} actions`} style={`left:${Math.min(x, window.innerWidth - 230)}px;top:${Math.min(y, window.innerHeight - 250)}px`} onclick={(event) => event.stopPropagation()}>
      <strong>{title}</strong>
      {#each actions[kind] ?? [['details', '◫ Details']] as [action, label] (action)}
        <button onclick={() => { onAction?.(action); onClose?.(); }}>{label}</button>
      {/each}
    </nav>
  </div>
{/if}

<style>
  .context-backdrop { position:fixed; inset:0; z-index:210; background:transparent; }
  .context-menu { position:fixed; width:220px; display:flex; flex-direction:column; padding:5px; border:1px solid var(--accent-cyan); background:rgba(5,8,15,.97); box-shadow:0 8px 24px rgba(0,0,0,.55); font:12px var(--font-mono); }
  .context-menu strong { padding:7px 8px; color:var(--accent-amber); font-size:8px; letter-spacing:.12em; border-bottom:1px solid var(--border-subtle); }
  .context-menu button { padding:9px 8px; border:0; border-bottom:1px solid var(--border-subtle); color:var(--text-primary); background:transparent; text-align:left; font:10px var(--font-mono); cursor:pointer; }
  .context-menu button:hover,.context-menu button:focus-visible { color:var(--accent-cyan); outline:1px solid var(--accent-cyan); }
</style>
