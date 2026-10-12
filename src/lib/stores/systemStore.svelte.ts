import { generateSystemState } from '../data/seed';
import { generateCOAs as optimise } from '../engine/optimisation';
import { SCENARIOS, SCENARIO_LABELS, type ScenarioStep } from '../engine/scenario';
import type { Aircraft, Mission, Threat, COA, AircraftStatus } from '../types';

export type EventLevel = 'info' | 'ok' | 'warn' | 'alert';
export interface EventEntry { time: string; source: string; msg: string; level: EventLevel; }

class SystemStore {
  aircraft = $state<Aircraft[]>([]);
  missions = $state<Mission[]>([]);
  threats = $state<Threat[]>([]);
  coas = $state<COA[]>([]);
  selectedCoaId = $state<string | null>(null);
  events = $state<EventEntry[]>([]);
  mode = $state<'NORMAL' | 'DEGRADED'>('NORMAL');
  computing = $state(false);
  activeScenario = $state<string | null>(null);

  constructor() {
    const s = generateSystemState();
    this.aircraft = s.aircraft;
    this.missions = s.missions;
    this.threats = s.threats;
    this.pushEvent('SYSTEM', 'INITIALIZED', 'ok');
    this.pushEvent('FUSION', 'ENGINE ONLINE', 'ok');
    this.pushEvent('TRACK', `${s.aircraft.length} AIRCRAFT TRACKED`, 'info');
    this.pushEvent('MISSION', `${s.missions.length} MISSIONS QUEUED`, 'info');
    this.pushEvent('THREAT', `${s.threats.length} ZONES ACTIVE`, 'warn');
    this.pushEvent('COMMAND', 'AWAITING COMMANDER INPUT', 'info');
  }

  pushEvent(source: string, msg: string, level: EventLevel = 'info') {
    const time = new Date().toISOString().slice(11, 19);
    this.events = [...this.events, { time, source, msg, level }].slice(-50);
  }

  async generateCOAs() {
    if (this.computing) return;
    this.computing = true;
    await new Promise((r) => setTimeout(r, 850));
    this.coas = optimise(this.aircraft, this.missions, this.threats);
    this.selectedCoaId = this.coas[0]?.id ?? null;
    this.computing = false;
    this.pushEvent('COMMAND', `COA RECOMPUTED · ${this.coas.length} OPTIONS · ${this.aircraft.length} AC ELIGIBLE`, 'ok');
  }

  selectCOA(id: string) { this.selectedCoaId = id; }

  setAircraftStatus(id: string, status: AircraftStatus) {
    this.aircraft = this.aircraft.map((a) => (a.id === id ? { ...a, status } : a));
  }

  addThreat(t: Threat) { this.threats = [...this.threats, t]; }

  setMode(m: 'NORMAL' | 'DEGRADED') { this.mode = m; }

  runScenario(name: string) {
    const steps = SCENARIOS[name];
    if (!steps) return;
    this.activeScenario = name;
    this.pushEvent('SCENARIO', `START · ${SCENARIO_LABELS[name]}`, 'info');
    let lastDelay = 0;
    for (const step of steps) {
      lastDelay = Math.max(lastDelay, step.delay);
      setTimeout(() => this.execute(step), step.delay);
    }
    setTimeout(() => { this.activeScenario = null; }, lastDelay + 2000);
  }

  private execute(step: ScenarioStep) {
    switch (step.action) {
      case 'log':        this.pushEvent(step.payload.source, step.payload.msg, step.payload.level); break;
      case 'set_status': this.setAircraftStatus(step.payload.id, step.payload.status); break;
      case 'add_threat': this.addThreat(step.payload.threat); break;
      case 'recompute':  this.generateCOAs(); break;
      case 'set_mode':   this.setMode(step.payload.mode); break;
    }
  }

  reset() {
    const s = generateSystemState();
    this.aircraft = s.aircraft;
    this.missions = s.missions;
    this.threats = s.threats;
    this.coas = [];
    this.selectedCoaId = null;
    this.mode = 'NORMAL';
    this.activeScenario = null;
    this.pushEvent('SYSTEM', 'STATE RESET · BASELINE RESTORED', 'ok');
  }
}

export const system = new SystemStore();
