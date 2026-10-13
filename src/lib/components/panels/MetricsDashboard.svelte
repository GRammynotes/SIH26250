<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { weaponsForAircraft } from '../../data/weapons';

  let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props();

  // 1. OVERVIEW
  const totalSorties = $derived(
    system.activeMissions.filter((m) => m.phase !== 'ABORTED').length
  );

  const missionsCompleted = $derived(
    system.activeMissions.filter((m) => m.phase === 'COMPLETE').length
  );

  const uniqueAircraftTasked = $derived(
    new Set(system.activeMissions.flatMap((m) => m.aircraftIds)).size
  );

  const totalDecisionsMade = $derived(
    system.activeMissions.reduce((acc, m) => acc + m.decisionsMade.length, 0)
  );

  // 2. COA EFFECTIVENESS
  const avgSuccessProb = $derived.by(() => {
    if (system.coas.length === 0) return 0;
    const sum = system.coas.reduce((acc, c) => acc + c.successProbability, 0);
    return Math.round(sum / system.coas.length);
  });

  const avgRisk = $derived.by(() => {
    if (system.coas.length === 0) return 0;
    const sum = system.coas.reduce((acc, c) => acc + c.riskScore, 0);
    return Math.round(sum / system.coas.length);
  });

  // 3. WEAPONEERING
  const fleetCompatibleCount = $derived.by(() => {
    return system.aircraft.filter((ac) => weaponsForAircraft(ac.type).length > 0).length;
  });

  const uncoveredMissions = $derived.by(() => {
    if (system.coas.length === 0) return 0;
    const firstCoa = system.coas[0];
    return Object.values(firstCoa.assignments).filter((arr) => arr.length === 0).length;
  });

  const standoffRatio = $derived.by(() => {
    const assignedIds = system.coas[0] ? Object.values(system.coas[0].assignments).flat() : [];
    if (assignedIds.length === 0) return 0;
    const assignedAc = system.aircraft.filter((a) => assignedIds.includes(a.id));
    const standoffCapable = assignedAc.filter((ac) => {
      const wList = weaponsForAircraft(ac.type);
      return wList.some((w) => w.standoff);
    }).length;
    return Math.round((standoffCapable / assignedAc.length) * 100);
  });

  // 4. TIME-SAVED ESTIMATE
  const manualPlanningMinutes = 90;
  // Estimate or measured system compute seconds
  const systemPlanningSeconds = $derived(
    system.lastCoaComputeMs > 0 ? (system.lastCoaComputeMs / 1000) : (system.coaGenerationCount * 2.5 || 0.85)
  );

  const systemPlanningMinutes = $derived(
    Number((systemPlanningSeconds / 60).toFixed(2))
  );

  const timeSavedMinutes = $derived(
    Number((manualPlanningMinutes - systemPlanningMinutes).toFixed(1))
  );

  const timeSavedPercent = $derived(
    Math.round(((manualPlanningMinutes - systemPlanningMinutes) / manualPlanningMinutes) * 100)
  );
</script>

