<script lang="ts">
  import { onMount } from 'svelte';

  type EventEntry = { time: string; source: string; msg: string };

  let events = $state<EventEntry[]>([]);

  function ts(): string {
    return new Date().toISOString().slice(11, 19);
  }

  function push(source: string, msg: string) {
    events = [...events, { time: ts(), source, msg }].slice(-20);
  }

  onMount(() => {
    const seed: [string, string][] = [
      ['SYSTEM', 'INITIALIZED'],
      ['FUSION', 'ENGINE ONLINE'],
      ['TRACK', '14 AIRCRAFT TRACKED'],
      ['MISSION', '6 MISSIONS QUEUED'],
      ['THREAT', '8 ZONES ACTIVE'],
      ['COMMAND', 'AWAITING COMMANDER INPUT'],
    ];
    seed.forEach((s, i) => {
      setTimeout(() => push(s[0], s[1]), i * 120);
    });
  });
</script>

<div class="log">
  <div class="hdr">
    <span>EVENT LOG</span>
    <span class="count">{events.length} ENTRIES</span>
  </div>
  <div class="entries">
    {#each events as e}
      <div class="entry">
        <span class="t">[{e.time}]</span>
        <span class="src">{e.source}:</span>
        <span class="msg">{e.msg}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .log {
    grid-area: log;
    background: var(--bg-panel);
    border-top: 1px solid var(--border-subtle);
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .hdr {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
    color: var(--text-muted); text-transform: uppercase;
  }
  .hdr .count { color: var(--text-muted); }
  .entries { flex: 1; padding: 6px 12px; overflow-y: auto; }
  .entries::-webkit-scrollbar { width: 4px; }
  .entries::-webkit-scrollbar-thumb { background: var(--border-strong); }
  .entry {
    display: flex; gap: 8px;
    font-family: var(--font-mono); font-size: 10px; line-height: 1.5;
  }
  .t { color: var(--text-muted); }
  .src { color: var(--accent-cyan); min-width: 60px; }
  .msg { color: var(--text-secondary); }
</style>
