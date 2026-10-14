<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';

  function update(event: Event) {
    system.setPrioritization(Number((event.currentTarget as HTMLInputElement).value));
  }
</script>

<section class="priority-control" aria-label="COA prioritization">
  <header><strong>PRIORITIZATION</strong><span>{system.prioritization < 34 ? 'SUCCESS BIAS' : system.prioritization > 66 ? 'RISK BIAS' : 'BALANCED'}</span></header>
  <div class="ends"><span>MAXIMIZE SUCCESS</span><span>MINIMIZE RISK</span></div>
  <input aria-label="Prioritization from maximize success to minimize risk" type="range" min="0" max="100" value={system.prioritization} oninput={update} />
  <div class="labels"><span>AGGRESSIVE</span><span>BALANCED</span><span>CONSERVATIVE</span></div>
</section>

<style>
  .priority-control { padding:9px; border-top:1px solid var(--border-subtle); background:var(--bg-panel); font-family:var(--font-mono); }
  header,.ends,.labels { display:flex; justify-content:space-between; align-items:center; gap:8px; }
  header { color:var(--accent-cyan); font-size:8px; letter-spacing:.12em; margin-bottom:7px; }
  header span { color:var(--text-muted); }
  .ends,.labels { color:var(--text-muted); font-size:7px; letter-spacing:.07em; }
  input { display:block; width:100%; margin:8px 0; accent-color:var(--accent-cyan); cursor:ew-resize; }
  input:focus-visible { outline:1px solid var(--accent-cyan); outline-offset:3px; }
</style>