{#if open}
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
          <span class="eyebrow">COMMAND DECISION-SUPPORT ANALYTICS</span>
          <div class="title-row">
            <h2>COMMAND METRICS DASHBOARD</h2>
            <span class="live-pill">LIVE TELEMETRY</span>
          </div>
          <span class="sub">REAL-TIME TACTICAL EFFICIENCY & WEAPONEERING METRICS · MoD PS 26250</span>
        </div>
        <button class="close-btn" onclick={() => onClose?.()} aria-label="Close">✕</button>
      </header>

      <!-- BODY GRID -->
      <div class="body-scroll">
        <!-- 1. OVERVIEW -->
        <section class="sec">
          <div class="sec-hdr">
            <span class="sec-num">01</span>
            <h3>OPERATIONAL SORTIE OVERVIEW</h3>
            <span class="sec-meta">ACTIVE STATE MACHINE TELEMETRY</span>
          </div>
          <div class="grid-4">
            <div class="stat-card">
              <span class="st-lbl">TOTAL SORTIES GENERATED</span>
              <span class="st-val cyan">{totalSorties}</span>
              <span class="st-sub">ACTIVE + COMPLETE MISSIONS</span>
            </div>
            <div class="stat-card">
              <span class="st-lbl">MISSIONS COMPLETED</span>
              <span class="st-val green">{missionsCompleted}</span>
              <span class="st-sub">FULL PHASING (RTB COMPLETE)</span>
            </div>
            <div class="stat-card">
              <span class="st-lbl">AIRCRAFT TASKED</span>
              <span class="st-val amber">{uniqueAircraftTasked} / {system.aircraft.length}</span>
              <span class="st-sub">UNIQUE TAILS DISPATCHED</span>
            </div>
            <div class="stat-card">
              <span class="st-lbl">DECISIONS RESOLVED</span>
              <span class="st-val cyan">{totalDecisionsMade}</span>
              <span class="st-sub">COMMANDER BRANCH INTERVENTIONS</span>
            </div>
          </div>
        </section>

        <!-- 2. COA EFFECTIVENESS -->
        <section class="sec">
          <div class="sec-hdr">
            <span class="sec-num">02</span>
            <h3>COA GENERATOR EFFECTIVENESS (NSGA-II)</h3>
            <span class="sec-meta">PARETO OPTIMISATION BENCHMARKS</span>
          </div>
          <div class="grid-4">
            <div class="stat-card">
              <span class="st-lbl">COAs COMPUTED</span>
              <span class="st-val cyan">{system.coaGenerationCount}</span>
              <span class="st-sub">OPTIMISATION CYCLES RUN</span>
            </div>
            <div class="stat-card">
              <span class="st-lbl">COAs EVALUATED</span>
              <span class="st-val amber">{system.coaSelectionCount}</span>
              <span class="st-sub">COMMANDER COA SELECTION CLICKS</span>
            </div>
            <div class="stat-card">
              <span class="st-lbl">AVG SUCCESS PROBABILITY</span>
              <span class="st-val green">{avgSuccessProb}%</span>
              <div class="prog-bar"><div class="fill green-fill" style="width:{avgSuccessProb}%;"></div></div>
            </div>
            <div class="stat-card">
              <span class="st-lbl">AVG ROUTE RISK SCORE</span>
              <span class="st-val amber">{avgRisk} / 100</span>
              <div class="prog-bar"><div class="fill amber-fill" style="width:{avgRisk}%;"></div></div>
            </div>
          </div>
        </section>

        <!-- 3. WEAPONEERING & COVERAGE -->
        <section class="sec">
          <div class="sec-hdr">
            <span class="sec-num">03</span>
            <h3>WEAPONEERING & GEOMETRIC COVERAGE</h3>
            <span class="sec-meta">STANDOFF ENVELOPE & INTERCEPT AVOIDANCE</span>
          </div>
          <div class="grid-3">
            <div class="stat-card">
              <span class="st-lbl">COMPATIBLE FLEET PLATFORMS</span>
              <span class="st-val green">{fleetCompatibleCount} / {system.aircraft.length}</span>
              <span class="st-sub">AIRCRAFT WITH VALID PAYLOAD PAIRINGS</span>
            </div>
            <div class="stat-card">
              <span class="st-lbl">UNCOVERED MISSIONS IN PRIMARY COA</span>
              <span class="st-val {uncoveredMissions > 0 ? 'red' : 'green'}">{uncoveredMissions}</span>
              <span class="st-sub">TARGETS LACKING COMPATIBLE WEAPON/RANGE</span>
            </div>
            <div class="stat-card">
              <span class="st-lbl">STANDOFF EMPLOYMENT RATIO</span>
              <span class="st-val cyan">{standoffRatio}%</span>
              <div class="prog-bar"><div class="fill cyan-fill" style="width:{standoffRatio}%;"></div></div>
            </div>
          </div>
        </section>

        <!-- 4. TIME-SAVED ESTIMATE -->
        <section class="sec">
          <div class="sec-hdr">
            <span class="sec-num">04</span>
            <h3>OPERATIONAL ACCELERATION & TIME SAVED</h3>
            <span class="sec-meta">PAIN POINT: MANUAL AIR-TASKING CYCLE REDUCTION</span>
          </div>
          <div class="time-box">
            <div class="time-main">
              <div class="time-stat">
                <span class="t-lbl">MANUAL PLANNING BASELINE</span>
                <span class="t-val muted">{manualPlanningMinutes} MIN</span>
                <span class="t-sub">DOCTRINAL ATO MANUAL CYCLE</span>
              </div>
              <div class="arrow-sep">➔</div>
              <div class="time-stat">
                <span class="t-lbl">SYSTEM PLANNING TIME</span>
                <span class="t-val cyan">{systemPlanningSeconds.toFixed(1)} SEC</span>
                <span class="t-sub">NSGA-II MULTI-OBJECTIVE SOLVER</span>
              </div>
              <div class="arrow-sep">➔</div>
              <div class="time-stat highlight">
                <span class="t-lbl">ESTIMATED TIME SAVED</span>
                <span class="t-val green">~{timeSavedMinutes} MIN ({timeSavedPercent}%)</span>
                <span class="t-sub">NEAR REAL-TIME RE-TASKING CAPABILITY</span>
              </div>
            </div>
            <div class="time-bar-wrap">
              <div class="tb-outer">
                <div class="tb-saved" style="width:{timeSavedPercent}%;">
                  <span class="tb-txt">SAVED: {timeSavedPercent}%</span>
                </div>
                <div class="tb-system" style="width:{Math.max(2, 100 - timeSavedPercent)}%;">
                  <span class="tb-txt">&lt;1%</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- FOOTER -->
      <footer>
        <div class="footer-left">
          AIR COMMAND METRICS REPOSITORIES · AIR OPERATIONS INTELLIGENCE CELL
        </div>
        <button class="btn btn-close" onclick={() => onClose?.()}>
          CLOSE DASHBOARD
        </button>
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
    z-index: 250;
    animation: fadein 0.15s ease-out;
    padding: 20px; box-sizing: border-box;
  }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

  .frame {
    width: min(1300px, 95vw);
    max-height: 92vh;
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    box-shadow: 0 0 50px rgba(0, 212, 255, 0.22);
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
    background: rgba(0, 212, 255, 0.04);
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
  .live-pill {
    font-size: 8px; padding: 2px 7px; border: 1px solid var(--accent-green);
    color: var(--accent-green); background: rgba(57, 255, 20, 0.08);
    letter-spacing: 0.12em; font-weight: 700;
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
    box-shadow: 0 0 8px rgba(255, 45, 124, 0.3);
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

  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

  .stat-card {
    background: #070b14; border: 1px solid var(--border-subtle);
    padding: 12px 14px; display: flex; flex-direction: column; gap: 5px;
  }
  .st-lbl { font-size: 8px; letter-spacing: 0.14em; color: var(--text-muted); text-transform: uppercase; }
  .st-val { font-size: 20px; font-weight: 700; letter-spacing: 0.05em; }
  .st-val.cyan { color: var(--accent-cyan); }
  .st-val.green { color: var(--accent-green); }
  .st-val.amber { color: var(--accent-amber); }
  .st-val.red { color: var(--accent-red); }
  .st-sub { font-size: 7.5px; color: var(--text-muted); letter-spacing: 0.1em; }

  .prog-bar { height: 3px; background: var(--border-subtle); margin-top: 4px; }
  .fill { height: 100%; }
  .green-fill { background: var(--accent-green); }
  .amber-fill { background: var(--accent-amber); }
  .cyan-fill { background: var(--accent-cyan); }

  /* TIME SAVED BOX */
  .time-box {
    background: #070b14; border: 1px solid var(--border-subtle);
    padding: 14px 16px; display: flex; flex-direction: column; gap: 14px;
  }
  .time-main { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .time-stat { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .time-stat.highlight {
    background: rgba(57, 255, 20, 0.05); border: 1px solid rgba(57, 255, 20, 0.3);
    padding: 8px 12px;
  }
  .t-lbl { font-size: 8px; letter-spacing: 0.14em; color: var(--text-muted); text-transform: uppercase; }
  .t-val { font-size: 16px; font-weight: 700; }
  .t-val.muted { color: var(--text-secondary); }
  .t-val.cyan { color: var(--accent-cyan); }
  .t-val.green { color: var(--accent-green); }
  .t-sub { font-size: 7.5px; color: var(--text-muted); letter-spacing: 0.1em; }
  .arrow-sep { font-size: 16px; color: var(--border-strong); }

  .time-bar-wrap { display: flex; flex-direction: column; gap: 4px; }
  .tb-outer { height: 16px; display: flex; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); }
  .tb-saved {
    background: rgba(57, 255, 20, 0.25); border-right: 1px solid var(--accent-green);
    display: flex; align-items: center; padding-left: 8px;
  }
  .tb-system {
    background: rgba(0, 212, 255, 0.3);
    display: flex; align-items: center; justify-content: center;
  }
  .tb-txt { font-size: 7.5px; font-weight: 700; color: var(--text-primary); letter-spacing: 0.1em; }

  /* FOOTER */
  footer {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 20px;
    border-top: 1px solid var(--border-subtle);
    background: rgba(5, 8, 15, 0.85);
  }
  .footer-left { font-size: 8px; color: var(--text-muted); letter-spacing: 0.14em; }
  .btn-close {
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.16em;
    padding: 7px 16px; border: 1px solid var(--accent-cyan); color: var(--accent-cyan);
    background: rgba(0, 212, 255, 0.08); cursor: pointer; font-weight: 700;
    transition: all 0.15s;
  }
  .btn-close:hover {
    background: rgba(0, 212, 255, 0.2);
    box-shadow: 0 0 12px rgba(0, 212, 255, 0.4);
  }
</style>
