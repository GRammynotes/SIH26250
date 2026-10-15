<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { phaseOrder } from '../../engine/missionExecutor';
  import { HISTORICAL_MISSIONS } from '../../data/historicalMissions';
  import { WEAPONS } from '../../data/weapons';
  let { onCollapse }: { onCollapse?: () => void } = $props();

  let activeList = $derived(system.activeMissions.filter((m) => m.phase !== 'COMPLETE' && m.phase !== 'ABORTED'));
  let pending = $derived(system.activeMissions.find((m) => m.pendingDecision) ?? null);

  function phaseStatus(amPhase: string, target: string) {
    const order = phaseOrder();
    const a = order.indexOf(amPhase as any);
    const b = order.indexOf(target as any);
    if (b < a) return 'complete';
    if (b === a) return 'current';
    return 'pending';
  }

  function phaseProgress(amPhase: string, target: string): number {
    const order = phaseOrder();
    const a = order.indexOf(amPhase as any);
    const b = order.indexOf(target as any);
    if (b < a) return 1;
    if (b > a) return 0;
    return 0.5;
  }
</script>

{#if activeList.length > 0}
  <div class="exec-panel corners">
    <div class="hdr">
      <span>ACTIVE MISSIONS</span>
      <span class="count">{activeList.length} IN FLIGHT</span>
      {#if onCollapse}<button class="chevron" aria-label="Collapse right panel" title="Collapse right panel" onclick={() => onCollapse?.()}>›</button>{/if}
    </div>

    {#each activeList as am (am.id)}
      {@const template = HISTORICAL_MISSIONS[am.templateId]}
      {@const weapon = am.weaponId ? WEAPONS[am.weaponId] : null}
      <div class="mission-card" class:pending={am.pendingDecision !== null}>
        <div class="top">
          <button class="name" title="Open mission brief" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:mission-brief', { detail: am.missionId }))}>{am.missionName}</button>
          <span class="phase">{am.phase}</span>
        </div>

        <div class="ref">
          {template?.reference ?? 'TEMPLATE N/A'}
          {#if weapon}· <button class="wpn" title="Open {weapon.name} specification" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:weapon-detail', { detail: weapon.id }))}>{weapon.name}</button>{/if}
        </div>

        <div class="timeline">
          {#each ['INGRESS','WEZ','RELEASE','EGRESS','RTB'] as p (p)}
            <div class="tphase {phaseStatus(am.phase, p)}">
              <div class="dot"></div>
              {#if p !== 'RTB'}<div class="line"></div>{/if}
              <div class="tlabel">{p}</div>
              {#each am.decisionsMade.filter((decision) => decision.point.atPhase === p) as decision, decisionIndex (`${decision.at}-${decisionIndex}`)}
                <button class="decision-chip" type="button" title={`${decision.point.title}: ${decision.branch.label}`} aria-label={`Decision at ${p}: ${decision.branch.label}`}>◆<small>{decision.branch.label}</small></button>
              {/each}
            </div>
          {/each}
        </div>

        <div class="aircraft-row">
          {#each am.aircraftIds as acId}
            {@const ac = system.aircraft.find((a) => a.id === acId)}
            {#if ac}
              <span class="ac-tag">{ac.tailNumber}</span>
            {/if}
          {/each}
        </div>

        {#if am.pendingDecision}
          <div class="pending-banner">AWAITING COMMAND · {am.pendingDecision.title}</div>
        {/if}

      </div>
    {/each}
  </div>
{/if}

<style>
  .exec-panel {
    grid-area: right;
    background: var(--bg-panel);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    border-left: 1px solid var(--border-subtle);
    position: relative;
  }
  .exec-panel::-webkit-scrollbar { width: 3px; }
  .exec-panel::-webkit-scrollbar-thumb { background: var(--border-strong); }

  .hdr {
    display: flex; justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
    color: var(--text-muted); text-transform: uppercase;
    position: sticky; top: 0; background: var(--bg-panel); z-index: 2;
  }
  .count { color: var(--accent-cyan); }

  .mission-card {
    padding: 12px;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-mono);
  }
  .mission-card.pending { background: color-mix(in srgb, var(--accent-red) 6%, transparent); }

  .top { display: flex; justify-content: space-between; align-items: center; }
  .name { padding:0; border:0; background:transparent; color: var(--accent-amber); font:11px var(--font-mono); letter-spacing: 0.1em; cursor:pointer; text-align:left; }
  .name:hover,.wpn:hover { text-decoration:underline; }
  .phase { font-size: 9px; color: var(--accent-cyan); letter-spacing: 0.18em; }
  .ref { font-size: 9px; color: var(--text-muted); margin-top: 4px; }
  .wpn { padding:0; border:0; background:transparent; color: var(--accent-green); font:inherit; cursor:pointer; }

  .timeline {
    display: flex;
    margin: 12px 0 8px;
    align-items: center;
  }
  .tphase {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }
  .decision-chip { position:absolute; top:19px; z-index:2; display:flex; flex-direction:column; align-items:center; gap:2px; padding:0; border:0; background:transparent; color:var(--accent-cyan); font:9px var(--font-mono); cursor:help; }
  .decision-chip small { max-width:76px; padding:2px 3px; border:1px solid var(--border-strong); background:var(--bg-panel); color:var(--text-secondary); font-size:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .decision-chip:focus-visible { outline:1px solid var(--accent-cyan); outline-offset:2px; }
  .dot {
    width: 8px; height: 8px;
    border: 1px solid var(--border-strong);
    background: var(--bg-base);
    transition: all 0.3s;
  }
  .tphase.complete .dot { background: var(--accent-green); border-color: var(--accent-green); }
  .tphase.current .dot {
    background: var(--accent-cyan); border-color: var(--accent-cyan);
    box-shadow: 0 0 8px var(--accent-cyan);
    animation: pulse 1.2s ease-in-out infinite;
  }
  .line {
    position: absolute;
    top: 4px; left: calc(50% + 4px); width: calc(100% - 8px);
    height: 1px; background: var(--border-subtle);
  }
  .tphase.complete .line { background: var(--accent-green); opacity: 0.6; }
  .tlabel {
    margin-top: 6px;
    font-size: 7px; letter-spacing: 0.1em;
    color: var(--text-muted);
  }
  .tphase.current .tlabel { color: var(--accent-cyan); }
  .tphase.complete .tlabel { color: var(--accent-green); }

  .aircraft-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .ac-tag {
    font-size: 9px;
    padding: 2px 6px;
    border: 1px solid var(--border-strong);
    color: var(--accent-cyan);
    letter-spacing: 0.1em;
  }

  .pending-banner {
    margin-top: 10px;
    padding: 8px 10px;
    border: 1px solid var(--accent-red);
    background: color-mix(in srgb, var(--accent-red) 12%, transparent);
    color: var(--accent-red);
    font-size: 9px; letter-spacing: 0.15em;
    animation: pulse 1.4s ease-in-out infinite;
  }

  .narrative { margin-top: 8px; }
  .n-line {
    font-size: 9px;
    color: var(--text-secondary);
    line-height: 1.5;
    letter-spacing: 0.04em;
  }
</style>
