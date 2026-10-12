// src/lib/engine/scenario.ts
export interface ScenarioStep {
  delay: number;
  action: 'log' | 'set_status' | 'add_threat' | 'recompute' | 'set_mode';
  payload: any;
}

export const SCENARIO_LABELS: Record<string, string> = {
  aircraft_nmc: 'AIRCRAFT NMC',
  multi_crisis: 'MULTI-CRISIS',
  radar_loss: 'RADAR LOSS',
};

export const SCENARIOS: Record<string, ScenarioStep[]> = {
  aircraft_nmc: [
    {
      delay: 0,
      action: 'log',
      payload: { source: 'HUMS', msg: 'ENGINE VIBRATION ANOMALY · TAIL AMB-101', level: 'warn' },
    },
    {
      delay: 600,
      action: 'set_status',
      payload: { id: 'ac-001', status: 'PMC' },
    },
    {
      delay: 1200,
      action: 'log',
      payload: { source: 'MAINT', msg: 'AMB-101 RECLASSIFIED PMC · RESTRICTED TO LOCAL OPS', level: 'warn' },
    },
    {
      delay: 1800,
      action: 'recompute',
      payload: {},
    },
    {
      delay: 2800,
      action: 'log',
      payload: { source: 'COMMAND', msg: 'COA RECOMPUTED · AIRCRAFT ROSTER ADJUSTED', level: 'ok' },
    },
  ],
  multi_crisis: [
    {
      delay: 0,
      action: 'log',
      payload: { source: 'INTEL', msg: 'NEW SAM SITE DETECTED · GRID 34.15N/77.55E', level: 'alert' },
    },
    {
      delay: 700,
      action: 'add_threat',
      payload: {
        threat: { id: 'th-999', type: 'SAM', position: { lat: 34.15, lng: 77.55 }, radius: 60, probability: 85, confidence: 78 },
      },
    },
    {
      delay: 1400,
      action: 'log',
      payload: { source: 'WEATHER', msg: 'PRIMARY INGRESS CORRIDOR CLOSED · CIRRUS-7', level: 'warn' },
    },
    {
      delay: 2100,
      action: 'log',
      payload: { source: 'HUMS', msg: 'HYDRAULIC PRESSURE DROP · TAIL TEZ-105', level: 'warn' },
    },
    {
      delay: 2800,
      action: 'set_status',
      payload: { id: 'ac-005', status: 'PMC' },
    },
    {
      delay: 3500,
      action: 'recompute',
      payload: {},
    },
    {
      delay: 4800,
      action: 'log',
      payload: { source: 'COMMAND', msg: 'COA RECOMPUTED · 2 AIRCRAFT INELIGIBLE', level: 'ok' },
    },
  ],
  radar_loss: [
    {
      delay: 0,
      action: 'log',
      payload: { source: 'RADAR', msg: 'AWACS LINK DEGRADED · TRACK INTEGRITY 62%', level: 'warn' },
    },
    {
      delay: 600,
      action: 'set_mode',
      payload: { mode: 'DEGRADED' },
    },
    {
      delay: 1200,
      action: 'log',
      payload: { source: 'SYSTEM', msg: 'EDGE MODE ACTIVE · FALLBACK TO LOCAL SENSOR FUSION', level: 'warn' },
    },
    {
      delay: 2000,
      action: 'log',
      payload: { source: 'FUSION', msg: 'THREAT PICTURE CONFIDENCE · HIGH → MEDIUM', level: 'warn' },
    },
    {
      delay: 3000,
      action: 'log',
      payload: { source: 'COMMAND', msg: 'COA CONFIDENCE REDUCED · HUMAN VERIFICATION REQUIRED', level: 'alert' },
    },
  ],
};
