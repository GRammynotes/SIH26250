<script lang="ts">
  let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props();
</script>

{#if open}
  <div class="overlay" onclick={(e) => e.target === e.currentTarget && onClose?.()}>
    <div class="frame">
      <header>
        <div>
          <span class="eyebrow">SYSTEM ARCHITECTURE</span>
          <h2>MISSION PLANNING FLOW</h2>
        </div>
        <button onclick={() => onClose?.()} aria-label="Close">×</button>
      </header>
      <div class="body">
        <img src="/assets/mission_planning_flow.svg" alt="Mission Planning Flow" />
      </div>
      <footer>
        <span>N1 · TARGET RECEIVED</span>
        <span>N2 · INTEL GATE</span>
        <span>N3 · WEAPONEERING</span>
        <span>N4 · COA GENERATION</span>
        <span>N5 · COMMANDER DECISION</span>
        <span>N6 · EXECUTION</span>
      </footer>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(5, 8, 15, 0.92);
    backdrop-filter: blur(4px);
    display: grid; place-items: center;
    z-index: 200;
    animation: fadein 0.15s ease-out;
  }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

  .frame {
    width: min(1200px, 94vw);
    max-height: 92vh;
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    box-shadow: 0 0 60px color-mix(in srgb, var(--accent-cyan) 25%, transparent);
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--accent-cyan) 3%, transparent);
  }
  .eyebrow {
    display: block;
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: 0.22em; color: var(--accent-cyan);
    margin-bottom: 4px;
  }
  h2 {
    margin: 0;
    font-family: var(--font-mono); font-size: 14px;
    letter-spacing: 0.1em; color: var(--text-primary);
    font-weight: 500;
  }
  header button {
    background: transparent; border: 0;
    color: var(--text-muted); font-size: 22px; line-height: 1;
    cursor: pointer; padding: 0 6px;
  }
  header button:hover { color: var(--accent-red); }

  .body {
    flex: 1;
    padding: 16px;
    overflow: auto;
    background: var(--bg-base);
  }
  .body img {
    display: block;
    width: 100%;
    height: auto;
    filter: saturate(1.05);
  }

  footer {
    display: flex; justify-content: space-around;
    padding: 10px 16px;
    border-top: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--accent-cyan) 2%, transparent);
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: 0.15em; color: var(--text-muted);
  }
</style>
