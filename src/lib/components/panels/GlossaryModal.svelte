<script lang="ts">
  import { GLOSSARY } from '../../data/glossary';
  let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props();
  let query = $state('');
  let category = $state('ALL');
  const categories = ['ALL', ...new Set(GLOSSARY.map((entry) => entry.category))];
  let entries = $derived(GLOSSARY.filter((entry) => (category === 'ALL' || entry.category === category) && `${entry.term} ${entry.definition}`.toLowerCase().includes(query.toLowerCase())));
</script>

{#if open}
  <div class="overlay" role="presentation" onclick={(event) => event.target === event.currentTarget && onClose?.()}>
    <section class="modal" role="dialog" aria-modal="true" aria-label="Glossary">
      <header><span>◈ OPERATIONAL GLOSSARY · {GLOSSARY.length} TERMS</span><button onclick={() => onClose?.()}>×</button></header>
      <input bind:value={query} placeholder="SEARCH TERMS..." aria-label="Search glossary" />
      <div class="content">
        <nav>{#each categories as item}<button class:active={category === item} onclick={() => category = item}>{item}</button>{/each}</nav>
        <div class="entries">{#each entries as entry (entry.term)}<article><div><strong>{entry.term}</strong><small>{entry.category}</small></div><p>{entry.definition}</p></article>{:else}<p class="empty">NO MATCHING TERMS</p>{/each}</div>
      </div>
    </section>
  </div>
{/if}

<style>
  .overlay { position:fixed; inset:0; z-index:90; display:grid; place-items:center; background:rgba(0,0,0,.72); }
  .modal { width:min(780px,94vw); max-height:82vh; display:flex; flex-direction:column; background:var(--bg-panel); border:1px solid var(--border-strong); color:var(--text-secondary); font-family:var(--font-mono); }
  header { display:flex; justify-content:space-between; padding:14px 18px; border-bottom:1px solid var(--border-subtle); color:var(--accent-cyan); letter-spacing:.15em; font-size:11px; }
  header button { background:none; border:0; color:var(--text-muted); font-size:20px; cursor:pointer; }
  input { margin:14px 18px; padding:9px 10px; background:var(--bg-base); border:1px solid var(--border-subtle); color:var(--text-primary); font:10px var(--font-mono); }
  .content { display:grid; grid-template-columns:150px 1fr; min-height:0; overflow:hidden; }
  nav { display:flex; flex-direction:column; gap:3px; padding:0 10px 14px 18px; }
  nav button { text-align:left; padding:8px; background:transparent; border:1px solid transparent; color:var(--text-muted); font:9px var(--font-mono); cursor:pointer; }
  nav button.active, nav button:hover { border-color:var(--border-strong); color:var(--accent-cyan); }
  .entries { overflow:auto; padding:0 18px 18px 8px; }
  article { padding:10px 0; border-bottom:1px solid var(--border-subtle); }
  article div { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  strong { color:var(--accent-amber); font-size:11px; }
  small { color:var(--text-muted); font-size:8px; letter-spacing:.12em; }
  article p { margin:6px 0 0; color:var(--text-secondary); font-size:10px; line-height:1.6; }
  .empty { color:var(--text-muted); font-size:10px; }
  @media(max-width:520px) { .content { grid-template-columns:110px 1fr; } }
</style>
