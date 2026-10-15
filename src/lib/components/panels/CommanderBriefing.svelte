<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { HISTORICAL_MISSIONS } from '../../data/historicalMissions';
  import { assessSingleAssignment, wezRingsForAircraft } from '../../engine/weaponeering';
  import { WEAPONS, optimalWeaponFor } from '../../data/weapons';
  import { getModeLabel } from '../../engine/optimisation';
  import type { TargetType, Position } from '../../types';

  let {
    open = false,
    missionId = null,
    onApprove,
    onClose,
  }: {
    open?: boolean;
    missionId?: string | null;
    onApprove?: () => void;
    onClose?: () => void;
  } = $props();

  function haversine(a: Position, b: Position): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  const mission = $derived(system.missions.find((m) => m.id === missionId) ?? null);
  const canLaunch = $derived(!!mission?.feasible && assignedAircraft.length > 0);

  const selectedCoa = $derived(
    system.coas.find((c) => c.id === system.selectedCoaId) ?? system.coas[0] ?? null
  );

  const assignedAircraftIds = $derived(
    (missionId && selectedCoa?.assignments[missionId]) ? selectedCoa.assignments[missionId] : []
  );

  const assignedAircraft = $derived(
    system.aircraft.filter((a) => assignedAircraftIds.includes(a.id))
  );

  // Diagnostic reason when assignedAircraft is empty
  interface EmptyDiagnostic {
    caseNumber: 1 | 2 | 3;
    title: string;
    message: string;
    accentColor: string;
    platformsEvaluated: number;
    suggestedMode?: string;
  }

  const emptyDiagnostic = $derived.by<EmptyDiagnostic | null>(() => {
    if (!mission || assignedAircraft.length > 0) return null;

    const evaluatedCount = system.aircraft.length;
    // 1. Check if any weapon in the database supports this targetType
    const matchingWeapons = Object.values(WEAPONS).filter((w) =>
      w.targetTypes.includes(mission.targetType)
    );

    if (matchingWeapons.length === 0) {
      return {
        caseNumber: 1,
        title: 'NO COMPATIBLE WEAPON IN INVENTORY',
        message: `NO PLATFORM IN FLEET CARRIES A WEAPON FOR THIS TARGET CLASS (${mission.targetType.toUpperCase().replace('-', ' ')}). MISSION CANNOT BE TASKED.`,
        accentColor: 'var(--accent-red)',
        platformsEvaluated: evaluatedCount,
      };
    }

    // 2. Check if weapons exist but no FMC/PMC aircraft carrying a matching weapon is within weapon launch range
    const eligibleAircraft = system.aircraft.filter((a) => a.status !== 'NMC');
    const platformsWithMatchingWeapon = eligibleAircraft.filter(
      (a) => optimalWeaponFor(a.type, mission.targetType) !== null
    );

    // Compute range status for candidate platforms
    const inRangeCandidates = platformsWithMatchingWeapon.filter((a) => {
      const wpn = optimalWeaponFor(a.type, mission.targetType);
      if (!wpn) return false;
      const dist = haversine(a.position, mission.target);
      return dist <= wpn.rangeKm;
    });

    if (inRangeCandidates.length === 0) {
      // Find nearest platform and its weapon range
      const weaponListStr = Array.from(new Set(matchingWeapons.map((w) => w.name))).join(', ');
      let nearestTail = 'NONE';
      let nearestDist = 0;
      let nearestWpnRange = 0;

      if (platformsWithMatchingWeapon.length > 0) {
        const sorted = [...platformsWithMatchingWeapon].sort((x, y) => {
          return haversine(x.position, mission.target) - haversine(y.position, mission.target);
        });
        const nearest = sorted[0];
        const wpn = optimalWeaponFor(nearest.type, mission.targetType)!;
        nearestTail = nearest.tailNumber;
        nearestDist = Math.round(haversine(nearest.position, mission.target));
        nearestWpnRange = wpn.rangeKm;
      } else if (eligibleAircraft.length > 0) {
        const sorted = [...eligibleAircraft].sort((x, y) => {
          return haversine(x.position, mission.target) - haversine(y.position, mission.target);
        });
        const nearest = sorted[0];
        nearestTail = nearest.tailNumber;
        nearestDist = Math.round(haversine(nearest.position, mission.target));
        nearestWpnRange = Math.max(...matchingWeapons.map((w) => w.rangeKm));
      }

      return {
        caseNumber: 2,
        title: 'PLATFORMS OUTSIDE LAUNCH ENVELOPE',
        message: `COMPATIBLE WEAPONS EXIST (${weaponListStr}) BUT NO AIRCRAFT IS WITHIN LAUNCH ENVELOPE. NEAREST PLATFORM: ${nearestTail} AT ${nearestDist} KM, WEAPON RANGE ${nearestWpnRange} KM.`,
        accentColor: 'var(--accent-amber)',
        platformsEvaluated: evaluatedCount,
      };
    }

    // 3. Aircraft available and in range, but selected COA opted out
    const modeLabel = selectedCoa ? getModeLabel(selectedCoa) : 'CONSERVATIVE';
    // Find alternative COA that includes this mission if any
    const altCoa = system.coas.find(
      (c) => c.assignments[mission.id] && c.assignments[mission.id].length > 0
    );
    const suggestedMode = altCoa
      ? getModeLabel(altCoa)
      : (modeLabel === 'CONSERVATIVE' ? 'AGGRESSIVE' : 'BALANCED');

    return {
      caseNumber: 3,
      title: 'COA EXCLUSION / PRIORITY THRESHOLD',
      message: `SELECTED COA (${modeLabel}) DID NOT TASK THIS MISSION. ${inRangeCandidates.length} COMPATIBLE AIRCRAFT ARE AVAILABLE — SWITCH TO ${suggestedMode} TO INCLUDE.`,
      accentColor: 'var(--accent-cyan)',
      platformsEvaluated: evaluatedCount,
      suggestedMode,
    };
  });

  // Template mapping
  const templateMap: Record<string, string> = {
    'hardened-bunker': 'sindoor_deep',
    'radar-site': 'sead_template',
    'troop-concentration': 'balakot',
    'c2-node': 'sindoor_deep',
    'bridge': 'sindoor_deep',
    'fuel-depot': 'sindoor_deep',
    'runway': 'sindoor_deep',
    'ship': 'sead_template',
    'aircraft': 'sead_template',
  };

  const historicalTemplate = $derived(
    mission ? HISTORICAL_MISSIONS[templateMap[mission.targetType] ?? 'sindoor_deep'] : null
  );

  // Threat overlay summary: within 100km
  const nearbyThreats = $derived.by(() => {
    if (!mission) return [];
    return system.threats.filter((t) => haversine(t.position, mission.target) <= 100);
  });

  const avgThreatProb = $derived.by(() => {
    if (nearbyThreats.length === 0) return 0;
    const sum = nearbyThreats.reduce((acc, t) => acc + t.probability, 0);
    return Math.round(sum / nearbyThreats.length);
  });

  // Collateral estimation
  const collateralClass = $derived.by(() => {
    if (!mission) return 'UNKNOWN';
    if (mission.targetType === 'troop-concentration' || mission.targetType === 'c2-node') return 'CLASS II (MODERATE)';
    if (mission.targetType === 'hardened-bunker' || mission.targetType === 'fuel-depot') return 'CLASS I (CONTROLLED)';
    if (mission.targetType === 'radar-site' || mission.targetType === 'runway') return 'CLASS I (LOW / MILITARY ONLY)';
    return 'CLASS I (LOW)';
  });

  // Weapon pairings & WEZ for each assigned aircraft
  const aircraftPairings = $derived.by(() => {
    if (!mission) return [];
    return assignedAircraft.map((ac) => {
      const assessment = assessSingleAssignment(ac, mission.target, mission.targetType, system.threats);
      const rings = wezRingsForAircraft(ac, mission.targetType);
      return {
        ac,
        assessment,
        rings,
      };
    });
  });

  function assessmentColor(assessment?: string) {
    if (assessment === 'OPTIMAL') return 'var(--accent-green)';
    if (assessment === 'FEASIBLE') return 'var(--accent-cyan)';
    if (assessment === 'MARGINAL') return 'var(--accent-amber)';
    return 'var(--accent-red)';
  }

  function priColor(p: number) {
    return p === 1 ? 'var(--accent-red)' : p === 2 ? 'var(--accent-amber)' : 'var(--text-muted)';
  }

  function handleAbort() {
    if (mission) {
      system.pushEvent('COMMAND', `MISSION HELD · ${mission.name.toUpperCase()}`, 'warn');
    }
    onClose?.();
  }
