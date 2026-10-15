<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { getModeLabel } from '../../engine/optimisation';
  import { ENEMY_ASSETS } from '../../data/enemyAssets';
  import { bestResponseToCOA, expectedPayoff } from '../../engine/gameTheory';
  import { degradeConfidence } from '../../engine/threatAssessment';
  let { onCollapse, onToggleVisibility, mode }: { onCollapse?: () => void; onToggleVisibility?: () => void; mode?: 'blue' | 'red' } = $props();

  function rankColor(r: number) {
    return r === 1 ? 'var(--accent-green)' : r === 2 ? 'var(--accent-amber)' : 'var(--accent-red)';
  }

  let coas = $derived(system.coas);
  let view = $state<'blue' | 'red'>('blue');
  let expandedCoaId = $state<string | null>(null);
  let activeView = $derived(mode ?? view);
  let btnLabel = $derived(
    system.computing ? '◢ COMPUTING...' : coas.length === 0 ? '▸ GENERATE COA' : '▸ RE-GENERATE COA',
  );
</script>

<div class="panel corners" data-tour="coa-panel">
  <div class="hdr">
    <span>{system.mode === 'DEGRADED' ? 'DEGRADED · SINGLE-SOURCE MODE' : 'COA ANALYSIS'}</span>
    <div class="hdr-right">
      {#if system.reoptimizing}
        <span class="recomputing">◢ RECOMPUTING</span>
      {/if}
      <span class="count">{coas.length > 0 ? `${coas.length} OPTIONS` : 'STANDBY'}</span>
      {#if mode === 'blue'}<button class="chevron" aria-label="Hide COA panel" title="Hide COA panel" onclick={() => onToggleVisibility?.()}>◉</button>{/if}
      {#if onCollapse}<button class="chevron" aria-label="Collapse right panel" title="Collapse right panel" onclick={() => onCollapse?.()}>›</button>{/if}
    </div>
  </div>

  {#if coas.length > 0 && mode === undefined}
    <div class="view-tabs">
      <button class:active={activeView === 'blue'} onclick={() => view = 'blue'}>BLUE VIEW</button>
      <button class:red-active={activeView === 'red'} onclick={() => view = 'red'}>RED VIEW</button>
    </div>
  {/if}

  <div class="body">
    {#if coas.length === 0}
      <div class="empty-state"><b>[ NO DATA ]</b><span>Generate options to compare plans.</span><button onclick={() => system.generateCOAs()} disabled={system.computing}>▸ GENERATE COA</button></div>
      <div class="section">
        <div class="sec-label">STATUS</div>
        <div class="sec-value">AWAITING GENERATION</div>
      </div>
      <div class="section">
        <div class="sec-label">INPUTS</div>
        <div class="inputs">
          <div class="input-row"><span>· AIRCRAFT AVAILABILITY</span><span class="chk">READY</span></div>
          <div class="input-row"><span>· CREW REST STATUS</span><span class="chk">READY</span></div>
          <div class="input-row"><span>· WEAPONS INVENTORY</span><span class="chk">READY</span></div>
          <div class="input-row"><span>· THREAT PICTURE</span><span class="chk">READY</span></div>
          <div class="input-row"><span>· AIRSPACE & WEATHER</span><span class="chk">READY</span></div>
        </div>
      </div>
      <div class="section">
        <div class="sec-label">OPTIMISATION</div>
        <div class="sec-value muted">NSGA-II MULTI-OBJECTIVE · 4 OBJECTIVES</div>
      </div>
    {:else if activeView === 'blue'}
      {#each coas as coa (coa.id)}
        <div
          class="coa-card"
          class:selected={coa.id === system.selectedCoaId}
          class:expanded={expandedCoaId === coa.id}
          onclick={() => { system.selectCOA(coa.id); expandedCoaId = expandedCoaId === coa.id ? null : coa.id; }}
          role="button"
          tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); system.selectCOA(coa.id); expandedCoaId = expandedCoaId === coa.id ? null : coa.id; } }}
        >
          <div class="coa-hdr">
            <span class="rank" style="color:{rankColor(coa.rank)};">OPTION {coa.rank}</span>
            <span class="id mono">{getModeLabel(coa)}</span>
          </div>
          <div class="coa-metrics" class:full={expandedCoaId === coa.id}>
            <div class="metric">
              <span class="mlabel">SUCCESS</span>
              <span class="mvalue" style="color:var(--accent-green);">{coa.successProbability}%</span>
            </div>
            <div class="metric">
              <span class="mlabel">RISK</span>
              <span class="mvalue" style="color:var(--accent-red);">{coa.riskScore}</span>
            </div>
            {#if expandedCoaId === coa.id}<div class="metric">
              <span class="mlabel">TIME</span>
              <span class="mvalue" style="color:var(--accent-cyan);">{coa.timeToEffect}m</span>
            </div>{/if}
          </div>
          {#if expandedCoaId === coa.id}
          <div class="coa-missions">
            {#each Object.entries(coa.assignments) as [mid, ids]}
              {#if (ids as string[]).length > 0}
                {@const mission = system.scenarioMissions.find((item) => item.id === mid)}
                <div class="assign-row">
                  <button class="mid mono" title="Open mission brief" onclick={(event) => { event.stopPropagation(); if (mission) window.dispatchEvent(new CustomEvent('aircommand:mission-brief', { detail: mission.id })); }}>{mission?.name ?? mid.toUpperCase()}</button>
                  <span class="ids mono">{(ids as string[]).length} AC</span>
                </div>
              {/if}
            {/each}
          </div>
          <div class="coa-expl" title={coa.explanation}>{coa.explanation.length > 40 ? `${coa.explanation.slice(0, 37)}…` : coa.explanation}</div>
          {:else}<div class="detail-hint">ENTER / SELECT FOR BREAKDOWN</div>{/if}
        </div>
      {/each}
    {:else}
      <div class="red-summary" title="RED FORCE MODEL · DYNAMIC BAYESIAN THREAT BELIEF">RED FORCE · {ENEMY_ASSETS.length} ASSETS · BAYESIAN RESPONSE</div>
      {#each coas as coa (coa.id)}
        {@const response = bestResponseToCOA(coa, ENEMY_ASSETS)}
        <div class="red-card">
        <div class="red-hdr"><span>OPTION {coa.rank} · {getModeLabel(coa)}</span><span>{system.mode === 'DEGRADED' ? degradeConfidence(response.confidence) : response.confidence} CONF</span></div>
          <div class="red-action">{response.action}</div>
          <p title={response.rationale}>{response.rationale.length > 40 ? `${response.rationale.slice(0, 37)}…` : response.rationale}</p>
          <div class="red-metrics"><span>EXPECTED RED DAMAGE <b>{response.expectedDamage}</b></span><span>BLUE PAYOFF <b>{expectedPayoff(coa, response)}</b></span></div>
        </div>
      {/each}
    {/if}
  </div>

  <button class="gen" data-tour="generate-coa" onclick={() => system.generateCOAs()} disabled={system.computing}>
    <span>{btnLabel}</span>
  </button>
</div>

<style>
  .panel { background: var(--bg-panel); display: flex; flex-direction: column; overflow: hidden; position: relative; height: 100%; }
  .hdr { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; }
  .hdr-right { display: flex; align-items: center; gap: 10px; }
  .chevron { border:0; background:transparent; color:var(--accent-cyan); cursor:pointer; font:14px var(--font-mono); }
  .recomputing { font-size: 8px; letter-spacing: 0.15em; color: var(--accent-cyan); animation: shimmer 0.85s ease-in-out infinite; }
  @keyframes shimmer {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  .hdr .count { color: var(--accent-amber); }
  .view-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: var(--border-subtle); }
  .view-tabs button { border: 0; background: var(--bg-elevated); color: var(--text-muted); font: 9px var(--font-mono); letter-spacing: .12em; padding: 8px; cursor: pointer; }
  .view-tabs button.active { color: var(--accent-cyan); background: color-mix(in srgb, var(--accent-cyan) 7.000000000000001%, transparent); }
  .view-tabs button.red-active { color: var(--accent-red); background: color-mix(in srgb, var(--accent-red) 7.000000000000001%, transparent); }
  .body { flex: 1; padding: 12px; overflow-y: auto; }
  .empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; min-height:94px; padding:12px; text-align:center; color:var(--text-muted); font:8px var(--font-mono); letter-spacing:.08em; }
  .empty-state b { color:var(--accent-cyan); font-size:10px; }
  .empty-state button { padding:5px 8px; border:1px solid var(--border-strong); background:transparent; color:var(--accent-cyan); font:8px var(--font-mono); cursor:pointer; }
  .body::-webkit-scrollbar { width: 3px; }
  .body::-webkit-scrollbar-thumb { background: var(--border-strong); }
  .section { margin-bottom: 18px; }
  .sec-label { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
  .sec-value { font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); letter-spacing: 0.05em; }
  .sec-value.muted { color: var(--text-muted); }
  .inputs { display: flex; flex-direction: column; gap: 4px; }
  .input-row { display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); padding: 3px 0; }
  .chk { font-size: 9px; letter-spacing: 0.15em; color: var(--accent-green); }
  .coa-card { border: 1px solid var(--border-subtle); background: var(--bg-elevated); padding: 10px; margin-bottom: 10px; cursor: pointer; transition: border-color 0.15s, background 0.15s; }
  .coa-card:hover { border-color: var(--border-strong); }
  .coa-card.selected { border-color: var(--accent-cyan); box-shadow: 0 0 12px rgba(0,240,255,0.15), inset 0 0 12px rgba(0,240,255,0.04); }
  .coa-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .rank { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.18em; font-weight: 700; }
  .id { color: var(--text-muted); font-size: 9px; }
  .coa-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 6px 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); margin-bottom: 8px; }
  .coa-metrics.full { grid-template-columns: 1fr 1fr 1fr; }
  .metric { display: flex; flex-direction: column; gap: 2px; }
  .mlabel { font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.15em; color: var(--text-muted); text-transform: uppercase; }
  .mvalue { font-family: var(--font-mono); font-size: 13px; font-weight: 500; }
  .coa-missions { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
  .assign-row { display: flex; justify-content: space-between; font-size: 9px; }
  .mid { padding:0; border:0; background:transparent; color: var(--accent-amber); letter-spacing: 0.1em; cursor:pointer; text-align:left; font:inherit; }
  .mid:hover { text-decoration:underline; }
  .ids { color: var(--text-muted); }
  .coa-expl { font-family: var(--font-mono); font-size: 9px; line-height: 1.6; color: var(--text-secondary); }
  .detail-hint { color:var(--text-muted); font:7px var(--font-mono); letter-spacing:.1em; }
  .mono { font-family: var(--font-mono); }
  .red-summary { color: var(--text-muted); font: 8px var(--font-mono); letter-spacing: .1em; line-height: 1.6; margin-bottom: 10px; }
  .red-card { border: 1px solid color-mix(in srgb, var(--accent-red) 55.00000000000001%, transparent); background: color-mix(in srgb, var(--accent-red) 3.5000000000000004%, transparent); padding: 10px; margin-bottom: 8px; font-family: var(--font-mono); }
  .red-hdr, .red-metrics { display: flex; justify-content: space-between; gap: 8px; font-size: 8px; letter-spacing: .1em; color: var(--text-muted); }
  .red-hdr span:first-child, .red-action { color: var(--accent-red); }
  .red-action { margin: 8px 0 4px; font-size: 10px; letter-spacing: .08em; }
  .red-card p { color: var(--text-secondary); font-size: 8.5px; line-height: 1.5; margin: 0 0 8px; }
  .red-metrics { border-top: 1px solid color-mix(in srgb, var(--accent-red) 25%, transparent); padding-top: 7px; } .red-metrics b { color: var(--text-primary); }
  .gen { margin: 12px; padding: 14px; background: transparent; border: 1px solid var(--accent-cyan); color: var(--accent-cyan); font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.22em; cursor: pointer; transition: background 0.15s, box-shadow 0.15s, color 0.15s; text-align: center; }
  .gen:hover:not(:disabled) { background: rgba(0, 240, 255, 0.08); box-shadow: 0 0 16px rgba(0, 240, 255, 0.35), inset 0 0 16px rgba(0, 240, 255, 0.08); }
  .gen:disabled { opacity: 0.6; cursor: wait; }
</style>
