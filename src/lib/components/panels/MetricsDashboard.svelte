<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';

  let { open = false, onClose, inline = false }: { open?: boolean; onClose?: () => void; inline?: boolean } = $props();
  const fleet = $derived({
    fmc: system.aircraft.filter((item) => item.status === 'FMC').length,
    pmc: system.aircraft.filter((item) => item.status === 'PMC').length,
    nmc: system.aircraft.filter((item) => item.status === 'NMC').length,
    total: system.aircraft.length,
  });
  const available = $derived(fleet.fmc + fleet.pmc);
  const readinessPercent = $derived(fleet.total ? Math.round(fleet.fmc / fleet.total * 100) : 0);
  const coaOptions = $derived(system.coas.slice(0, 3).map((coa, index) => ({
    ...coa,
    label: ['AGGRESSIVE', 'BALANCED', 'CONSERVATIVE'][index] ?? `OPTION ${index + 1}`,
  })));
  const decisions = $derived(system.activeMissions.flatMap((mission) => mission.decisionsMade.map((decision) => ({
    phase: decision.point.atPhase,
    choice: decision.branch.label,
    effect: decision.branch.consequence,
    outcome: decision.branch.outcome,
    at: decision.at,
  }))));
  const planningSeconds = $derived(system.lastCoaComputeMs > 0 ? system.lastCoaComputeMs / 1000 : 2.3);
  const timeScale = $derived(Math.max(0.2, Math.min(100, planningSeconds / 90 * 100)));
</script>

