import type { Aircraft, Mission, COA, Threat, Position } from '../types';

// ============ GEOSPATIAL HELPERS ============
function haversine(a: Position, b: Position): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function inZone(p: Position, t: Threat): boolean {
  return haversine(p, t.position) <= t.radius;
}

function routeRisk(from: Position, to: Position, threats: Threat[]): number {
  let exposure = 0;
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p: Position = { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t };
    for (const th of threats) {
      if (inZone(p, th)) exposure += th.probability / 100;
    }
  }
  return Math.min(100, (exposure / N) * 60);
}

function canTask(ac: Aircraft): boolean {
  return ac.status !== 'NMC' && ac.fuel >= 30 && ac.crewRest >= 2;
}

// ============ MODE DEFINITIONS (strongly divergent) ============
type Mode = 'aggressive' | 'balanced' | 'conservative';

const MODES: Record<Mode, {
  distW: number; riskW: number; fuelW: number; crewW: number; weaponW: number;
  minCrew: number; minFuel: number; coverage: 1 | 2 | 3; // 1=all, 2=all but P3 single, 3=P1/P2 only
  label: string;
}> = {
  aggressive: {
    distW: 0.8, riskW: 0.10, fuelW: 0.05, crewW: 0.05, weaponW: 1.2,
    minCrew: 2, minFuel: 30, coverage: 1,
    label: 'AGGRESSIVE',
  },
  balanced: {
    distW: 0.4, riskW: 1.2, fuelW: 0.6, crewW: 0.7, weaponW: 0.9,
    minCrew: 4, minFuel: 40, coverage: 2,
    label: 'BALANCED',
  },
  conservative: {
    distW: 0.1, riskW: 3.5, fuelW: 1.5, crewW: 1.5, weaponW: 0.7,
    minCrew: 6, minFuel: 55, coverage: 3,
    label: 'CONSERVATIVE',
  },
};

// ============ SCORING ============
function scoreAircraft(ac: Aircraft, mission: Mission, threats: Threat[], mode: Mode): number {
  const cfg = MODES[mode];
  let score = 100;

  if (ac.status === 'PMC') score -= 25;

  const dist = haversine(ac.position, mission.target);
  score -= dist * 0.05 * cfg.distW;

  const risk = routeRisk(ac.position, mission.target, threats);
  score -= risk * cfg.riskW * 1.5;

  score -= (100 - ac.fuel) * 0.15 * cfg.fuelW;
  score -= Math.max(0, 20 - ac.crewRest) * 0.8 * cfg.crewW;

  const overlap = ac.weapons.filter((w) => mission.requiredWeapons.includes(w)).length;
  score += overlap * 15 * cfg.weaponW;

  return score;
}

// ============ BUILD ONE COA ============
function buildCOA(
  aircraft: Aircraft[],
  missions: Mission[],
  threats: Threat[],
  mode: Mode,
): COA {
  const cfg = MODES[mode];
  const assignments: Record<string, string[]> = {};
  const used = new Set<string>();

  const sortedMissions = [...missions].sort((a, b) => a.priority - b.priority);

  for (const m of sortedMissions) {
    // coverage filter
    if (cfg.coverage === 3 && m.priority === 3) { assignments[m.id] = []; continue; }

    const candidates = aircraft
      .filter((a) => !used.has(a.id) && canTask(a))
      .filter((a) => a.fuel >= cfg.minFuel)
      .filter((a) => a.crewRest >= cfg.minCrew)
      .map((a) => ({ ac: a, s: scoreAircraft(a, m, threats, mode) }))
      .sort((x, y) => y.s - x.s);

    // Aggressive: 2 aircraft per mission (max coverage)
    // Balanced: 2 for P1, 1 for P2/P3
    // Conservative: 1 per mission (min airframes exposed)
    let need = 1;
    if (mode === 'aggressive') need = 2;
    else if (mode === 'balanced') need = m.priority === 1 ? 2 : 1;

    // If conservative, block P3 entirely (do not waste resources)
    if (mode === 'conservative' && m.priority === 3) { assignments[m.id] = []; continue; }

    const chosen = candidates.slice(0, need).map((c) => c.ac.id);
    assignments[m.id] = chosen;
    chosen.forEach((id) => used.add(id));
  }

  // ============ METRICS ============
  let successSum = 0, riskSum = 0, weightSum = 0;
  let maxTime = 0, totalAssigned = 0;

  for (const m of missions) {
    const ids = assignments[m.id] || [];
    const w = 4 - m.priority;
    weightSum += w;

    if (ids.length === 0) {
      // Mission uncovered = 0 success for that slot
      successSum += 0;
      continue;
    }

    let missionRisk = 0, missionTime = 0;
    for (const id of ids) {
      const ac = aircraft.find((a) => a.id === id)!;
      missionRisk += routeRisk(ac.position, m.target, threats);
      const dist = haversine(ac.position, m.target);
      missionTime += (dist / (500 * 1.852)) * 60;
      totalAssigned++;
    }
    missionRisk /= ids.length;
    missionTime /= ids.length;

    riskSum += missionRisk * w;
    const coverageBonus = ids.length === 2 ? 12 : 0;
    const missSuccess = Math.max(0, 100 - missionRisk * 0.9 - m.riskLevel * 0.25 + coverageBonus);
    successSum += missSuccess * w;
    maxTime = Math.max(maxTime, missionTime);
  }

  const avgSuccess = weightSum > 0 ? successSum / weightSum : 0;
  const avgRisk = weightSum > 0 ? riskSum / weightSum : 0;

  const explanations: Record<Mode, string> = {
    aggressive: 'Maximum mission coverage. Assigns two airframes per mission for redundancy. Tolerates high threat exposure to reduce time-to-effect. Use when mission accomplishment outweighs asset preservation.',
    balanced: 'Pareto-optimal compromise. Dual-assigns priority-one missions, single-assigns others. Weighs success probability, exposure, fuel reserve and crew fatigue equally. Recommended default for sustained operations.',
    conservative: 'Airframe-preservation posture. Single-airframe tasking only. Defers low-priority missions (P3) to preserve resources. Prefers rested crews, full fuel, and low-exposure routes. Use in contested airspace with limited replacements.',
  };

  return {
    id: `coa-${mode}`,
    rank: 0,
    assignments,
    riskScore: Math.round(avgRisk),
    successProbability: Math.round(avgSuccess),
    timeToEffect: Math.round(maxTime),
    explanation: explanations[mode],
  };
}

// ============ PUBLIC API ============
export function generateCOAs(aircraft: Aircraft[], missions: Mission[], threats: Threat[]): COA[] {
  const coas: COA[] = [
    buildCOA(aircraft, missions, threats, 'aggressive'),
    buildCOA(aircraft, missions, threats, 'balanced'),
    buildCOA(aircraft, missions, threats, 'conservative'),
  ];

  // Rank by balanced score
  coas.sort((a, b) => {
    const sa = a.successProbability - a.riskScore * 0.7;
    const sb = b.successProbability - b.riskScore * 0.7;
    return sb - sa;
  });
  coas.forEach((c, i) => (c.rank = i + 1));

  return coas;
}

export function getModeLabel(coa: COA): string {
  const mode = coa.id.replace('coa-', '') as Mode;
  return MODES[mode]?.label ?? 'UNKNOWN';
}
