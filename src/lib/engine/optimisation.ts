import type { Aircraft, Mission, COA, Threat, Position } from '../types';
import { optimalWeaponFor, WEAPONS } from '../data/weapons';
import type { AirspaceZone, WeatherSystem } from '../types';

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
    for (const th of threats) if (inZone(p, th)) exposure += th.probability / 100;
  }
  return Math.min(100, (exposure / N) * 60);
}

function canTask(ac: Aircraft): boolean {
  return ac.status !== 'NMC' && ac.fuel >= 30 && ac.crewRest >= 2;
}

function pointInPolygon(point: Position, polygon: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    const crosses = ((a.lng > point.lng) !== (b.lng > point.lng))
      && point.lat < ((b.lat - a.lat) * (point.lng - a.lng)) / (b.lng - a.lng) + a.lat;
    if (crosses) inside = !inside;
  }
  return inside;
}

function routeBlocked(from: Position, to: Position, zones: AirspaceZone[]): AirspaceZone | null {
  const closed = zones.filter((zone) => zone.status === 'CLOSED');
  for (let step = 0; step <= 32; step++) {
    const fraction = step / 32;
    const point = { lat: from.lat + (to.lat - from.lat) * fraction, lng: from.lng + (to.lng - from.lng) * fraction };
    const blocker = closed.find((zone) => pointInPolygon(point, zone.polygon));
    if (blocker) return blocker;
  }
  return null;
}

function weatherRestriction(ac: Aircraft, mission: Mission, systems: WeatherSystem[]): string | null {
  const limits: Record<string, number> = { 'Su-30MKI': 45, Rafale: 50, 'Mirage-2000': 38, Tejas: 32, Jaguar: 35, 'MiG-29UPG': 40 };
  for (const weather of systems) {
    const intersects = routeBlocked(ac.position, mission.target, [{ id: weather.id, name: weather.id, polygon: weather.polygon, status: 'CLOSED', type: 'restricted', altitudeBand: { min: 0, max: 0 }, controllingAuthority: 'WEATHER' }]);
    if (intersects && weather.windSpeed_kt > (limits[ac.type] ?? 35)) return `${weather.id.toUpperCase()} WIND ${weather.windSpeed_kt}KT`;
  }
  return null;
}

// Critical: an aircraft is only a candidate if it carries a weapon that can kill the target type.
function hasCompatibleWeapon(ac: Aircraft, mission: Mission): boolean {
  const weapon = optimalWeaponFor(ac.type, mission.targetType);
  if (!weapon) return false;
  return haversine(ac.position, mission.target) <= weapon.rangeKm;
}

type Mode = 'aggressive' | 'balanced' | 'conservative';

const MODES: Record<Mode, {
  distW: number; riskW: number; fuelW: number; crewW: number; weaponW: number;
  minCrew: number; minFuel: number; coverage: 1 | 2 | 3;
  label: string;
}> = {
  aggressive:   { distW: 0.8, riskW: 0.10, fuelW: 0.05, crewW: 0.05, weaponW: 1.2, minCrew: 2, minFuel: 30, coverage: 1, label: 'AGGRESSIVE' },
  balanced:     { distW: 0.4, riskW: 1.2,  fuelW: 0.6,  crewW: 0.7,  weaponW: 0.9, minCrew: 4, minFuel: 40, coverage: 2, label: 'BALANCED' },
  conservative: { distW: 0.1, riskW: 3.5,  fuelW: 1.5,  crewW: 1.5,  weaponW: 0.7, minCrew: 6, minFuel: 55, coverage: 3, label: 'CONSERVATIVE' },
};

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

  const weapon = optimalWeaponFor(ac.type, mission.targetType);
  if (weapon) {
    score += 30 * cfg.weaponW;
    if (weapon.standoff) score += 15 * cfg.weaponW;
    const inRange = dist <= weapon.rangeKm;
    score += inRange ? 20 : -80;
  }
  return score;
}

