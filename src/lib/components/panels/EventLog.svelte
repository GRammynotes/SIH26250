<script lang="ts">
  import { onMount } from 'svelte';

  type EventEntry = { time: string; source: string; msg: string; level: 'info' | 'ok' | 'warn' };

  let events = $state<EventEntry[]>([]);

  function ts(): string {
    return new Date().toISOString().slice(11, 19);
  }

  function push(source: string, msg: string, level: EventEntry['level'] = 'info') {
    events = [...events, { time: ts(), source, msg, level }].slice(-30);
  }

  onMount(() => {
    const seed: [string, string, EventEntry['level']][] = [
      ['SYSTEM', 'INITIALIZED', 'ok'],
      ['FUSION', 'ENGINE ONLINE', 'ok'],
      ['TRACK', '14 AIRCRAFT TRACKED', 'info'],
      ['MISSION', '6 MISSIONS QUEUED', 'info'],
      ['THREAT', '8 ZONES ACTIVE', 'warn'],
      ['COMMAND', 'AWAITING COMMANDER INPUT', 'info'],
    ];
    seed.forEach((s, i) => {
      setTimeout(() => push(s[0], s[1], s[2]), i * 90);
    });
  });

  function levelColor(l: EventEntry['level']) {
    return l === 'ok' ? 'var(--accent-green)' : l === 'warn' ? 'var(--accent-amber)' : 'var(--accent-cyan)';
  }
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
        <span class="src" style="color:{levelColor(e.level)};">{e.source}</span>
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
    position: relative;
  }
  .log::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent-cyan), transparent);
    opacity: 0.15;
  }
  .hdr {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 14px;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
    color: var(--text-muted); text-transform: uppercase;
  }
  .hdr .count { color: var(--text-muted); }
  .entries { flex: 1; padding: 6px 14px; overflow-y: auto; }
  .entries::-webkit-scrollbar { width: 3px; }
  .entries::-webkit-scrollbar-thumb { background: var(--border-strong); }
  .entry {
    display: flex; gap: 10px;
    font-family: var(--font-mono); font-size: 10px; line-height: 1.6;
  }
  .t { color: var(--text-muted); }
  .src { min-width: 70px; letter-spacing: 0.1em; }
  .msg { color: var(--text-secondary); }
</style>
