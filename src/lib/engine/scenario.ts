import type { Threat, AircraftStatus } from '../types';

export type ScenarioAction = 'log' | 'set_status' | 'add_threat' | 'close_airspace' | 'add_weather' | 'recompute' | 'set_mode' | 'track_loss' | 'data_poisoning';

export interface ScenarioStep {
  delay: number;
  action: ScenarioAction;
  payload: any;
}

export const SCENARIO_LABELS: Record<string, string> = {
  aircraft_nmc: 'AIRCRAFT NMC',
  multi_crisis: 'MULTI-CRISIS',
  radar_loss: 'RADAR LOSS',
  track_loss: 'TRACK LOSS',
  data_poisoning: 'DATA POISONING',
};

export const SCENARIOS: Record<string, ScenarioStep[]> = {
  aircraft_nmc: [
    { delay: 0,    action: 'log',        payload: { source: 'HUMS',    msg: 'ENGINE VIBRATION ANOMALY · TAIL AMB-101',              level: 'warn'  } },
    { delay: 600,  action: 'set_status', payload: { id: 'ac-001', status: 'PMC' as AircraftStatus } },
    { delay: 1200, action: 'log',        payload: { source: 'MAINT',   msg: 'AMB-101 RECLASSIFIED PMC · RESTRICTED TO LOCAL OPS',    level: 'warn'  } },
    { delay: 1800, action: 'recompute',  payload: {} },
    { delay: 2800, action: 'log',        payload: { source: 'COMMAND', msg: 'COA RECOMPUTED · AIRCRAFT ROSTER ADJUSTED',              level: 'ok'    } },
  ],

  multi_crisis: [
    { delay: 0,    action: 'log',        payload: { source: 'INTEL',   msg: 'NEW SAM SITE DETECTED · GRID 34.15N/77.55E',            level: 'alert' } },
    { delay: 700,  action: 'add_threat', payload: { threat: { id: 'th-999', type: 'SAM', position: { lat: 34.15, lng: 77.55 }, radius: 60, probability: 85, confidence: 78 } as Threat } },
    { delay: 1200, action: 'close_airspace', payload: { id: 'kashmir-corridor-bravo' } },
    { delay: 1400, action: 'add_weather', payload: { system: { id: 'cirrus-7', type: 'fog', severity: 5, visibility_km: 0.8, ceiling_ft: 500, windDir_deg: 310, windSpeed_kt: 18, validUntil: '2026-10-14T18:00:00+05:30', polygon: [{ lat: 33.55, lng: 75.85 }, { lat: 34.08, lng: 75.85 }, { lat: 34.08, lng: 76.75 }, { lat: 33.55, lng: 76.75 }] } } },
    { delay: 2100, action: 'log',        payload: { source: 'HUMS',    msg: 'HYDRAULIC PRESSURE DROP · TAIL TEZ-105',               level: 'warn'  } },
    { delay: 2800, action: 'set_status', payload: { id: 'ac-005', status: 'PMC' as AircraftStatus } },
    { delay: 3500, action: 'recompute',  payload: {} },
    { delay: 4800, action: 'log',        payload: { source: 'COMMAND', msg: 'COA RECOMPUTED · 2 AIRCRAFT INELIGIBLE',               level: 'ok'    } },
  ],

  radar_loss: [
    { delay: 0,    action: 'log',      payload: { source: 'RADAR',   msg: 'AWACS LINK DEGRADED · TRACK INTEGRITY 62%',              level: 'warn'  } },
    { delay: 600,  action: 'set_mode', payload: { mode: 'DEGRADED' } },
    { delay: 1200, action: 'log',      payload: { source: 'SYSTEM',  msg: 'EDGE MODE ACTIVE · FALLBACK TO LOCAL SENSOR FUSION',     level: 'warn'  } },
    { delay: 2000, action: 'log',      payload: { source: 'FUSION',  msg: 'THREAT PICTURE CONFIDENCE · HIGH TO MEDIUM',             level: 'warn'  } },
    { delay: 3000, action: 'log',      payload: { source: 'COMMAND', msg: 'COA CONFIDENCE REDUCED · HUMAN VERIFICATION REQUIRED',   level: 'alert' } },
  ],

  track_loss: [
    { delay: 0,    action: 'log',        payload: { source: 'RADAR',   msg: 'TRACK LOST · TH-003 SUDDEN DISAPPEARANCE',              level: 'alert' } },
    { delay: 200,  action: 'track_loss', payload: { trackId: 'th-003', lastPosition: { lat: 34.2, lng: 77.8 }, nearbyEnemyAssets: [{ type: 'EW', position: { lat: 34.25, lng: 77.85 } }], terrainElevation: 2500, recentCombat: true } },
  ],

  data_poisoning: [
    { delay: 0,    action: 'log',        payload: { source: 'SENSOR',  msg: 'NEW TRACK DETECTED · TRACK ID 4421',                level: 'info'  } },
    { delay: 200,  action: 'data_poisoning', payload: { trackId: 'th-4421', position: { lat: 34.18, lng: 77.92 } } },
  ],
};
