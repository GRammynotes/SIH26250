import { generateSystemState } from '../data/seed';
import { generateCOAs as optimise } from '../engine/optimisation';
import { SCENARIOS, SCENARIO_LABELS, type ScenarioStep, SCENARIO_AREAS, SCENARIO_MISSION_SETS } from '../engine/scenario';
import { HISTORICAL_MISSIONS } from '../data/historicalMissions';
import {
  createActiveMission, nextPhase, phaseDuration, progressFraction, interpolatePosition,
  type ActiveMission,
} from '../engine/missionExecutor';
import { optimalWeaponFor, WEAPONS } from '../data/weapons';
import { freshAirspace } from '../data/airspace';
import { freshWeather } from '../data/weather';
import { detectDeconflictionWarnings } from '../engine/deconfliction';
import { analyzeTrackLoss, type TrackLossAnalysis } from '../engine/trackLossEngine';
import { clearVoiceDedupe, narrateEvent, setNarrationSpeed } from '../engine/voice';
import type { Aircraft, Mission, Threat, COA, AircraftStatus } from '../types';

export type EventLevel = 'info' | 'ok' | 'warn' | 'alert';
export interface EventEntry { time: string; source: string; msg: string; level: EventLevel; scenario?: string | null; }

class SystemStore {
  focusMode = $state<{
    active: boolean;
    missionId: string | null;
    visibleAircraftIds: string[];
    visibleThreatIds: string[];
    visibleTargetIds: string[];
    revealedLayers: string[];
    originBaseId: string | null;
    assignedAircraftIds: string[];
    routeThreatIds: string[];
    visibleGroundIds: string[];
    visibleEnemyIds: string[];
  } | null>(null);
  aircraft = $state.raw<Aircraft[]>([]);
  missions = $state.raw<Mission[]>([]);
  threats = $state.raw<Threat[]>([]);
  airspaceZones = $state<import('../types').AirspaceZone[]>([]);
  weatherSystems = $state<import('../types').WeatherSystem[]>([]);
  coas = $state<COA[]>([]);
  selectedCoaId = $state<string | null>(null);
  selectedBaseId = $state<string | null>(null);
  events = $state.raw<EventEntry[]>([]);
  mode = $state<'NORMAL' | 'DEGRADED'>('NORMAL');
  computing = $state(false);
  activeScenario = $state<string | null>(null);
  activeScenarioFilter = $state<string | null>(null);
  scenarioOnlyMissionIds = $state.raw<string[]>([]);
  scenarioTimers: number[] = [];
  activeMissions = $state<ActiveMission[]>([]);
  coaGenerationCount = $state(0);
  coaSelectionCount = $state(0);
  lastCoaComputeMs = $state(0);
  aarQueue = $state<string[]>([]);
  tickHandle: number | null = null;
  trackLossAnalysis = $state<TrackLossAnalysis | null>(null);
  spoofedTrackId = $state<string | null>(null);
  continuousReoptimization = $state(true);
  simSpeed = $state<0 | 1 | 2 | 4>(1);
  reoptimizing = $state(false);
  reoptimizationInterval: number | null = null;
  reoptimizationDebounce: number | null = null;
  prioritization = $state(50);
  riskBias = $state(0.7);

  get scenarioMissions(): Mission[] {
    const key = this.activeScenarioFilter;
    if (!key) return this.missions.filter((mission) => !this.scenarioOnlyMissionIds.includes(mission.id));
    const missionSet = SCENARIO_MISSION_SETS[key];
    if (missionSet) return missionSet.map((mission) => this.missions.find((existing) => existing.id === mission.id) ?? mission);
    const types: Record<string, string[]> = {
      aircraft_nmc: ['aircraft'], multi_crisis: ['radar-site', 'troop-concentration', 'aircraft'],
      radar_loss: ['radar-site', 'c2-node'], track_loss: ['aircraft', 'c2-node'],
      data_poisoning: ['aircraft', 'radar-site'], air_superiority: ['aircraft'],
      sead_campaign: ['radar-site'], deep_strike: ['hardened-bunker', 'c2-node', 'fuel-depot', 'runway'],
    };
    const selected = this.missions.filter((m) => (types[key] ?? []).includes(m.targetType));
    return selected.length ? selected : this.missions.slice(0, 3);
  }

