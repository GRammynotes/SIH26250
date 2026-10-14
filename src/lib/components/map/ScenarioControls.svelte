<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';

  const scenarios = [
    { key: 'aircraft_nmc', label: 'AIRCRAFT NMC' },
    { key: 'multi_crisis', label: 'MULTI-CRISIS' },
    { key: 'radar_loss', label: 'RADAR LOSS' },
    { key: 'track_loss', label: 'TRACK LOSS' },
    { key: 'data_poisoning', label: 'DATA POISONING' },
  ];
</script>

<div class="controls">
  {#each scenarios as s (s.key)}
    <button
      class="btn"
      class:active={system.activeScenario === s.key}
      onclick={() => system.runScenario(s.key)}
    >
      {#if system.activeScenario === s.key}
        <span class="pulse-dot"></span>
      {/if}
      <span class="ico">▶</span>
      <span>{s.label}</span>
    </button>
  {/each}
  <button class="btn reset" onclick={() => system.reset()}>
    <span class="ico">↻</span>
    <span>RESET</span>
  </button>
</div>

<style>
  .controls {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(5, 6, 8, 0.92);
    border: 1px solid var(--border-strong);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.15em;
    z-index: 5;
    backdrop-filter: blur(4px);
  }
  .btn {
    display: flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid var(--border-strong);
    color: var(--text-secondary);
    padding: 6px 12px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.15em;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn:hover {
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
  }
  .btn.active {
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
    box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
  }
  .btn.reset { color: var(--text-muted); }
  .btn.reset:hover { border-color: var(--accent-red); color: var(--accent-red); }
  .ico { font-size: 9px; }
  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent-cyan);
    box-shadow: 0 0 6px var(--accent-cyan);
    animation: pulse 1.2s ease-in-out infinite;
  }
</style>
