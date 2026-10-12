// src/lib/stores/systemStore.svelte.ts
import { generateSystemState } from '../data/seed.js';
import { generateCOAs as computeCOAs } from '../engine/optimisation.js';
import { SCENARIOS, SCENARIO_LABELS } from '../engine/scenario.js';
import type { Aircraft, Mission, Threat, COA, SystemState } from '../types/index.js';

export const system = new (class {
  // Reactive state fields (Svelte 5 runes)
  $state = {
    aircraft: [] as Aircraft[],
    missions: [] as Mission[],
    threats: [] as Threat[],
    coas: [] as COA[],
    selectedCoaId: null as string | null,
    events: [] as Array<{ time: string; source: string; msg: string; level: 'info' | 'ok' | 'warn' | 'alert' }>,
    mode: 'NORMAL' as 'NORMAL' | 'DEGRADED',
    computing: false,
    activeScenario: null as string | null,
  };

  constructor() {
    const seed = generateSystemState();
    this.$state.aircraft = seed.aircraft;
    this.$state.missions = seed.missions;
    this.$state.threats = seed.threats;
    // seed events
    this.pushEvent('SYSTEM', 'INITIALIZED', 'ok');
    this.pushEvent('FUSION', 'ENGINE ONLINE', 'ok');
    this.pushEvent('TRACK', '14 AIRCRAFT TRACKED', 'info');
    this.pushEvent('MISSION', '6 MISSIONS QUEUED', 'info');
    this.pushEvent('THREAT', '8 ZONES ACTIVE', 'warn');
    this.pushEvent('COMMAND', 'AWAITING COMMANDER INPUT', 'info');
  }

  pushEvent(source: string, msg: string, level: 'info' | 'ok' | 'warn' | 'alert' = 'info') {
    const time = new Date().toISOString().slice(11, 19);
    this.$state.events = [{ time, source, msg, level }, ...this.$state.events].slice(0, 50);
  }

  async generateCOAs() {
    if (this.$state.computing) return;
    this.$state.computing = true;
    await new Promise(r => setTimeout(r, 850));
    const coas = computeCOAs(this.$state.aircraft, this.$state.missions, this.$state.threats);
    this.$state.coas = coas;
    this.$state.selectedCoaId = coas[0]?.id ?? null;
    this.$state.computing = false;
    this.pushEvent('COMMAND', `COA RECOMPUTED · ${coas.length} OPTIONS AVAILABLE`, 'ok');
  }

  selectCOA(id: string) {
    this.$state.selectedCoaId = id;
  }

  setAircraftStatus(id: string, status: 'FMC' | 'PMC' | 'NMC') {
    this.$state.aircraft = this.$state.aircraft.map(a => (a.id === id ? { ...a, status } : a));
  }

  addThreat(threat: Threat) {
    this.$state.threats = [...this.$state.threats, threat];
  }

  setMode(mode: 'NORMAL' | 'DEGRADED') {
    this.$state.mode = mode;
  }

  runScenario(name: string) {
    const steps = SCENARIOS[name];
    if (!steps) return;
    this.$state.activeScenario = name;
    this.pushEvent('SCENARIO', `START · ${SCENARIO_LABELS[name]}`, 'info');
    steps.forEach(step => {
      setTimeout(() => this.executeAction(step), step.delay);
    });
    const total = steps.reduce((mx, s) => Math.max(mx, s.delay), 0) + 2000;
    setTimeout(() => (this.$state.activeScenario = null), total);
  }

  private executeAction(step: any) {
    const { action, payload } = step;
    switch (action) {
      case 'log':
        this.pushEvent(payload.source, payload.msg, payload.level);
        break;
      case 'set_status':
        this.setAircraftStatus(payload.id, payload.status);
        break;
      case 'add_threat':
        this.addThreat(payload.threat);
        break;
      case 'recompute':
        this.generateCOAs();
        break;
      case 'set_mode':
        this.setMode(payload.mode);
        break;
    }
  }

  reset() {
    const seed = generateSystemState();
    this.$state.aircraft = seed.aircraft;
    this.$state.missions = seed.missions;
    this.$state.threats = seed.threats;
    this.$state.coas = [];
    this.$state.selectedCoaId = null;
    this.$state.mode = 'NORMAL';
    this.$state.activeScenario = null;
    this.pushEvent('SYSTEM', 'STATE RESET · BASELINE RESTORED', 'ok');
  }
})();