  get scenarioAircraft(): Aircraft[] {
    const key = this.activeScenarioFilter;
    if (!key) return this.aircraft;
    const targets = this.scenarioMissions;
    const relevant = this.aircraft.filter((ac) => targets.some((m) => {
      const dLat = (ac.position.lat - m.target.lat) * 111;
      const dLng = (ac.position.lng - m.target.lng) * 91;
      return Math.hypot(dLat, dLng) <= Math.max(80, ac.fuel * 5.5);
    }));
    return relevant.length ? relevant : this.aircraft;
  }

  get scenarioThreats(): Threat[] {
    const key = this.activeScenarioFilter;
    if (!key) return this.threats;
    const bounds = SCENARIO_AREAS[key];
    if (!bounds) return this.threats;
    const [[minLng, minLat], [maxLng, maxLat]] = bounds;
    const inArea = this.threats.filter((t) => t.position.lng >= minLng && t.position.lng <= maxLng && t.position.lat >= minLat && t.position.lat <= maxLat);
    return inArea.length ? inArea : this.threats.slice(0, 2);
  }

  enterFocusMode(missionId: string | null) {
    const mission = this.missions.find((item) => item.id === missionId) ?? this.scenarioMissions[0] ?? null;
    const active = mission && this.activeMissions.find((item) => item.missionId === mission.id);
    const coa = this.coas.find((item) => item.id === this.selectedCoaId);
    const assignedIds = active?.aircraftIds ?? coa?.assignments[mission?.id ?? ''] ?? [];
    const preferredDemoAircraft = mission?.name === 'SWIFT STRIKE' ? this.aircraft.find((item) => item.tailNumber === 'SB-304' && item.status !== 'NMC') : undefined;
    const aircraft = assignedIds.length ? this.aircraft.filter((item) => assignedIds.includes(item.id)) : preferredDemoAircraft ? [preferredDemoAircraft] : this.scenarioAircraft.filter((item) => item.status === 'FMC' || item.status === 'PMC').sort((a, b) => Math.hypot(a.position.lat - (mission?.target.lat ?? 0), a.position.lng - (mission?.target.lng ?? 0)) - Math.hypot(b.position.lat - (mission?.target.lat ?? 0), b.position.lng - (mission?.target.lng ?? 0))).slice(0, 1);
    const routeThreats = mission ? this.scenarioThreats.filter((threat) => {
      const startAircraft = aircraft[0];
      if (!startAircraft) return false;
      const a = { x: startAircraft.position.lng * 91, y: startAircraft.position.lat * 111 };
      const b = { x: mission.target.lng * 91, y: mission.target.lat * 111 };
      const p = { x: threat.position.lng * 91, y: threat.position.lat * 111 };
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)) <= threat.radius;
    }).map((item) => item.id) : [];
    this.focusMode = { active: true, missionId: mission?.id ?? null, visibleAircraftIds: [], visibleThreatIds: [], visibleTargetIds: [], revealedLayers: [], originBaseId: aircraft[0]?.base ?? null, assignedAircraftIds: aircraft.map((item) => item.id), routeThreatIds: routeThreats, visibleGroundIds: [], visibleEnemyIds: [] };
  }

  exitFocusMode() { this.focusMode = null; }

  revealElement(type: 'aircraft' | 'threat' | 'target' | 'mission' | 'base' | 'route' | 'ground' | 'enemy' | 'wez' | 'impact' | 'egress', id?: string) {
    let focus = this.focusMode;
    if (!focus?.active) return;
    if (type === 'aircraft' && id) {
      const aircraft = this.aircraft.find((item) => item.id === id || item.tailNumber.toLowerCase() === id.toLowerCase());
      if (aircraft && !focus.visibleAircraftIds.includes(aircraft.id)) focus.visibleAircraftIds = [...focus.visibleAircraftIds, aircraft.id];
      if (aircraft) window.dispatchEvent(new CustomEvent('aircommand:map-focus-elements', { detail: [{ type: 'aircraft', id: aircraft.tailNumber, label: aircraft.tailNumber }] }));
    } else if ((type === 'target' || type === 'mission') && id) {
      const mission = this.missions.find((item) => item.id === id || item.name.toLowerCase() === id.toLowerCase() || item.name.toLowerCase().includes(id.toLowerCase()));
      if (mission && focus.missionId !== mission.id) { this.enterFocusMode(mission.id); focus = this.focusMode; }
      if (!focus) return;
      const targetId = mission?.id ?? id;
      if (!focus.visibleTargetIds.includes(targetId)) focus.visibleTargetIds = [...focus.visibleTargetIds, targetId];
      if (mission) window.dispatchEvent(new CustomEvent('aircommand:map-focus-elements', { detail: [{ type: 'target', id: mission.id, label: mission.name }] }));
    } else if (type === 'threat' && id) {
      const threat = this.threats.find((item) => item.id.toLowerCase() === id.toLowerCase());
      const threatId = threat?.id ?? id;
      if (!focus.visibleThreatIds.includes(threatId)) focus.visibleThreatIds = [...focus.visibleThreatIds, threatId];
    } else if ((type === 'ground' || type === 'enemy') && id) {
      const key = type === 'ground' ? 'visibleGroundIds' : 'visibleEnemyIds';
      if (!focus[key].includes(id)) focus[key] = [...focus[key], id];
    }
    const layer = type === 'aircraft' ? 'aircraft' : type === 'threat' ? 'threats' : type === 'target' || type === 'mission' ? 'targets' : type;
    if (!focus.revealedLayers.includes(layer)) focus.revealedLayers = [...focus.revealedLayers, layer];
  }

  constructor() {
    const s = generateSystemState();
    this.aircraft = s.aircraft;
    this.missions = s.missions;
    this.threats = s.threats;
    this.airspaceZones = freshAirspace();
    this.weatherSystems = freshWeather();
    this.pushEvent('SYSTEM', 'INITIALIZED', 'ok');
    this.pushEvent('FUSION', 'ENGINE ONLINE', 'ok');
    this.pushEvent('TRACK', `${s.aircraft.length} AIRCRAFT TRACKED`, 'info');
    this.pushEvent('MISSION', `${s.missions.length} MISSIONS QUEUED`, 'info');
    this.pushEvent('THREAT', `${s.threats.length} ZONES ACTIVE`, 'warn');
    this.pushEvent('COMMAND', 'AWAITING COMMANDER INPUT', 'info');
    this.startTicker();
    this.startContinuousReoptimization();
  }

  startTicker() {
    if (this.tickHandle !== null) return;
    this.tickHandle = window.setInterval(() => this.tickExecutions(), 1000);
  }

  setSimSpeed(speed: 0 | 1 | 2 | 4) {
    this.simSpeed = speed;
    if (speed !== 0) setNarrationSpeed(speed);
  }

  startContinuousReoptimization() {
    if (this.reoptimizationInterval !== null) return;
    this.reoptimizationInterval = window.setInterval(() => {
      if (this.continuousReoptimization && !this.computing) {
        this.silentReoptimize();
      }
    }, 30000); // 30 seconds
  }

  async silentReoptimize() {
    if (this.computing || this.reoptimizing) return;
    this.reoptimizing = true;
    const startT = performance.now();
    try {
      await new Promise((r) => setTimeout(r, 850));
      this.coas = optimise(this.scenarioAircraft, this.scenarioMissions, this.optimisationThreats(), this.airspaceZones, this.weatherSystems, this.riskBias);
      this.coaGenerationCount += 1;
      this.lastCoaComputeMs = Math.round(performance.now() - startT);
    } finally {
      this.reoptimizing = false;
    }
  }

  triggerReoptimization(force = false) {
    if (!this.continuousReoptimization && !force) return;
    if (this.reoptimizationDebounce !== null) clearTimeout(this.reoptimizationDebounce);
    this.reoptimizationDebounce = window.setTimeout(() => {
      this.reoptimizationDebounce = null;
      this.silentReoptimize();
    }, force ? 250 : 2000);
  }

  setPrioritization(value: number) {
    this.prioritization = Math.max(0, Math.min(100, value));
    this.riskBias = 0.15 + (this.prioritization / 100) * 1.1;
    this.triggerReoptimization(true);
  }

  toggleContinuousReoptimization() {
    this.continuousReoptimization = !this.continuousReoptimization;
    if (this.continuousReoptimization) {
      this.startContinuousReoptimization();
      this.pushEvent('SYSTEM', 'CONTINUOUS RE-OPTIMISATION ENABLED', 'info');
    } else {
      if (this.reoptimizationDebounce !== null) {
        clearTimeout(this.reoptimizationDebounce);
        this.reoptimizationDebounce = null;
      }
      if (this.reoptimizationInterval !== null) {
        clearInterval(this.reoptimizationInterval);
        this.reoptimizationInterval = null;
      }
      this.pushEvent('SYSTEM', 'CONTINUOUS RE-OPTIMISATION DISABLED', 'warn');
    }
  }

  pushEvent(source: string, msg: string, level: EventLevel = 'info') {
    const time = new Date().toISOString().slice(11, 23);
    this.events = [...this.events, { time, source, msg, level, scenario: this.activeScenarioFilter }].slice(-120);
    narrateEvent(source, msg, level === 'alert');
  }

  async generateCOAs() {
    if (this.computing) return;
    this.computing = true;
    const startT = performance.now();
    await new Promise((r) => setTimeout(r, 850));
    this.coas = optimise(this.scenarioAircraft, this.scenarioMissions, this.optimisationThreats(), this.airspaceZones, this.weatherSystems, this.riskBias);
    
    // In DEGRADED mode, reduce confidence values
    if (this.mode === 'DEGRADED') {
      this.coas = this.coas.map(coa => ({
        ...coa,
        successProbability: Math.max(30, coa.successProbability - 20),
        riskScore: Math.min(100, coa.riskScore + 15),
      }));
    }
    
    this.selectedCoaId = this.coas[0]?.id ?? null;
    this.computing = false;
    this.coaGenerationCount += 1;
    this.lastCoaComputeMs = Math.round(performance.now() - startT);
    const blocked = this.coas[0] ? Object.values(this.coas[0].assignments).filter((a) => a.length === 0).length : 0;
    const note = blocked > 0 ? ` · ${blocked} UNCOVERED` : '';
    const modeNote = this.mode === 'DEGRADED' ? ' · CONFIDENCE REDUCED' : '';
    this.pushEvent('COMMAND', `COA RECOMPUTED · ${this.coas.length} OPTIONS${note}${modeNote}`, 'ok');
    if (this.coas[0]) {
      for (const warning of detectDeconflictionWarnings(this.coas[0], this.aircraft, this.missions)) this.pushEvent('DECONFLICT', warning, 'alert');
    }
  }

  private optimisationThreats(): Threat[] {
    const threats = this.scenarioThreats;
    if (this.mode !== 'DEGRADED') return threats;
    return threats.map((threat) => ({
      ...threat,
      probability: Math.max(0, Math.min(100, Math.round(threat.probability + (Math.random() * 30 - 15)))),
    }));
  }

  selectCOA(id: string) {
    this.selectedCoaId = id;
    this.coaSelectionCount += 1;
  }

  selectBase(id: string | null) {
    this.selectedBaseId = id;
    if (id) this.pushEvent('MAP', `BASE SELECTED · ${id.toUpperCase()}`, 'info');
  }

  setAircraftStatus(id: string, status: AircraftStatus) {
    this.aircraft = this.aircraft.map((a) => (a.id === id ? { ...a, status } : a));
    this.triggerReoptimization();
  }

  addThreat(t: Threat) {
    this.threats = [...this.threats, t]; 
    this.pushEvent('THREAT', `THREAT ALERT · ${t.type}`, 'warn');
    this.triggerReoptimization();
  }
  closeAirspace(id: string) {
    this.airspaceZones = this.airspaceZones.map((zone) => zone.id === id ? { ...zone, status: 'CLOSED' as const } : zone);
    const zone = this.airspaceZones.find((item) => item.id === id);
    if (zone) this.pushEvent('AIRSPACE', `CORRIDOR CLOSED · ${zone.name}`, 'warn');
    this.triggerReoptimization();
  }
  addWeather(system: import('../types').WeatherSystem) {
    this.weatherSystems = [...this.weatherSystems.filter((item) => item.id !== system.id), system];
    this.pushEvent('WEATHER', `SYSTEM UPDATED · ${system.id.toUpperCase()} · VIS ${system.visibility_km}KM`, system.severity >= 4 ? 'warn' : 'info');
    this.triggerReoptimization();
  }
  setMode(m: 'NORMAL' | 'DEGRADED') { this.mode = m; this.triggerReoptimization(); }

  // ============ MISSION EXECUTION ============

  startMission(missionId: string, aircraftIds: string[], templateId: string) {
    clearVoiceDedupe();
    const mission = this.missions.find((m) => m.id === missionId);
    if (!mission) return;
    const template = HISTORICAL_MISSIONS[templateId];
    if (!template) return;
    const aircraft = this.aircraft.filter((a) => aircraftIds.includes(a.id));
    if (aircraft.length === 0) return;

    const weapon = optimalWeaponFor(aircraft[0].type, mission.targetType);
    const active = createActiveMission(mission, aircraft, template, weapon?.id ?? null);
    this.activeMissions = [...this.activeMissions, active];

    // Mark mission active
    this.missions = this.missions.map((m) => m.id === missionId ? { ...m, status: 'ACTIVE' as const } : m);

    // Mark aircraft enroute
    for (const ac of aircraft) {
      this.aircraft = this.aircraft.map((x) => x.id === ac.id ? { ...x, status: 'PMC' as AircraftStatus } : x);
    }

    const wpn = weapon ? weapon.name : 'UNARMED';
    this.pushEvent('EXEC', `MISSION LAUNCHED · ${mission.name} · ${aircraft.length} AC · ${wpn}`, 'ok');
    this.pushEvent('EXEC', `TEMPLATE: ${template.reference}`, 'info');
  }

  tickExecutions() {
    if (this.simSpeed === 0) return;
    if (this.activeMissions.length === 0) return;
    const updated: ActiveMission[] = [];

    for (const am of this.activeMissions) {
      if (am.phase === 'COMPLETE' || am.phase === 'ABORTED') { updated.push(am); continue; }

      if (am.pendingDecision) { updated.push(am); continue; }

      const dur = phaseDuration(am.phase);
      am.elapsedMin += this.simSpeed / 60; // simulation time scales with the selected playback rate
      am.phaseStartTime -= (this.simSpeed - 1) * 1000;
      const phaseElapsed = (Date.now() - am.phaseStartTime) / 60000;

      // Update positions along path
      const frac = progressFraction(am.phase, phaseElapsed, dur);
      const nextAm = { ...am, positions: { ...am.positions } };
      for (const acId of am.aircraftIds) {
        const ac = this.aircraft.find((a) => a.id === acId);
        if (!ac) continue;
        const start = ac.position;
        nextAm.positions[acId] = interpolatePosition(start, am.target, frac);
      }
      this.aircraft = this.aircraft.map((a) => {
        const p = nextAm.positions[a.id];
        return p ? { ...a, position: p } : a;
      });

      // Check for decision trigger at this phase
      const pending = am.decisions.find((d) =>
        d.atPhase === am.phase && !am.decisionsMade.some((m) => m.point.title === d.title)
      );
      if (pending && phaseElapsed > 0.3) {
        nextAm.pendingDecision = pending;
        this.pushEvent('DECISION', `AWAITING COMMAND · ${pending.title}`, 'alert');
        updated.push(nextAm);
        continue;
      }

      // Phase transition
      if (phaseElapsed >= dur) {
        const np = nextPhase(am.phase);
        if (np === 'COMPLETE') {
          nextAm.phase = 'COMPLETE';
          nextAm.outcome = am.decisionsMade.some((d) => d.branch.outcome === 'abort') ? 'ABORTED' : 'SUCCESS';
          this.pushEvent('EXEC', `MISSION COMPLETE · ${am.missionName} · OUTCOME ${nextAm.outcome}`, nextAm.outcome === 'ABORTED' ? 'warn' : 'ok');
          this.missions = this.missions.map((m) => m.id === am.missionId ? { ...m, status: 'COMPLETE' as const } : m);
          // Recover aircraft
          for (const acId of am.aircraftIds) {
            this.setAircraftStatus(acId, 'FMC');
          }
          // Queue for After-Action Review
          if (!this.aarQueue.includes(am.id)) {
            this.aarQueue = [...this.aarQueue, am.id];
          }
        } else {
          nextAm.phase = np;
          nextAm.phaseStartTime = Date.now();
          this.pushEvent('EXEC', `${am.missionName} ENTERED ${np}`, 'info');
          if (np === 'RELEASE') {
            const weapon = am.weaponId ? WEAPONS[am.weaponId] : null;
            const mission = this.missions.find((m) => m.id === am.missionId);
            this.pushEvent('WEAPON', `WEAPON RELEASED · ${weapon?.name ?? am.weaponId ?? 'UNSPECIFIED'} · ${mission?.targetType ?? 'UNKNOWN TARGET'}`, 'alert');
            window.setTimeout(() => this.pushEvent('WEAPON', `IMPACT CONFIRMED · ${am.missionName}`, 'alert'), 5000);
          }
        }
      }

      updated.push(nextAm);
    }

    this.activeMissions = updated;
    this.cleanupCompleted();
  }

  /** Fast-forward exercise mission time for the scripted training simulation. */
  advanceSimulationClock(minutes = 5) {
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    this.activeMissions = this.activeMissions.map((mission) => ({
      ...mission,
      phaseStartTime: mission.phaseStartTime - minutes * 60000,
    }));
    this.tickExecutions();
  }

  cleanupCompleted() {
    this.activeMissions = this.activeMissions.filter((am) => {
      if (am.phase !== 'COMPLETE' && am.phase !== 'ABORTED') return true;
      return true; // keep visible; could add timestamp filter
    });
  }

  consumeAAR(): string | null {
    if (this.aarQueue.length === 0) return null;
    const [first, ...rest] = this.aarQueue;
    this.aarQueue = rest;
    return first;
  }

  replayMission(missionId: string) {
    const prev = this.activeMissions.find((m) => m.id === missionId || m.missionId === missionId);
    if (!prev) return;
    this.startMission(prev.missionId, prev.aircraftIds, prev.templateId);
  }

  resolveDecision(missionId: string, branchId: string) {
    const am = this.activeMissions.find((m) => m.id === missionId);
    if (!am || !am.pendingDecision) return;
    const branch = am.pendingDecision.branches.find((b) => b.id === branchId);
    if (!branch) return;

    am.decisionsMade = [...am.decisionsMade, { point: am.pendingDecision, branch, at: new Date().toISOString().slice(11, 19) }];
    am.narrative = [...am.narrative, `[${am.pendingDecision.atPhase}] ${branch.label} → ${branch.consequence}`];
    am.riskDelta += branch.effect.riskDelta ?? 0;

    if (branch.effect.missionDelayMin) {
      am.phaseStartTime -= branch.effect.missionDelayMin * 60000;
    }
    if (branch.effect.addThreat) {
      this.addThreat({
        id: `th-auto-${Date.now()}`,
        type: 'SAM',
        position: am.target,
        radius: 50,
        probability: 70,
        confidence: 60,
      });
    }

    if (branch.outcome === 'abort') {
      am.phase = 'ABORTED';
      am.outcome = 'ABORTED';
      this.missions = this.missions.map((m) => m.id === am.missionId ? { ...m, status: 'ABORTED' as const } : m);
      for (const acId of am.aircraftIds) this.setAircraftStatus(acId, 'FMC');
      this.pushEvent('EXEC', `MISSION ABORTED · ${am.missionName}`, 'warn');
      if (!this.aarQueue.includes(am.id)) {
        this.aarQueue = [...this.aarQueue, am.id];
      }
    } else {
      this.pushEvent('DECISION', `RESOLVED · ${branch.label}`, branch.outcome === 'success' ? 'ok' : 'warn');
      this.pushEvent('EXEC', branch.consequence, 'info');
    }

    am.pendingDecision = null;
    // Force reactivity
    this.activeMissions = [...this.activeMissions];
  }

  dismissDecision(missionId: string) {
    const am = this.activeMissions.find((m) => m.id === missionId);
    if (am) am.pendingDecision = null;
    this.activeMissions = [...this.activeMissions];
  }

  // ============ SCENARIOS ============

  runScenario(name: string) {
    const steps = SCENARIOS[name];
    if (!steps) return;
    this.clearScenarioTimers();
    this.activeScenario = name;
    this.activeScenarioFilter = name;
    const sceneMissions = SCENARIO_MISSION_SETS[name] ?? [];
    const additions = sceneMissions.filter((mission) => !this.missions.some((existing) => existing.id === mission.id));
    if (additions.length) {
      this.scenarioOnlyMissionIds = [...this.scenarioOnlyMissionIds, ...additions.map((mission) => mission.id)];
      this.missions = [...this.missions, ...additions];
    }
    this.pushEvent('SCENARIO', `START · ${SCENARIO_LABELS[name]}`, 'info');
    void this.generateCOAs();
    let lastDelay = 0;
    for (const step of steps) {
      lastDelay = Math.max(lastDelay, step.delay);
      this.scenarioTimers.push(window.setTimeout(() => this.execute(step), step.delay));
    }
    this.scenarioTimers.push(window.setTimeout(() => { this.activeScenario = null; this.scenarioTimers = []; }, lastDelay + 2000));
  }

  setScenarioFilter(name: string | null) {
    if (!name) { this.clearScenarioTimers(); this.activeScenario = null; }
    this.activeScenarioFilter = name;
    if (name) void this.generateCOAs();
  }

  private clearScenarioTimers() {
    for (const timer of this.scenarioTimers) window.clearTimeout(timer);
    this.scenarioTimers = [];
  }

  private execute(step: ScenarioStep) {
    switch (step.action) {
      case 'log':        this.pushEvent(step.payload.source, step.payload.msg, step.payload.level); break;
      case 'set_status': this.setAircraftStatus(step.payload.id, step.payload.status); break;
      case 'add_threat': this.addThreat(step.payload.threat); break;
      case 'close_airspace': this.closeAirspace(step.payload.id); break;
      case 'add_weather': this.addWeather(step.payload.system); break;
      case 'recompute':  this.generateCOAs(); break;
      case 'set_mode':   this.setMode(step.payload.mode); break;
      case 'track_loss':
        this.trackLossAnalysis = analyzeTrackLoss(
          step.payload.trackId,
          step.payload.lastPosition,
          step.payload.nearbyEnemyAssets,
          step.payload.terrainElevation,
          step.payload.recentCombat
        );
        this.pushEvent('ANALYSIS', `TRACK LOSS HYPOTHESIS · ${this.trackLossAnalysis.topHypothesis} (${Math.round(this.trackLossAnalysis.confidence * 100)}%)`, 'alert');
        break;
      case 'data_poisoning':
        // Add spoofed track
        this.addThreat({
          id: step.payload.trackId,
          type: 'AIR',
          position: step.payload.position,
          radius: 50,
          probability: 85,
          confidence: 75,
        });
        this.pushEvent('SENSOR', `SPOOFED TRACK APPEARED · ${step.payload.trackId}`, 'warn');
        if (this.mode === 'DEGRADED') {
          this.pushEvent('FUSION', 'CROSS-SENSOR VALIDATION UNAVAILABLE · DEGRADED SINGLE-SOURCE MODE', 'warn');
          setTimeout(() => {
            this.threats = this.threats.filter(t => t.id !== step.payload.trackId);
            this.pushEvent('SENSOR', `UNVERIFIED TRACK EXPIRED · ${step.payload.trackId}`, 'warn');
          }, 5000);
          break;
        }
        
        // Validation runs two seconds after the track appears.
        setTimeout(() => {
          this.pushEvent('FUSION', 'CROSS-SENSOR VALIDATION IN PROGRESS · 3 SENSORS', 'info');
          this.spoofedTrackId = step.payload.trackId;
          this.pushEvent('FUSION', `CROSS-SENSOR VALIDATION FAILED · TRACK ID 4421 FLAGGED SPOOFED · CONFIDENCE 92%`, 'alert');
          // Remove three seconds after validation flags the marker.
          setTimeout(() => {
            this.threats = this.threats.filter(t => t.id !== step.payload.trackId);
            this.spoofedTrackId = null;
            this.pushEvent('FUSION', `SPOOFED TRACK REMOVED · ${step.payload.trackId}`, 'ok');
          }, 3000);
        }, 2000);
        break;
    }
  }

  reset() {
    this.clearScenarioTimers();
    const s = generateSystemState();
    this.aircraft = s.aircraft;
    this.missions = s.missions;
    this.scenarioOnlyMissionIds = [];
    this.threats = s.threats;
    this.airspaceZones = freshAirspace();
    this.weatherSystems = freshWeather();
    this.coas = [];
    this.selectedCoaId = null;
    this.selectedBaseId = null;
    this.mode = 'NORMAL';
    this.activeScenario = null;
    this.activeScenarioFilter = null;
    this.activeMissions = [];
    this.pushEvent('SYSTEM', 'STATE RESET · BASELINE RESTORED', 'ok');
  }
}

export const system = new SystemStore();