function buildCOA(aircraft: Aircraft[], missions: Mission[], threats: Threat[], mode: Mode, airspace: AirspaceZone[], weather: WeatherSystem[]): COA {
  const cfg = MODES[mode];
  const assignments: Record<string, string[]> = {};
  const used = new Set<string>();
  const blockers: string[] = [];

  const sortedMissions = [...missions].sort((a, b) => a.priority - b.priority);

  for (const m of sortedMissions) {
    if (cfg.coverage === 3 && m.priority === 3) { assignments[m.id] = []; continue; }
    if (mode === 'conservative' && m.priority === 3) { assignments[m.id] = []; continue; }

    const candidates = aircraft
      .filter((a) => !used.has(a.id) && canTask(a) && hasCompatibleWeapon(a, m))
      .filter((a) => !routeBlocked(a.position, m.target, airspace))
      .filter((a) => !weatherRestriction(a, m, weather))
      .filter((a) => a.fuel >= cfg.minFuel)
      .filter((a) => a.crewRest >= cfg.minCrew)
      .map((a) => ({ ac: a, s: scoreAircraft(a, m, threats, mode) }))
      .sort((x, y) => y.s - x.s);

    if (candidates.length === 0) {
      const closed = aircraft.map((a) => routeBlocked(a.position, m.target, airspace)).find(Boolean);
      const weatherBlocked = aircraft.map((a) => weatherRestriction(a, m, weather)).find(Boolean);
      const reason = closed ? `ROUTE BLOCKED · ${closed.name}` : weatherBlocked ? `WEATHER RESTRICTED · ${weatherBlocked}` : `no aircraft with compatible weapon (needs ${m.targetType})`;
      blockers.push(`${m.name}: ${reason}.`);
    }

    let need = 1;
    if (mode === 'aggressive') need = 2;
    else if (mode === 'balanced') need = m.priority === 1 ? 2 : 1;

    // Keep this validation at the allocation boundary as a defensive guard:
    // no out-of-range platform may reach a COA even if candidate construction changes.
    const chosen = candidates
      .slice(0, need)
      .map((c) => c.ac)
      .filter((ac) => {
        const weapon = optimalWeaponFor(ac.type, m.targetType);
        const distance = haversine(ac.position, m.target);
        const valid = Boolean(weapon && distance <= weapon.rangeKm);
        if (!valid) {
          console.warn(
            `[OPTIMISER] Removed ${ac.tailNumber} from ${m.name}: ${Math.round(distance)} km exceeds ${weapon?.rangeKm ?? 0} km weapon range.`,
          );
        }
        return valid;
      })
      .map((ac) => ac.id);
    assignments[m.id] = chosen;
    chosen.forEach((id) => used.add(id));
  }

  let successSum = 0, riskSum = 0, weightSum = 0, maxTime = 0;
  for (const m of missions) {
    const ids = assignments[m.id] || [];
    const w = 4 - m.priority;
    weightSum += w;
    if (ids.length === 0) { continue; }

    let missionRisk = 0, missionTime = 0;
    for (const id of ids) {
      const ac = aircraft.find((a) => a.id === id)!;
      missionRisk += routeRisk(ac.position, m.target, threats);
      const dist = haversine(ac.position, m.target);
      missionTime += (dist / (500 * 1.852)) * 60;
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
    aggressive: 'Maximum mission coverage. Two airframes per tasking where compatible. Accepts high exposure to compress time-to-effect. Weaponeering-driven: aircraft lacking a compatible weapon are excluded.',
    balanced: 'Pareto-optimal compromise. Dual-tasks P1, single-tasks others. Weighs success, exposure, fuel reserve and crew fatigue equally. Only weapon-compatible platforms considered.',
    conservative: 'Airframe-preservation posture. Single-task P1/P2, defers P3. Prefers rested crews, full fuel, and low-exposure routes. Strictest weapon-compatibility filter.',
  };

  let expl = explanations[mode];
  if (blockers.length > 0) expl += ` BLOCKERS: ${blockers.slice(0, 2).join(' ')}`;

  return {
    id: `coa-${mode}`,
    rank: 0,
    assignments,
    riskScore: Math.round(avgRisk),
    successProbability: Math.round(avgSuccess),
    timeToEffect: Math.round(maxTime),
    explanation: expl,
  };
}

export function generateCOAs(aircraft: Aircraft[], missions: Mission[], threats: Threat[], airspace: AirspaceZone[] = [], weather: WeatherSystem[] = []): COA[] {
  const coas: COA[] = [
    buildCOA(aircraft, missions, threats, 'aggressive', airspace, weather),
    buildCOA(aircraft, missions, threats, 'balanced', airspace, weather),
    buildCOA(aircraft, missions, threats, 'conservative', airspace, weather),
  ];
  coas.sort((a, b) => (b.successProbability - b.riskScore * 0.7) - (a.successProbability - a.riskScore * 0.7));
  coas.forEach((c, i) => (c.rank = i + 1));
  return coas;
}

export function getModeLabel(coa: COA): string {
  const mode = coa.id.replace('coa-', '') as Mode;
  return MODES[mode]?.label ?? 'UNKNOWN';
}

// Export helper for UI display
export { hasCompatibleWeapon, WEAPONS };
