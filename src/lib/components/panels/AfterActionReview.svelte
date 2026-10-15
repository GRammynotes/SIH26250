<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { HISTORICAL_MISSIONS } from '../../data/historicalMissions';
  import { WEAPONS } from '../../data/weapons';

  let {
    missionId = null,
    onClose,
    onReplay,
  }: {
    missionId?: string | null;
    onClose?: () => void;
    onReplay?: (missionId: string) => void;
  } = $props();

  const activeMission = $derived(
    system.activeMissions.find((m) => m.id === missionId || m.missionId === missionId) ?? null
  );

  const template = $derived(
    activeMission ? HISTORICAL_MISSIONS[activeMission.templateId] : null
  );

  const weapon = $derived(
    activeMission?.weaponId ? WEAPONS[activeMission.weaponId] : null
  );

  const assignedAircraft = $derived.by(() => {
    if (!activeMission) return [];
    return activeMission.aircraftIds.map((id) => {
      const ac = system.aircraft.find((a) => a.id === id);
      // Determine final status based on branch effects
      let finalStatus = 'FMC';
      const killed = activeMission.decisionsMade.some((d) => d.branch.effect.killAircraft === id);
      const highRisk = activeMission.riskDelta > 15;
      if (killed) finalStatus = 'NMC';
      else if (highRisk) finalStatus = 'PMC';

      return {
        id,
        tailNumber: ac?.tailNumber ?? id.toUpperCase(),
        type: ac?.type ?? 'STRIKE',
        base: ac?.base ?? 'UNKNOWN',
        finalStatus,
        fuelAtLaunch: 95,
        fuelNow: ac ? Math.round(ac.fuel) : 74,
      };
    });
  });

  const threatsAddedCount = $derived.by(() => {
    if (!activeMission) return 0;
    return activeMission.decisionsMade.filter((d) => d.branch.effect.addThreat).length;
  });

  const weaponExpended = $derived.by(() => {
    if (!activeMission) return { name: 'NONE', status: 'NOT EXPENDED' };
    const name = weapon ? weapon.name : 'PGM PACKAGE';
    const released = activeMission.phase === 'COMPLETE' && activeMission.outcome !== 'ABORTED';
    return {
      name,
      status: released ? 'EXPENDED (RELEASE CONFIRMED)' : 'RETAINED (ABORT / RTB)',
    };
  });

  const outcomeColor = $derived.by(() => {
    if (!activeMission) return 'var(--text-muted)';
    if (activeMission.outcome === 'SUCCESS') return 'var(--accent-green)';
    if (activeMission.outcome === 'PARTIAL') return 'var(--accent-amber)';
    if (activeMission.outcome === 'ABORTED') return 'var(--accent-red)';
    return 'var(--accent-cyan)';
  });

  const battleDamage = $derived.by(() => {
    if (!activeMission) return { status: 'UNKNOWN', confidence: 'LOW', reattack: 'ASSESS', narrative: 'No completed mission record is available for assessment.' };
    const abortBranch = activeMission.decisionsMade.some((d) => d.branch.outcome === 'abort');
    const status = activeMission.outcome === 'SUCCESS' && !abortBranch
      ? 'DESTROYED'
      : activeMission.outcome === 'PARTIAL'
        ? 'DAMAGED'
        : abortBranch || activeMission.outcome === 'ABORTED'
          ? 'MISSED'
          : 'UNKNOWN';
    const confidence = activeMission.decisionsMade.length === 0
      ? 'HIGH'
      : activeMission.decisionsMade.length === 1
        ? 'MEDIUM'
        : 'LOW';
    const reattack = status === 'DAMAGED' ? 'NO' : status === 'UNKNOWN' ? 'ASSESS' : 'YES';
    const weaponName = weapon?.name ?? 'PGM';
    return {
      status,
      confidence,
      reattack,
      narrative: `Strike package released 2 × ${weaponName} at grid ${activeMission.target.lat.toFixed(2)}N/${activeMission.target.lng.toFixed(2)}E. Post-strike telemetry ${status === 'UNKNOWN' ? 'awaiting correlation' : 'received'} at T+14. BDA confidence ${confidence}.`,
    };
  });
  const outcomeOdds = $derived.by(() => {
    const odds = activeMission?.templateId === 'balakot'
      ? [{ label: 'TARGET DESTROYED', probability: 72, status: 'DESTROYED', consequence: 'Primary target effect achieved; strike package returns for full BDA correlation.' }, { label: 'TARGET DAMAGED', probability: 22, status: 'DAMAGED', consequence: 'Partial effect; re-attack planning and collateral review may be required.' }, { label: 'TARGET MISSED', probability: 6, status: 'MISSED', consequence: 'No confirmed effect; preserve the force and reassess intelligence.' }]
      : activeMission?.templateId === 'sead_template'
        ? [{ label: 'RADAR SUPPRESSED', probability: 64, status: 'DESTROYED', consequence: 'Threat emission ceases and the follow-on corridor opens.' }, { label: 'RADAR DEGRADED', probability: 27, status: 'DAMAGED', consequence: 'Coverage is reduced but the threat may recover.' }, { label: 'RADAR RELOCATED', probability: 9, status: 'MISSED', consequence: 'Last-known coordinates are empty; update the threat picture.' }]
        : [{ label: 'TARGET DESTROYED', probability: 68, status: 'DESTROYED', consequence: 'Standoff strike achieves the assessed effect with package outside the engagement zone.' }, { label: 'TARGET DAMAGED', probability: 25, status: 'DAMAGED', consequence: 'Partial effect; refine targeting data before any follow-on.' }, { label: 'TARGET MISSED', probability: 7, status: 'MISSED', consequence: 'No confirmed effect; review weapon updates and target coordinates.' }];
    return odds;
  });

  function exportAAR() {
    if (!activeMission) return;
    const lines: string[] = [];
    lines.push('================================================================');
    lines.push(`AIR COMMAND · AFTER-ACTION REVIEW · ${activeMission.missionName.toUpperCase()}`);
    lines.push(`SYSTEM IDENTIFIER: ${activeMission.id}`);
    lines.push(`OUTCOME: ${activeMission.outcome}`);
    lines.push(`TEMPLATE REFERENCE: ${template?.reference ?? activeMission.templateId}`);
    lines.push(`TIMESTAMP: ${new Date().toISOString()}`);
    lines.push('================================================================\n');

    lines.push('1. DECISION TRAIL:');
    if (activeMission.decisionsMade.length === 0) {
      lines.push('   No commander branch decisions required during sortie.');
    } else {
      for (const d of activeMission.decisionsMade) {
        lines.push(`   - [${d.point.atPhase}] ${d.point.title} (${d.at})`);
        lines.push(`     CHOICE: ${d.branch.label} [${d.branch.tag}]`);
        lines.push(`     CONSEQUENCE: ${d.branch.consequence}`);
        lines.push(`     EFFECT: riskDelta=${d.branch.effect.riskDelta ?? 0}`);
      }
    }
    lines.push('\n2. MISSION NARRATIVE LOG:');
    for (const n of activeMission.narrative) {
      lines.push(`   ${n}`);
    }
    lines.push('\n3. FORCE RECOVERY & WEAPON STATE:');
    lines.push(`   WEAPON: ${weaponExpended.name} · ${weaponExpended.status}`);
    for (const ac of assignedAircraft) {
      lines.push(`   - TAIL: ${ac.tailNumber} | TYPE: ${ac.type} | BASE: ${ac.base} | STATUS: ${ac.finalStatus} | FUEL: ${ac.fuelNow}% (LAUNCH: ${ac.fuelAtLaunch}%)`);
    }
    lines.push('\n4. RISK SUMMARY:');
    lines.push(`   ACCUMULATED RISK DELTA: ${activeMission.riskDelta > 0 ? '+' : ''}${activeMission.riskDelta}`);
    lines.push(`   THREATS SPAWNED ENROUTE: ${threatsAddedCount}`);
    lines.push(`   DOCTRINAL BASELINE COMPARISON: ${template?.codename ?? 'STANDARD'} baseline`);
    lines.push('\n5. BATTLE DAMAGE ASSESSMENT:');
    lines.push(`   TARGET STATUS: ${battleDamage.status}`);
    lines.push(`   CONFIDENCE: ${battleDamage.confidence}`);
    lines.push(`   RE-ATTACK RECOMMENDED: ${battleDamage.reattack}`);
    lines.push(`   ${battleDamage.narrative}`);
    lines.push('\n================================================================');
    lines.push('END OF BRIEFING · AIR COMMAND ARCHIVE RECORD');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AAR_${activeMission.missionName.replace(/\s+/g, '_')}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReplay() {
    if (!activeMission) return;
    onReplay?.(activeMission.id);
  }
</script>

{#if activeMission}
  <div
    class="overlay"
    onclick={(e) => e.target === e.currentTarget && onClose?.()}
    onkeydown={(e) => e.key === 'Escape' && onClose?.()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="frame corners">
      <!-- HEADER -->
      <header>
        <div class="hdr-left">
          <span class="eyebrow">POST-MISSION INTELLIGENCE & EVALUATION</span>
          <div class="title-row">
            <h2>AFTER-ACTION REVIEW · {activeMission.missionName}</h2>
            <span class="outcome-badge" style="color:{outcomeColor}; border-color:{outcomeColor};">
              {activeMission.outcome}
            </span>
          </div>
          <span class="sub">{template?.reference ?? 'MISSION SORTIE RECORD'} · TARGET: {activeMission.target.lat.toFixed(3)}N, {activeMission.target.lng.toFixed(3)}E</span>
        </div>
        <button class="close-btn" onclick={() => onClose?.()} aria-label="Close">✕</button>
      </header>

      <!-- BODY SECTIONS -->
      <div class="body-scroll">
        <!-- 1. DECISION TRAIL -->
        <section class="sec">
          <div class="sec-hdr">
            <span class="sec-num">01</span>
            <h3>COMMANDER DECISION TRAIL</h3>
            <span class="sec-meta">{activeMission.decisionsMade.length} DECISIONS RECORDED</span>
          </div>
          {#if activeMission.decisionsMade.length === 0}
            <div class="empty-box">SORTIE CONDUCTED ACCORDING TO PRIMARY FLIGHT PLAN WITHOUT COMMAND INTERVENTION.</div>
          {:else}
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PHASE</th>
                    <th>DECISION GATE</th>
                    <th>CHOICE TAKEN</th>
                    <th>CONSEQUENCE</th>
                  </tr>
                </thead>
                <tbody>
                  {#each activeMission.decisionsMade as dm}
                    <tr>
                      <td class="phase-cell">{dm.point.atPhase}</td>
                      <td class="dec-cell">
                        <strong>{dm.point.title}</strong>
                        <span class="time-sub">{dm.at}</span>
                      </td>
                      <td class="choice-cell">
                        <span class="choice-label">{dm.branch.label}</span>
                        <span class="tag-pill" style="color:{dm.branch.tagColor}; border-color:{dm.branch.tagColor};">
                          {dm.branch.tag}
                        </span>
                      </td>
                      <td class="consequence-cell">{dm.branch.consequence}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </section>

        <!-- 2. MISSION NARRATIVE -->
        <section class="sec">
          <div class="sec-hdr">
            <span class="sec-num">02</span>
            <h3>MISSION NARRATIVE & EVENT STREAM</h3>
            <span class="sec-meta">{activeMission.narrative.length} LOG ENTRIES</span>
          </div>
          <div class="narrative-box">
            {#each activeMission.narrative as item, idx}
              <div class="narrative-line">
                <span class="line-num">{String(idx + 1).padStart(2, '0')}</span>
                <span class="line-txt">{item}</span>
              </div>
            {/each}
          </div>
        </section>

        <!-- 3. FORCE RECOVERY -->
        <section class="sec">
          <div class="sec-hdr">
            <span class="sec-num">03</span>
            <h3>FORCE RECOVERY & STORES EXPENDITURE</h3>
            <span class="sec-meta">{assignedAircraft.length} PLATFORMS MONITORED</span>
          </div>

          <div class="ac-grid">
            {#each assignedAircraft as ac}
              <div class="ac-card">
                <div class="ac-top">
                  <span class="tail">{ac.tailNumber}</span>
                  <span class="type">{ac.type}</span>
                  <span class="base">BASE: {ac.base.toUpperCase()}</span>
                  <span class="status-pill status-{ac.finalStatus.toLowerCase()}">{ac.finalStatus}</span>
                </div>
                <div class="ac-fuel">
                  <div class="fuel-row">
                    <span>FUEL DELTA</span>
                    <span class="fuel-val">{ac.fuelNow}% (LAUNCH: {ac.fuelAtLaunch}%)</span>
                  </div>
                  <div class="fuel-bar"><div class="fill" style="width:{ac.fuelNow}%;"></div></div>
                </div>
              </div>
            {/each}
          </div>

          <div class="weapon-expended-bar">
            <span class="w-label">ORDNANCE EXPENDITURE:</span>
            {#if weapon}<button class="w-name" title="Open {weapon.name} specification" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:weapon-detail', { detail: weapon.id }))}>{weaponExpended.name}</button>{:else}<span class="w-name">{weaponExpended.name}</span>{/if}
            <span class="w-status {activeMission.outcome === 'ABORTED' ? 'retained' : 'released'}">
              {weaponExpended.status}
            </span>
          </div>
        </section>

        <!-- 4. RISK SUMMARY -->
        <section class="sec">
          <div class="sec-hdr">
            <span class="sec-num">04</span>
            <h3>RISK POSTURE & DOCTRINAL COMPARISON</h3>
            <span class="sec-meta">NSGA-II EVALUATION</span>
          </div>
          <div class="risk-grid">
            <div class="risk-card">
              <span class="rk-lbl">ACCUMULATED RISK DELTA</span>
              <span
                class="rk-val"
                style="color: {activeMission.riskDelta > 20 ? 'var(--accent-red)' : activeMission.riskDelta > 0 ? 'var(--accent-amber)' : 'var(--accent-green)'};"
              >
                {activeMission.riskDelta > 0 ? '+' : ''}{activeMission.riskDelta}
              </span>
              <span class="rk-sub">DELTA INDUCED BY TACTICAL CHOICES</span>
            </div>
            <div class="risk-card">
              <span class="rk-lbl">THREATS SPAWNED ENROUTE</span>
              <span class="rk-val {threatsAddedCount > 0 ? 'amber' : 'green'}">
                {threatsAddedCount}
              </span>
              <span class="rk-sub">POP-UP RADAR / SAM INTERCEPTS</span>
            </div>
            <div class="risk-card comparison">
              <span class="rk-lbl">HISTORICAL BASELINE COMPARISON</span>
              <div class="cmp-text">
                <div class="cmp-line">
                  <strong>THIS RUN:</strong> {activeMission.decisionsMade.length} decisions · {activeMission.riskDelta > 0 ? `+${activeMission.riskDelta}` : '0'} risk · {threatsAddedCount} threats
                </div>
                <div class="cmp-line muted">
                  <strong>HISTORIC ({template?.codename ?? 'DOCTRINE'}):</strong> {template?.narrative.slice(0, 110)}...
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 5. BATTLE DAMAGE ASSESSMENT -->
        <section class="sec bda-section">
          <div class="sec-hdr">
            <span class="sec-num">05</span>
            <h3>BATTLE DAMAGE ASSESSMENT</h3>
            <span class="sec-meta">POST-STRIKE CORRELATION</span>
          </div>
          <div class="bda-box">
            <div class="bda-grid">
              <div><span>TARGET STATUS</span><strong class="bda-status status-{battleDamage.status.toLowerCase()}">{battleDamage.status}</strong></div>
              <div><span>CONFIDENCE</span><strong>{battleDamage.confidence}</strong></div>
              <div><span>RE-ATTACK</span><strong>{battleDamage.reattack}</strong></div>
            </div>
            <p>{battleDamage.narrative}</p>
          </div>
          <div class="outcome-odds"><div class="odds-title">ILLUSTRATIVE OUTCOME MODEL <span>SIMULATION ESTIMATES · NOT OPERATIONAL PREDICTIONS</span></div><div class="odds-grid">{#each outcomeOdds as item}<article class:actual={battleDamage.status === item.status}><b>{item.label}</b><strong>{item.probability}%</strong><p>{item.consequence}</p>{#if battleDamage.status === item.status}<small>ACTUAL EXERCISE OUTCOME</small>{/if}</article>{/each}</div><button class="replay-branch" onclick={handleReplay}>↻ REPLAY WITH DIFFERENT DECISION</button></div>
        </section>
      </div>

      <!-- ACTION BAR -->
      <footer>
        <div class="footer-left">
          CLASSIFICATION: SECURE TACTICAL ARCHIVE · DE-ESCALATION RECORD VERIFIED
        </div>
        <div class="actions">
          <button class="btn btn-archive" onclick={() => onClose?.()}>
            ◈ ARCHIVE
          </button>
          <button class="btn btn-export" onclick={exportAAR}>
            ⇩ EXPORT (.TXT)
          </button>
          <button class="btn btn-replay" onclick={handleReplay}>
            ↻ REPLAY WITH DIFFERENT DECISION
          </button>
        </div>
      </footer>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(5, 8, 15, 0.94);
    backdrop-filter: blur(4px);
    display: grid; place-items: center;
    z-index: 240;
    animation: fadein 0.15s ease-out;
    padding: 20px; box-sizing: border-box;
  }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

  .frame {
    width: min(1200px, 95vw);
    max-height: 92vh;
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    box-shadow: 0 0 50px color-mix(in srgb, var(--accent-cyan) 22%, transparent);
    display: flex; flex-direction: column;
    overflow: hidden; position: relative;
    font-family: var(--font-mono);
  }

  .corners::before {
    content: ''; position: absolute; top: -1px; left: -1px;
    width: 10px; height: 10px;
    border-top: 2px solid var(--accent-cyan); border-left: 2px solid var(--accent-cyan);
    pointer-events: none; z-index: 10;
  }
  .corners::after {
    content: ''; position: absolute; bottom: -1px; right: -1px;
    width: 10px; height: 10px;
    border-bottom: 2px solid var(--accent-cyan); border-right: 2px solid var(--accent-cyan);
    pointer-events: none; z-index: 10;
  }

  header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--accent-cyan) 4%, transparent);
  }
  .hdr-left { display: flex; flex-direction: column; gap: 4px; }
  .eyebrow {
    font-size: 8px; letter-spacing: 0.22em; color: var(--accent-cyan);
    text-transform: uppercase;
  }
  .title-row { display: flex; align-items: center; gap: 12px; }
  header h2 {
    margin: 0; font-size: 14px; letter-spacing: 0.14em;
    color: var(--text-primary); font-weight: 700;
  }
  .outcome-badge {
    font-size: 9px; padding: 2px 8px; border: 1px solid;
    letter-spacing: 0.15em; font-weight: 700; background: rgba(0,0,0,0.4);
  }
  .sub { font-size: 8.5px; color: var(--text-muted); letter-spacing: 0.12em; }
  .close-btn {
    background: transparent; border: 1px solid var(--border-subtle);
    color: var(--text-muted); font-size: 14px;
    width: 28px; height: 28px; display: grid; place-items: center;
    cursor: pointer; transition: all 0.12s;
  }
  .close-btn:hover {
    border-color: var(--accent-red); color: var(--accent-red);
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent-red) 30%, transparent);
  }

  .body-scroll {
    flex: 1; overflow-y: auto; padding: 18px 20px;
    display: flex; flex-direction: column; gap: 20px;
  }
  .body-scroll::-webkit-scrollbar { width: 4px; }
  .body-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); }

  .sec {
    display: flex; flex-direction: column; gap: 10px;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: 18px;
  }
  .sec:last-child { border-bottom: none; padding-bottom: 0; }

  .sec-hdr { display: flex; align-items: baseline; gap: 8px; }
  .sec-num { font-size: 10px; color: var(--accent-cyan); font-weight: 700; }
  .sec-hdr h3 {
    margin: 0; font-size: 11px; letter-spacing: 0.16em;
    color: var(--text-primary); text-transform: uppercase;
  }
  .sec-meta {
    font-size: 8px; letter-spacing: 0.15em; color: var(--text-muted);
    text-transform: uppercase; margin-left: auto;
  }

  .empty-box {
    font-size: 8.5px; color: var(--text-muted); padding: 12px;
    background: var(--bg-elevated); border: 1px dashed var(--border-subtle);
    letter-spacing: 0.1em;
  }

  .bda-box { border: 1px solid var(--accent-cyan); background: color-mix(in srgb, var(--accent-cyan) 3.5000000000000004%, transparent); padding: 12px; }
  .bda-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px; }
  .bda-grid div { display: flex; flex-direction: column; gap: 4px; }
  .bda-grid span { color: var(--text-muted); font-size: 8px; letter-spacing: 0.14em; }
  .bda-grid strong { color: var(--accent-cyan); font-size: 11px; letter-spacing: 0.1em; }
  .bda-grid .status-destroyed { color: var(--accent-green); }
  .bda-grid .status-damaged { color: var(--accent-amber); }
  .bda-grid .status-missed { color: var(--accent-red); }
  .bda-box p { margin: 10px 0 0; color: var(--text-secondary); font-size: 9px; letter-spacing: 0.06em; line-height: 1.65; }

  /* DECISION TABLE */
  .table-wrap { overflow-x: auto; background: var(--bg-elevated); border: 1px solid var(--border-subtle); }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th {
    text-align: left; padding: 8px 12px;
    background: color-mix(in srgb, var(--accent-cyan) 4%, transparent); border-bottom: 1px solid var(--border-subtle);
    color: var(--text-muted); font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase;
  }
  td { padding: 9px 12px; border-bottom: 1px solid var(--border-subtle); vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .phase-cell { color: var(--accent-amber); font-weight: 700; letter-spacing: 0.1em; width: 90px; }
  .dec-cell { display: flex; flex-direction: column; gap: 2px; color: var(--text-primary); width: 180px; }
  .time-sub { font-size: 7.5px; color: var(--text-muted); }
  .choice-cell { width: 190px; }
  .choice-label { color: var(--accent-cyan); display: block; margin-bottom: 3px; font-weight: 700; }
  .tag-pill { font-size: 7.5px; padding: 1px 5px; border: 1px solid; letter-spacing: 0.08em; display: inline-block; }
  .consequence-cell { color: var(--text-secondary); line-height: 1.4; }

  /* NARRATIVE */
  .narrative-box {
    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
    padding: 10px 14px; display: flex; flex-direction: column; gap: 6px;
    max-height: 160px; overflow-y: auto;
  }
  .narrative-line { display: flex; gap: 10px; font-size: 8.5px; line-height: 1.4; }
  .line-num { color: var(--text-muted); font-family: var(--font-mono); }
  .line-txt { color: var(--text-secondary); font-family: var(--font-mono); }

  /* AC GRID */
  .ac-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; }
  .ac-card {
    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
    padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;
  }
  .ac-top { display: flex; justify-content: space-between; align-items: center; }
  .tail { color: var(--accent-cyan); font-weight: 700; font-size: 11px; }
  .type { color: var(--text-primary); font-size: 10px; }
  .base { color: var(--text-muted); font-size: 8.5px; }
  .status-pill { font-size: 8px; padding: 1px 6px; border: 1px solid; font-weight: 700; }
  .status-fmc { color: var(--accent-green); border-color: var(--accent-green); }
  .status-pmc { color: var(--accent-amber); border-color: var(--accent-amber); }
  .status-nmc { color: var(--accent-red); border-color: var(--accent-red); }
  .ac-fuel { display: flex; flex-direction: column; gap: 4px; }
  .fuel-row { display: flex; justify-content: space-between; font-size: 8px; color: var(--text-muted); }
  .fuel-val { color: var(--text-secondary); font-weight: 700; }
  .fuel-bar { height: 3px; background: var(--border-subtle); position: relative; }
  .fuel-bar .fill { height: 100%; background: var(--accent-cyan); }

  .weapon-expended-bar {
    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
    padding: 9px 12px; display: flex; align-items: center; gap: 10px; font-size: 9px;
  }
  .w-label { color: var(--text-muted); font-size: 8px; letter-spacing: 0.14em; }
  .w-name { padding:0; border:0; background:transparent; color: var(--accent-amber); font:inherit; font-weight: 700; cursor:pointer; }
  .w-status { font-size: 8px; padding: 2px 7px; border: 1px solid; margin-left: auto; letter-spacing: 0.1em; }
  .w-status.released { color: var(--accent-green); border-color: var(--accent-green); background: color-mix(in srgb, var(--accent-green) 6%, transparent); }
  .w-status.retained { color: var(--accent-amber); border-color: var(--accent-amber); background: rgba(255, 170, 0, 0.06); }

  /* RISK GRID */
  .risk-grid { display: grid; grid-template-columns: 180px 180px 1fr; gap: 10px; }
  .risk-card {
    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
    padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;
  }
  .rk-lbl { font-size: 8px; letter-spacing: 0.14em; color: var(--text-muted); text-transform: uppercase; }
  .rk-val { font-size: 18px; font-weight: 700; }
  .rk-val.green { color: var(--accent-green); }
  .rk-val.amber { color: var(--accent-amber); }
  .rk-sub { font-size: 7.5px; color: var(--text-muted); letter-spacing: 0.1em; }
  .comparison { display: flex; flex-direction: column; gap: 6px; }
  .cmp-text { display: flex; flex-direction: column; gap: 4px; font-size: 8.5px; }
  .cmp-line { line-height: 1.4; color: var(--text-secondary); overflow-wrap: break-word; word-break: break-word; max-width: 100%; }
  .cmp-line.muted { color: var(--text-muted); font-size: 8px; overflow-wrap: break-word; word-break: break-word; max-width: 100%; }

  /* FOOTER */
  footer {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 20px;
    border-top: 1px solid var(--border-subtle);
    background: rgba(5, 8, 15, 0.85);
    flex-wrap: wrap; gap: 10px;
  }
  .footer-left { font-size: 8px; color: var(--text-muted); letter-spacing: 0.14em; }
  .actions { display: flex; gap: 10px; align-items: center; }
  .btn {
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.16em;
    padding: 7px 14px; border: 1px solid; cursor: pointer;
    background: transparent; transition: all 0.15s; font-weight: 700;
  }
  .btn-archive {
    border-color: var(--border-strong); color: var(--text-secondary);
  }
  .btn-archive:hover {
    border-color: var(--text-secondary); color: var(--text-primary);
    background: rgba(255, 255, 255, 0.05);
  }
  .btn-export {
    border-color: var(--accent-cyan); color: var(--accent-cyan);
    background: color-mix(in srgb, var(--accent-cyan) 6%, transparent);
  }
  .btn-export:hover {
    background: color-mix(in srgb, var(--accent-cyan) 18%, transparent);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-cyan) 35%, transparent);
  }
  .btn-replay {
    border-color: var(--accent-green); color: var(--accent-green);
    background: color-mix(in srgb, var(--accent-green) 8%, transparent);
  }
  .btn-replay:hover {
    background: color-mix(in srgb, var(--accent-green) 22%, transparent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-green) 45%, transparent);
  }
  .outcome-odds { margin-top:10px; padding:10px; border:1px solid var(--border-subtle); background:var(--bg-base); }
  .odds-title { display:flex; justify-content:space-between; gap:8px; color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.1em; }
  .odds-title span { color:var(--text-muted); }
  .odds-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:8px; }
  .odds-grid article { padding:9px; border:1px solid var(--border-subtle); color:var(--text-secondary); }
  .odds-grid article.actual { border-color:var(--accent-green); box-shadow:inset 0 0 12px color-mix(in srgb,var(--accent-green) 10%,transparent); }
  .odds-grid b,.odds-grid strong { display:block; font:8px var(--font-mono); }
  .odds-grid strong { color:var(--accent-amber); font-size:15px; margin:4px 0; }
  .odds-grid p { margin:0; font:10px/1.45 var(--font-sans); }
  .odds-grid small { color:var(--accent-green); display:block; margin-top:7px; font:7px var(--font-mono); }
  .replay-branch { margin-top:8px; padding:7px 10px; color:var(--accent-cyan); background:transparent; border:1px solid var(--accent-cyan); font:8px var(--font-mono); cursor:pointer; }
  @media(max-width:700px) { .odds-grid { grid-template-columns:1fr; } }
</style>