</script>

{#if open && mission}
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
        <div class="hdr-main">
          <div class="eyebrow">MISSION CMDR DECISION-SUPPORT BRIEFING · AUTHORITY: AOC-IN-C · TASKING AUTHORITY: WING CDR</div>
          <div class="title-row">
            <h2>MISSION BRIEFING · {mission.name}</h2>
            <div class="badges">
              <span class="pri-badge" style="color:{priColor(mission.priority)}; border-color:{priColor(mission.priority)};">
                PRIORITY P{mission.priority}
              </span>
              <span class="type-badge">
                {mission.targetType.toUpperCase().replace('-', ' ')}
              </span>
            </div>
          </div>
        </div>
        <button class="close-btn" onclick={() => onClose?.()} aria-label="Close">✕</button>
      </header>

      <div class="roe-strip" role="note">ROE: POSITIVE ID REQUIRED · COLLATERAL LIMIT: LOW · WEAPONS FREE: NO</div>

      <!-- CONTENT BODY -->
      <div class="content-scroll">
        <!-- 1. TARGET PACKAGE -->
        <section class="section">
          <div class="sec-hdr">
            <span class="sec-num">01</span>
            <h3>TARGET PACKAGE</h3>
            <span class="sec-meta">COORDINATES & THREAT PICTURE</span>
          </div>
          <div class="grid-3">
            <div class="card">
              <span class="lbl">TARGET GRID</span>
              <span class="val cyan">{mission.target.lat.toFixed(4)}°N · {mission.target.lng.toFixed(4)}°E</span>
              <span class="sub">GEOINT ACCURACY: ±3M</span>
            </div>
            <div class="card">
              <span class="lbl">COLLATERAL DAMAGE ESTIMATE</span>
              <span class="val amber">{collateralClass}</span>
              <span class="sub">MILITARY STRIKE CORRIDOR</span>
            </div>
            <div class="card">
              <span class="lbl">ROUTE RISK SCORE</span>
              <span class="val" style="color: {mission.riskLevel > 50 ? 'var(--accent-red)' : 'var(--accent-amber)'};">
                INDEX {mission.riskLevel} / 100
              </span>
              <span class="sub">WEAPONEERING ENROUTE EVALUATION</span>
            </div>
          </div>
          <div class="threat-summary">
            <div class="threat-stat">
              <span class="ts-label">THREATS WITHIN 100 KM ENVELOPE:</span>
              <span class="ts-val red">{nearbyThreats.length} ACTIVE ZONES</span>
            </div>
            <div class="threat-stat">
              <span class="ts-label">AVERAGE INTERCEPT PROBABILITY:</span>
              <span class="ts-val amber">{avgThreatProb}%</span>
            </div>
            {#if nearbyThreats.length > 0}
              <div class="threat-tags">
                {#each nearbyThreats as t}
                  <span class="threat-tag">
                    {t.type} · {t.radius}KM WEZ · P({t.probability}%)
                  </span>
                {/each}
              </div>
            {/if}
          </div>
        </section>

        <!-- 2. ASSIGNED FORCES -->
        <section class="section">
          <div class="sec-hdr">
            <span class="sec-num">02</span>
            <h3>ASSIGNED FORCES & WEAPONEERING</h3>
            <span class="sec-meta">{assignedAircraft.length} AIRCRAFT SLATED VIA SELECTED COA</span>
          </div>

          {#if aircraftPairings.length === 0}
            <div class="diagnostic-wrap">
              <div class="diag-status">
                STATUS: UNTASKED · {emptyDiagnostic?.platformsEvaluated ?? system.aircraft.length} PLATFORMS EVALUATED
              </div>
              <div
                class="diag-box corners"
                style="border-color:{emptyDiagnostic?.accentColor ?? 'var(--border-strong)'};"
              >
                <div class="diag-head">
                  <span
                    class="diag-badge"
                    style="color:{emptyDiagnostic?.accentColor}; border-color:{emptyDiagnostic?.accentColor};"
                  >
                    DIAGNOSTIC CASE {emptyDiagnostic?.caseNumber ?? 1}
                  </span>
                  <span
                    class="diag-title"
                    style="color:{emptyDiagnostic?.accentColor};"
                  >
                    {emptyDiagnostic?.title}
                  </span>
                </div>
                <div class="diag-body">
                  <p class="diag-msg">{emptyDiagnostic?.message}</p>
                </div>
              </div>
            </div>
          {:else}
            <div class="forces-list">
              {#each aircraftPairings as pair}
                <div class="force-card">
                  <div class="force-top">
                    <div class="force-ac">
                      <span class="tail">{pair.ac.tailNumber}</span>
                      <span class="type">{pair.ac.type}</span>
                      <span class="base">BASE: {pair.ac.base.toUpperCase()}</span>
                      <span class="status status-{pair.ac.status.toLowerCase()}">{pair.ac.status}</span>
                    </div>
                    {#if pair.assessment}
                      <span class="compat-status" style="color:{assessmentColor(pair.assessment.assessment)}; border-color:{assessmentColor(pair.assessment.assessment)};">
                        {pair.assessment.assessment}
                      </span>
                    {:else}
                      <span class="compat-status" style="color:var(--accent-amber); border-color:var(--accent-amber);">
                        UNASSESSED
                      </span>
                    {/if}
                  </div>

                  <div class="force-details">
                    {#if pair.assessment}
                      <div class="pairing-row">
                        <span class="pairing-label">PRIMARY WEAPON:</span>
                        <button class="pairing-wpn" title="Open {pair.assessment.weaponName} specification" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:weapon-detail', { detail: Object.values(WEAPONS).find((weapon) => weapon.name === pair.assessment!.weaponName)?.id ?? pair.assessment!.weaponName }))}>{pair.assessment.weaponName}</button>
                        <span class="pairing-envelope">
                          LAUNCH RANGE {pair.assessment.launchRangeKm} KM · DIST TO TGT {pair.assessment.distanceToTargetKm} KM
                        </span>
                        <span class="pairing-mode {pair.assessment.standoffSafe ? 'standoff' : 'penetration'}">
                          {pair.assessment.standoffSafe ? 'STANDOFF CAPABLE' : 'PENETRATION REQUIRED'}
                        </span>
                      </div>
                      <div class="reason-row">
                        <span class="reason-bullet">▸</span>
                        <span class="reason-txt">{pair.assessment.reason}</span>
                      </div>
                    {/if}

                    {#if pair.rings.length > 0}
                      <div class="wez-rings-row">
                        <span class="wez-title">WEZ ENVELOPE:</span>
                        {#each pair.rings as r}
                          <button class="wez-pill" style="border-color:{r.color}; color:{r.color};" title="Open {r.weaponName} specification" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:weapon-detail', { detail: Object.values(WEAPONS).find((weapon) => weapon.name === r.weaponName)?.id ?? r.weaponName }))}>
                            {r.weaponName} · {r.rangeKm} KM · {r.type.toUpperCase()}
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </section>

        <!-- 3. HISTORICAL PRECEDENT -->
        <section class="section">
          <div class="sec-hdr">
            <span class="sec-num">03</span>
            <h3>HISTORICAL PRECEDENT</h3>
            <span class="sec-meta">DOCTRINAL CASE COMPARISON</span>
          </div>
          {#if historicalTemplate}
            <div class="precedent-box">
              <div class="prec-ref">
                <span class="prec-tag">{historicalTemplate.reference}</span>
                <span class="prec-date">{historicalTemplate.date ?? 'TRAINING TEMPLATE'} · CODENAME {historicalTemplate.codename}</span>
              </div>
              <p class="prec-narrative">{historicalTemplate.narrative}</p>
            </div>
          {:else}
            <div class="empty-notice">NO DOCTRINAL MAPPING LOCATED.</div>
          {/if}
        </section>

        <!-- 4. DECISION POINTS PREVIEW -->
        <section class="section">
          <div class="sec-hdr">
            <span class="sec-num">04</span>
            <h3>DECISION POINTS PREVIEW</h3>
            <span class="sec-meta">IN-FLIGHT COMMAND GATES REQUIRING HUMAN AUTHORISATION</span>
          </div>

          {#if historicalTemplate?.decisions && historicalTemplate.decisions.length > 0}
            <div class="decision-grid">
              {#each historicalTemplate.decisions as dec, i}
                <div class="dec-card">
                  <div class="dec-head">
                    <span class="dec-phase">{dec.atPhase} PHASE</span>
                    <span class="dec-count">{dec.branches.length} OPTIONS</span>
                  </div>
                  <div class="dec-title">{dec.title}</div>
                  <div class="dec-context">{dec.context}</div>
                  <div class="dec-branches">
                    {#each dec.branches as b}
                      <div class="branch-item">
                        <span class="b-dot" style="background:{b.tagColor};"></span>
                        <span class="b-label">{b.label}</span>
                        <span class="b-tag" style="color:{b.tagColor}; border-color:{b.tagColor};">{b.tag}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-notice">NO PRE-CONFIGURED DECISION GATES IN TEMPLATE.</div>
          {/if}
        </section>
      </div>

      <!-- 5. ACTION BAR -->
      <footer>
        <div class="footer-note">
          AUTHORITY: AIR COMMAND DECISION SUPPORT · AWAITING COA EXECUTION ORDER
        </div>
        <div class="actions">
          <button class="btn btn-abort" onclick={handleAbort}>
            ✗ ABORT
          </button>
          <button class="btn btn-return" onclick={() => onClose?.()}>
            ◈ RETURN TO COA
          </button>
          <button
            class="btn btn-approve"
            disabled={!canLaunch}
            title={mission && !mission.feasible ? 'NO PLATFORM CAN ENGAGE WITHIN WEAPON ENVELOPE' : undefined}
            onclick={() => onApprove?.()}
          >
            ✓ APPROVE & LAUNCH
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
    z-index: 220;
    animation: fadein 0.15s ease-out;
    padding: 20px;
    box-sizing: border-box;
  }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

  .frame {
    width: min(1080px, 94vw);
    max-height: 90vh;
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    box-shadow: 0 0 50px color-mix(in srgb, var(--accent-cyan) 20%, transparent);
    display: flex; flex-direction: column;
    overflow: hidden;
    position: relative;
    font-family: var(--font-mono);
  }

  /* Corner brackets */
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
  .hdr-main { display: flex; flex-direction: column; gap: 4px; }
  .roe-strip { padding:9px 20px; color:var(--accent-amber); border-bottom:1px solid var(--border-subtle); background:color-mix(in srgb,var(--accent-amber) 6%,transparent); font:8px var(--font-mono); letter-spacing:.1em; }
  .eyebrow {
    font-size: 8px; letter-spacing: 0.24em; color: var(--accent-cyan);
    text-transform: uppercase;
  }
  .title-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  header h2 {
    margin: 0; font-size: 14px; letter-spacing: 0.14em;
    color: var(--text-primary); font-weight: 700;
  }
  .badges { display: flex; gap: 8px; align-items: center; }
  .pri-badge {
    font-size: 9px; padding: 2px 7px; border: 1px solid;
    letter-spacing: 0.12em; background: rgba(0,0,0,0.4);
  }
  .type-badge {
    font-size: 9px; padding: 2px 7px; border: 1px solid var(--border-strong);
    color: var(--text-secondary); letter-spacing: 0.12em; background: rgba(0,0,0,0.4);
  }
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

  .content-scroll {
    flex: 1; overflow-y: auto; padding: 18px 20px;
    display: flex; flex-direction: column; gap: 20px;
  }
  .content-scroll::-webkit-scrollbar { width: 4px; }
  .content-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); }

  .section {
    display: flex; flex-direction: column; gap: 10px;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: 18px;
  }
  .section:last-child { border-bottom: none; padding-bottom: 0; }

  .sec-hdr {
    display: flex; align-items: baseline; gap: 8px;
  }
  .sec-num {
    font-size: 10px; color: var(--accent-cyan); font-weight: 700;
  }
  .sec-hdr h3 {
    margin: 0; font-size: 11px; letter-spacing: 0.16em;
    color: var(--text-primary); text-transform: uppercase;
  }
  .sec-meta {
    font-size: 8px; letter-spacing: 0.15em; color: var(--text-muted);
    text-transform: uppercase; margin-left: auto;
  }

  .grid-3 {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  }
  .card {
    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
    padding: 10px 12px; display: flex; flex-direction: column; gap: 4px;
  }
  .lbl { font-size: 8px; letter-spacing: 0.14em; color: var(--text-muted); text-transform: uppercase; }
  .val { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; }
  .val.cyan { color: var(--accent-cyan); }
  .val.amber { color: var(--accent-amber); }
  .sub { font-size: 7.5px; color: var(--text-muted); letter-spacing: 0.1em; }

  .threat-summary {
    background: color-mix(in srgb, var(--accent-red) 4%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent-red) 25%, transparent);
    padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;
  }
  .threat-stat { display: flex; justify-content: space-between; font-size: 9px; letter-spacing: 0.1em; }
  .ts-label { color: var(--text-secondary); }
  .ts-val.red { color: var(--accent-red); font-weight: 700; }
  .ts-val.amber { color: var(--accent-amber); font-weight: 700; }
  .threat-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 2px; }
  .threat-tag {
    font-size: 8px; padding: 2px 6px;
    background: color-mix(in srgb, var(--accent-red) 10%, transparent); border: 1px solid var(--accent-red);
    color: var(--accent-red); letter-spacing: 0.1em;
  }

  .empty-notice {
    font-size: 9px; color: var(--text-muted); letter-spacing: 0.12em;
    padding: 12px; background: var(--bg-elevated); border: 1px dashed var(--border-subtle);
  }

  /* DIAGNOSTIC BLOCK */
  .diagnostic-wrap {
    display: flex; flex-direction: column; gap: 8px;
  }
  .diag-status {
    font-size: 8px; letter-spacing: 0.18em; color: var(--text-muted);
    text-transform: uppercase;
  }
  .diag-box {
    background: var(--bg-elevated); border: 1px solid var(--border-strong);
    padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
    position: relative;
  }
  .diag-head {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .diag-badge {
    font-size: 8px; padding: 1px 6px; border: 1px solid;
    letter-spacing: 0.14em; font-weight: 700; background: rgba(0,0,0,0.4);
  }
  .diag-title {
    font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .diag-body {
    border-top: 1px dashed var(--border-subtle); padding-top: 8px;
  }
  .diag-msg {
    margin: 0; font-size: 9.5px; line-height: 1.5; color: var(--text-secondary);
    letter-spacing: 0.05em;
  }

  /* FORCES LIST */
  .forces-list { display: flex; flex-direction: column; gap: 10px; }
  .force-card {
    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
    padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;
    transition: border-color 0.12s;
  }
  .force-card:hover { border-color: var(--border-strong); }
  .force-top { display: flex; justify-content: space-between; align-items: center; }
  .force-ac { display: flex; align-items: center; gap: 10px; }
  .tail { color: var(--accent-cyan); font-weight: 700; font-size: 11px; letter-spacing: 0.1em; }
  .type { color: var(--text-primary); font-size: 10px; letter-spacing: 0.08em; }
  .base { color: var(--text-muted); font-size: 9px; letter-spacing: 0.1em; }
  .status {
    font-size: 8px; padding: 1px 5px; border: 1px solid; letter-spacing: 0.1em;
  }
  .status-fmc { color: var(--accent-green); border-color: var(--accent-green); }
  .status-pmc { color: var(--accent-amber); border-color: var(--accent-amber); }
  .status-nmc { color: var(--accent-red); border-color: var(--accent-red); }

  .compat-status {
    font-size: 8.5px; font-weight: 700; padding: 2px 8px; border: 1px solid;
    letter-spacing: 0.14em;
  }

  .force-details { display: flex; flex-direction: column; gap: 6px; }
  .pairing-row {
    display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;
    font-size: 9px;
  }
  .pairing-label { color: var(--text-muted); font-size: 8px; letter-spacing: 0.12em; }
  .pairing-wpn { padding:0; border:0; background:transparent; color: var(--accent-amber); font:inherit; font-weight: 700; letter-spacing: 0.08em; cursor:pointer; }
  .pairing-envelope { color: var(--text-secondary); letter-spacing: 0.08em; }
  .pairing-mode {
    font-size: 8px; padding: 1px 6px; border: 1px solid; letter-spacing: 0.1em;
    margin-left: auto;
  }
  .pairing-mode.standoff {
    color: var(--accent-green); border-color: var(--accent-green); background: color-mix(in srgb, var(--accent-green) 6%, transparent);
  }
  .pairing-mode.penetration {
    color: var(--accent-amber); border-color: var(--accent-amber); background: rgba(255, 170, 0, 0.06);
  }

  .reason-row { display: flex; gap: 6px; font-size: 8.5px; color: var(--text-muted); line-height: 1.4; }
  .reason-bullet { color: var(--accent-cyan); }
  .reason-txt { color: var(--text-secondary); }

  .wez-rings-row {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    padding-top: 4px; border-top: 1px dashed var(--border-subtle);
  }
  .wez-title { font-size: 8px; color: var(--text-muted); letter-spacing: 0.12em; }
  .wez-pill {
    background:transparent; font:7.5px var(--font-mono); cursor:pointer; padding: 1px 6px; border: 1px solid; letter-spacing: 0.08em;
  }

  /* PRECEDENT */
  .precedent-box {
    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
    padding: 12px; display: flex; flex-direction: column; gap: 8px;
  }
  .prec-ref { display: flex; justify-content: space-between; align-items: center; }
  .prec-tag {
    color: var(--accent-cyan); font-weight: 700; font-size: 10px; letter-spacing: 0.14em;
  }
  .prec-date { color: var(--text-muted); font-size: 8.5px; letter-spacing: 0.1em; }
  .prec-narrative {
    margin: 0; font-size: 9px; line-height: 1.5; color: var(--text-secondary);
    letter-spacing: 0.04em;
  }

  /* DECISION PREVIEW */
  .decision-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px;
  }
  .dec-card {
    background: var(--bg-elevated); border: 1px solid var(--border-subtle);
    padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;
  }
  .dec-head { display: flex; justify-content: space-between; align-items: center; }
  .dec-phase {
    color: var(--accent-amber); font-weight: 700; font-size: 8.5px; letter-spacing: 0.14em;
  }
  .dec-count {
    color: var(--text-muted); font-size: 8px; letter-spacing: 0.1em;
  }
  .dec-title { font-size: 10px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.08em; }
  .dec-context { font-size: 8px; color: var(--text-muted); letter-spacing: 0.06em; }
  .dec-branches { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
  .branch-item { display: flex; align-items: center; gap: 6px; font-size: 8.5px; }
  .b-dot { width: 5px; height: 5px; border-radius: 0; }
  .b-label { color: var(--text-secondary); flex: 1; letter-spacing: 0.06em; }
  .b-tag {
    font-size: 7.5px; padding: 1px 5px; border: 1px solid; letter-spacing: 0.08em;
  }

  /* FOOTER */
  footer {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 20px;
    border-top: 1px solid var(--border-subtle);
    background: rgba(5, 8, 15, 0.85);
    flex-wrap: wrap; gap: 10px;
  }
  .footer-note {
    font-size: 8px; letter-spacing: 0.14em; color: var(--text-muted);
  }
  .actions { display: flex; gap: 10px; align-items: center; }
  .btn {
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.16em;
    padding: 7px 14px; border: 1px solid; cursor: pointer;
    background: transparent; transition: all 0.15s; font-weight: 700;
  }
  .btn-abort {
    border-color: var(--accent-red); color: var(--accent-red);
  }
  .btn-abort:hover {
    background: color-mix(in srgb, var(--accent-red) 12%, transparent);
    box-shadow: 0 0 10px color-mix(in srgb, var(--accent-red) 40%, transparent);
  }
  .btn-return {
    border-color: var(--border-strong); color: var(--text-secondary);
  }
  .btn-return:hover {
    border-color: var(--text-secondary); color: var(--text-primary);
    background: rgba(255, 255, 255, 0.04);
  }
  .btn-approve {
    border-color: var(--accent-green); color: var(--accent-green);
    background: color-mix(in srgb, var(--accent-green) 8%, transparent);
  }
  .btn-approve:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-green) 20%, transparent);
    box-shadow: 0 0 14px color-mix(in srgb, var(--accent-green) 50%, transparent);
  }
  .btn-approve:disabled {
    opacity: 0.4; cursor: not-allowed; border-color: var(--border-subtle); color: var(--text-muted);
    background: transparent;
  }
</style>