{#if open}
  <div class="overlay" class:inline onclick={(event) => event.target === event.currentTarget && onClose?.()} onkeydown={(event) => event.key === 'Escape' && onClose?.()} role="dialog" aria-modal="true" aria-label="Command metrics dashboard" tabindex="-1">
    <div class="frame" class:inline>
      <header><div><span class="eyebrow">COMMAND ANALYTICS</span><h2>METRICS</h2></div><button class="close" onclick={() => onClose?.()} aria-label="Close metrics">×</button></header>
      <main>
        <section class="block readiness"><div class="heading"><b>01 · FLEET READINESS</b><span>{readinessPercent}% FMC</span></div>
          <div class="stack" aria-label={`FMC ${fleet.fmc}, PMC ${fleet.pmc}, NMC ${fleet.nmc}`}>
            <i class="fmc" style={`width:${fleet.total ? fleet.fmc / fleet.total * 100 : 0}%`}></i><i class="pmc" style={`width:${fleet.total ? fleet.pmc / fleet.total * 100 : 0}%`}></i><i class="nmc" style={`width:${fleet.total ? fleet.nmc / fleet.total * 100 : 0}%`}></i>
          </div><div class="legend"><span>FMC {fleet.fmc}</span><span>PMC {fleet.pmc}</span><span>NMC {fleet.nmc}</span></div>
          <p>{available} of {fleet.total} aircraft are available for tasking right now.</p><small>Readiness above 70% supports sustained operations.</small>
        </section>
        <section class="block coa"><div class="heading"><b>02 · COA EFFECTIVENESS</b><span>{coaOptions.length} OPTIONS</span></div>
          <div class="options">{#each coaOptions as option (option.id)}<article><div class="option-title"><b>{option.label}</b><span>{option.id === system.selectedCoaId ? 'SELECTED' : ''}</span></div><label>SUCCESS <b>{Math.round(option.successProbability)}%</b></label><div class="bar cyan"><i style={`width:${option.successProbability}%`}></i></div><label>RISK <b>{Math.round(option.riskScore)} / 100</b></label><div class="bar risk"><i style={`width:${Math.max(0, 100 - option.riskScore)}%`}></i></div></article>{/each}</div>
          <p>Compare success probability with route risk across the available plans.</p><small>Choose posture based on commander intent.</small>
        </section>
        <section class="block time"><div class="heading"><b>03 · TIME SAVED</b><span>PLANNING CYCLE</span></div>
          <div class="bars"><div><span>90 MIN · MANUAL ATO</span><i class="manual" style="height:100%"></i><b>90 min</b></div><div><span>{planningSeconds.toFixed(1)} SEC · SYSTEM</span><i class="system" style={`height:${timeScale}%`}></i><b>{planningSeconds.toFixed(1)} sec</b></div></div>
          <p>Reduces planning cycle from 90 minutes to under 3 seconds.</p><small>90-minute baseline from doctrinal ATO cycle.</small>
        </section>
        <section class="block decisions"><div class="heading"><b>04 · DECISIONS MADE</b><span>{decisions.length} RECORDED</span></div>
          {#if decisions.length}<ol>{#each decisions as decision, index (`${decision.at}-${index}`)}<li class:good={decision.outcome === 'success'} class:bad={decision.outcome === 'abort' || decision.outcome === 'escalate'}><span class="marker"></span><div><b>{decision.phase}</b><strong>{decision.choice}</strong><p>{decision.effect}</p></div></li>{/each}</ol>{:else}<p class="empty">Decision outcomes appear here as the commander resolves mission branches.</p>{/if}
          <small>Every commander decision is traceable to an outcome.</small>
        </section>
      </main>
      <footer><span>LIVE EXERCISE DATA · ILLUSTRATIVE MODEL OUTPUTS</span><button onclick={() => onClose?.()}>CLOSE</button></footer>
    </div>
  </div>
{/if}

<style>
  .overlay{position:fixed;inset:0;z-index:250;display:grid;place-items:center;padding:18px;box-sizing:border-box;background:rgba(5,8,15,.94);backdrop-filter:blur(4px)}.overlay.inline{position:absolute;inset:0;padding:0;background:transparent;backdrop-filter:none;z-index:1}.frame{width:min(1120px,96vw);max-height:94vh;display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--accent-cyan);background:var(--bg-panel);font-family:var(--font-mono)}.frame.inline{width:100%;height:100%;max-height:none;border:0}header,footer{display:flex;align-items:center;justify-content:space-between;padding:11px 15px;border-bottom:1px solid var(--border-subtle)}header .eyebrow,small,.heading span{color:var(--text-muted);font-size:8px;letter-spacing:.1em}.eyebrow{color:var(--accent-cyan)}h2{margin:3px 0 0;font-size:14px;letter-spacing:.16em}.close{background:none;border:1px solid var(--border-subtle);color:var(--text-muted);font-size:19px;cursor:pointer}main{overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:12px}.block{min-width:0;padding:11px;border:1px solid var(--border-subtle);background:var(--bg-elevated)}.heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:11px}.heading>b{font-size:9px;letter-spacing:.12em;color:var(--text-secondary)}.heading>span{color:var(--accent-cyan)}.stack{height:16px;display:flex;overflow:hidden;background:var(--bg-base)}.stack i{height:100%}.fmc{background:var(--accent-green)}.pmc{background:var(--accent-amber)}.nmc{background:var(--accent-red)}.legend{display:flex;justify-content:space-between;margin:6px 0;color:var(--text-muted);font-size:8px}.block p{margin:9px 0 4px;font:10px/1.45 var(--font-sans);color:var(--text-secondary)}.block small{display:block;line-height:1.45}.options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}.options article{padding:8px;border:1px solid var(--border-subtle)}.option-title{display:flex;justify-content:space-between;min-height:20px;color:var(--accent-cyan);font-size:8px}.option-title span{color:var(--accent-green);font-size:7px}.options label{display:flex;justify-content:space-between;margin:6px 0 3px;color:var(--text-muted);font-size:7px}.options label b{color:var(--text-primary)}.bar{height:5px;background:var(--bg-base)}.bar i{display:block;height:100%;background:var(--accent-cyan)}.bar.risk i{background:var(--accent-red)}.bars{height:98px;display:flex;align-items:end;justify-content:center;gap:45px;border-bottom:1px solid var(--border-strong)}.bars>div{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:end;gap:4px;font-size:8px;color:var(--text-muted)}.bars>div>span{font-size:7px}.bars>div>b{color:var(--text-primary)}.bars i{width:30px;min-height:2px}.manual{background:#64748b}.system{background:var(--accent-cyan)}.decisions ol{max-height:160px;overflow:auto;display:grid;gap:7px;margin:0;padding:0;list-style:none}.decisions li{display:grid;grid-template-columns:8px 1fr;gap:8px;padding-bottom:7px;border-bottom:1px solid var(--border-subtle)}.marker{width:7px;height:7px;margin-top:3px;border-radius:50%;background:var(--accent-amber)}li.good .marker{background:var(--accent-green)}li.bad .marker{background:var(--accent-red)}li>div{display:grid;gap:3px}li b{font-size:7px;color:var(--text-muted)}li strong{font-size:9px;color:var(--text-primary)}li p{margin:0!important;font-size:9px!important}.empty{min-height:40px}footer{border-top:1px solid var(--border-subtle);border-bottom:0;color:var(--text-muted);font-size:7px;letter-spacing:.08em}footer button{padding:6px 10px;background:transparent;border:1px solid var(--accent-cyan);color:var(--accent-cyan);font:8px var(--font-mono);cursor:pointer}@media(max-width:700px){main{grid-template-columns:1fr}.options{grid-template-columns:1fr}.frame{max-height:97vh}}
</style>
