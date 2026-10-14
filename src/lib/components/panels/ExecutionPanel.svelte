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
          <span class="name">{am.missionName}</span>
          <span class="phase">{am.phase}</span>
        </div>

        <div class="ref">
          {template?.reference ?? 'TEMPLATE N/A'}
          {#if weapon}· <span class="wpn">{weapon.name}</span>{/if}
        </div>

        <div class="timeline">
          {#each ['INGRESS','WEZ','RELEASE','EGRESS','RTB'] as p (p)}
            <div class="tphase {phaseStatus(am.phase, p)}">
              <div class="dot"></div>
              {#if p !== 'RTB'}<div class="line"></div>{/if}
              <div class="tlabel">{p}</div>
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

        {#if am.narrative.length > 1}
          <div class="narrative">
            {#each am.narrative.slice(1).slice(-2) as line}
              <div class="n-line">› {line}</div>
            {/each}
          </div>
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
  .name { color: var(--accent-amber); font-size: 11px; letter-spacing: 0.1em; }
  .phase { font-size: 9px; color: var(--accent-cyan); letter-spacing: 0.18em; }
  .ref { font-size: 9px; color: var(--text-muted); margin-top: 4px; }
  .wpn { color: var(--accent-green); }

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
