<script lang="ts" module>
  export interface DecisionOption {
    id: string;
    label: string;
    description: string;
    tag?: string;
    tagColor?: string;
    preview?: { successDelta: number; successProbability: number; riskDelta: number; etaDelta: number };
  }
</script>

<script lang="ts">
  let {
    open = false,
    title = 'DECISION REQUIRED',
    message = '',
    context = '',
    options = [],
    onSelect,
    onClose,
    rail = false,
    processing = false,
  }: {
    open?: boolean;
    title?: string;
    message?: string;
    context?: string;
    options?: DecisionOption[];
    onSelect?: (option: DecisionOption) => void;
    onClose?: () => void;
    rail?: boolean;
    processing?: boolean;
  } = $props();
</script>

{#if open}
  <div class="overlay" class:rail aria-live={rail ? 'polite' : undefined}>
    <section class="panel" role={rail ? 'group' : 'dialog'} aria-modal={!rail ? 'true' : undefined} aria-label={title}>
      <header>
        <div class="hdr-left">
          <span class="eyebrow">MISSION CMDR DECISION</span>
          <h2>{title}</h2>
        </div>
        <button type="button" disabled={processing} onclick={() => onClose?.()} aria-label="Close">×</button>
      </header>

      <div class="roe-strip" role="note">ROE ACTIVE · POSITIVE ID REQUIRED · COLLATERAL LIMIT LOW · WEAPONS FREE: NO</div>

      {#if context}
        <div class="context">{context}</div>
      {/if}

      {#if message}
        <p class="message">{message}</p>
      {/if}

      {#if processing}<div class="processing" role="status">◢ PROCESSING DECISION · RE-EVALUATING COAS · UPDATING THREAT PICTURE</div>{/if}

      <div class="options" role="group" aria-label="Decision options">
        {#each options as option (option.id)}
          <button class="option" type="button" disabled={processing} onclick={() => onSelect?.(option)}>
            <div class="opt-top">
              <strong>{option.label}</strong>
              {#if option.tag}
                <span class="tag" style="color:{option.tagColor ?? 'var(--accent-cyan)'};border-color:{option.tagColor ?? 'var(--accent-cyan)'};">
                  {option.tag}
                </span>
              {/if}
            </div>
            <span class="desc">{option.description}</span>
            {#if option.preview}
              <span class="preview-stats"><b>{option.preview.successDelta >= 0 ? '+' : ''}{option.preview.successDelta}% success</b><b>{option.preview.riskDelta >= 0 ? '+' : ''}{option.preview.riskDelta} risk</b><b>ETA {option.preview.etaDelta > 0 ? '+' : ''}{option.preview.etaDelta}m</b></span>
              <span class="probability" aria-label={`Projected success probability ${option.preview.successProbability}%`}><i style={`width:${option.preview.successProbability}%`}></i></span>
              <small class="probability-label">PROJECTED SUCCESS · {option.preview.successProbability}%</small>
            {/if}
          </button>
        {/each}
      </div>
    </section>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(5, 8, 15, 0.82);
    backdrop-filter: blur(3px);
    display: grid;
    place-items: center;
    z-index: 100;
    animation: fadein 0.15s ease-out;
  }
  .overlay.rail { position:relative; inset:auto; background:transparent; backdrop-filter:none; display:block; z-index:auto; animation:none; }
  .overlay.rail .panel { width:100%; max-height:100%; overflow-y:auto; border:1px solid var(--border-strong); box-shadow:none; }
  .overlay.rail header { padding:10px 12px; }
  .overlay.rail .context,.overlay.rail .message { padding:9px 12px; }
  .overlay.rail .option { padding:10px 12px; }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

  .panel {
    width: min(640px, 92vw);
    max-height: 84vh;
    overflow-y: auto;
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    box-shadow: 0 0 40px color-mix(in srgb, var(--accent-cyan) 25%, transparent), 0 0 80px color-mix(in srgb, var(--accent-cyan) 10%, transparent);
    padding: 0;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px 20px 14px;
    border-bottom: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--accent-cyan) 3%, transparent);
  }
  .hdr-left { display: flex; flex-direction: column; gap: 4px; }
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.22em;
    color: var(--accent-cyan);
    text-transform: uppercase;
  }
  h2 {
    font-family: var(--font-mono);
    font-size: 14px;
    letter-spacing: 0.08em;
    color: var(--text-primary);
    margin: 0;
    font-weight: 500;
  }
  header button {
    background: transparent;
    border: 0;
    color: var(--text-muted);
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
    padding: 0 6px;
    transition: color 0.15s;
  }
  header button:hover { color: var(--accent-red); }

  .context {
    padding: 12px 20px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.1em;
    color: var(--accent-amber);
    background: color-mix(in srgb, var(--accent-amber) 5%, transparent);
    border-bottom: 1px solid var(--border-subtle);
  }
  .roe-strip { padding:9px 20px; color:var(--accent-amber); border-bottom:1px solid var(--border-subtle); background:color-mix(in srgb,var(--accent-amber) 6%,transparent); font:8px var(--font-mono); letter-spacing:.1em; }

  .message {
    padding: 14px 20px;
    font-family: var(--font-sans);
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-secondary);
    margin: 0;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 1px;
    background: var(--border-subtle);
    padding-top: 1px;
  }

  .option {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    padding: 14px 20px;
    text-align: left;
    background: var(--bg-panel);
    border: 0;
    color: inherit;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  }
  .option:hover { background: var(--bg-elevated); }
  .option:active { background: color-mix(in srgb, var(--accent-cyan) 8%, transparent); }
  .option:disabled { opacity:.55; cursor:wait; }
  .processing { padding:10px 12px; color:var(--accent-amber); border-block:1px solid var(--border-subtle); font:8px/1.5 var(--font-mono); letter-spacing:.08em; animation:think .7s ease-in-out infinite alternate; }
  @keyframes think { to { opacity:.55; } }

  .opt-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .option strong {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.08em;
    color: var(--accent-cyan);
    font-weight: 500;
  }
  .tag {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.15em;
    padding: 2px 6px;
    border: 1px solid;
    text-transform: uppercase;
  }
  .desc {
    font-family: var(--font-sans);
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-secondary);
  }
  .preview-stats { display:flex; flex-wrap:wrap; gap:12px; color:var(--text-muted); font:8px var(--font-mono); letter-spacing:.04em; }
  .preview-stats b:first-child { color:var(--accent-green); }
  .preview-stats b:nth-child(2) { color:var(--accent-amber); }
  .probability { display:block; height:3px; background:var(--border-subtle); }
  .probability i { display:block; height:100%; background:var(--accent-cyan); }
  .probability-label { color:var(--text-muted); font:7px var(--font-mono); letter-spacing:.08em; }
</style>
