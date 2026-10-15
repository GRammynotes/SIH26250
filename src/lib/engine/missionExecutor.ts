import type { Mission, Aircraft, Position } from '../types';
import type { HistoricalMission, DecisionPoint, DecisionBranch } from '../data/historicalMissions';

export type MissionPhase = 'INGRESS' | 'WEZ' | 'RELEASE' | 'EGRESS' | 'RTB' | 'COMPLETE' | 'ABORTED';

export interface ActiveMission {
  id: string;
  missionId: string;
  missionName: string;
  templateId: string;
  aircraftIds: string[];
  weaponId: string | null;
  phase: MissionPhase;
  phaseStartTime: number;
  elapsedMin: number;
  etaMin: number;
  target: Position;
  positions: Record<string, Position>;
  origins: Record<string, Position>;
  decisions: DecisionPoint[];
  pendingDecision: DecisionPoint | null;
  decisionsMade: Array<{ point: DecisionPoint; branch: DecisionBranch; at: string }>;
  outcome: 'PENDING' | 'SUCCESS' | 'PARTIAL' | 'ABORTED' | 'ESCALATED';
  riskDelta: number;
  narrative: string[];
}

export function phaseOrder(): MissionPhase[] {
  return ['INGRESS', 'WEZ', 'RELEASE', 'EGRESS', 'RTB', 'COMPLETE'];
}

export function nextPhase(current: MissionPhase): MissionPhase {
  const order = phaseOrder();
  const idx = order.indexOf(current);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : 'COMPLETE';
}

export function phaseDuration(phase: MissionPhase, training = false): number {
  const normalDuration = (() => {
  switch (phase) {
    case 'INGRESS': return 4;
    case 'WEZ':     return 2;
    case 'RELEASE': return 1;
    case 'EGRESS':  return 4;
    case 'RTB':     return 5;
    default:        return 0;
  }
  })();
  return training ? normalDuration * 0.4 : normalDuration;
}

export function createActiveMission(
  mission: Mission,
  aircraft: Aircraft[],
  template: HistoricalMission,
  weaponId: string | null,
): ActiveMission {
  const positions: Record<string, Position> = {};
  const totalDistance = 300; // approximate ingress leg in km for animation
  for (const ac of aircraft) {
    positions[ac.id] = { ...ac.position };
  }
  return {
    id: `am-${Date.now()}-${mission.id}`,
    missionId: mission.id,
    missionName: mission.name,
    templateId: template.id,
    aircraftIds: aircraft.map((a) => a.id),
    weaponId,
    phase: 'INGRESS',
    phaseStartTime: Date.now(),
    elapsedMin: 0,
    etaMin: totalDistance / 8, // rough cruise in km/min
    target: mission.target,
    positions,
    origins: Object.fromEntries(aircraft.map((item) => [item.id, { ...item.position }])),
    decisions: template.decisions,
    pendingDecision: null,
    decisionsMade: [],
    outcome: 'PENDING',
    riskDelta: 0,
    narrative: [template.narrative],
  };
}

// Interpolate aircraft position along path from start to target
export function interpolatePosition(start: Position, end: Position, t: number): Position {
  return {
    lat: start.lat + (end.lat - start.lat) * t,
    lng: start.lng + (end.lng - start.lng) * t,
  };
}

// Phase-based progress fraction (0 = at base, 1 = at target). Egress reverses.
export function progressFraction(phase: MissionPhase, elapsedInPhase: number, phaseDurationMin: number): number {
  const p = Math.min(1, elapsedInPhase / phaseDurationMin);
  switch (phase) {
    case 'INGRESS': return p * 0.8;               // 0 → 0.8
    case 'WEZ':     return 0.8 + p * 0.15;         // 0.8 → 0.95
    case 'RELEASE': return 0.95 + p * 0.05;        // 0.95 → 1.0
    case 'EGRESS':  return 1.0 - p * 0.6;          // 1.0 → 0.4
    case 'RTB':     return 0.4 - p * 0.4;          // 0.4 → 0.0
    default:        return 0;
  }
}
