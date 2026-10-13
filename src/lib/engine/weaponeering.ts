import { WEAPONS, optimalWeaponFor, type TargetType } from '../data/weapons';
import type { Aircraft, Threat, Position } from '../types';

function haversine(a: Position, b: Position): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export interface WeaponAssignment {
  aircraftId: string;
  tailNumber: string;
  aircraftType: string;
  weaponId: string;
  weaponName: string;
  launchRangeKm: number;
  distanceToTargetKm: number;
  inRange: boolean;
  standoffSafe: boolean;
  assessment: 'OPTIMAL' | 'FEASIBLE' | 'MARGINAL' | 'INFEASIBLE';
  reason: string;
}

export interface MissionFeasibility {
  missionId: string;
  targetType: TargetType;
  feasible: boolean;
  assignments: WeaponAssignment[];
  blockers: string[];
  notes: string[];
}

// ============ CORE ASSESSMENT ============

export function assessSingleAssignment(
  aircraft: Aircraft,
  targetPos: Position,
  targetType: TargetType,
  threats: Threat[],
): WeaponAssignment | null {
  const weapon = optimalWeaponFor(aircraft.type, targetType);
  if (!weapon) return null;

  const distance = haversine(aircraft.position, targetPos);
  const inRange = distance <= weapon.rangeKm && distance >= weapon.minRangeKm;

  // Check if any threat ring intersects the release point (the point at weapon.rangeKm from target along the line)
  const dx = targetPos.lat - aircraft.position.lat;
  const dy = targetPos.lng - aircraft.position.lng;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const releaseLat = targetPos.lat - (dx / len) * (weapon.rangeKm / 111);
  const releaseLng = targetPos.lng - (dy / len) * (weapon.rangeKm / 111);
  const releasePos: Position = { lat: releaseLat, lng: releaseLng };

  let insideThreat = false;
  for (const t of threats) {
    if (haversine(releasePos, t.position) <= t.radius) { insideThreat = true; break; }
  }

  const standoffSafe = weapon.standoff && !insideThreat;

  let assessment: WeaponAssignment['assessment'] = 'FEASIBLE';
  let reason = `${weapon.name} in range (${Math.round(distance)}/${weapon.rangeKm} km).`;

  if (!inRange) {
    assessment = 'INFEASIBLE';
    reason = distance > weapon.rangeKm
      ? `${weapon.name} range ${weapon.rangeKm} km insufficient (needs ${Math.round(distance)} km).`
      : `Inside minimum employment range (${weapon.minRangeKm} km).`;
  } else if (standoffSafe) {
    assessment = 'OPTIMAL';
    reason = `${weapon.name} can be released ${weapon.rangeKm} km from target, outside threat envelope.`;
  } else if (!weapon.standoff && !insideThreat) {
    assessment = 'FEASIBLE';
    reason = `${weapon.name} requires penetration to ${weapon.rangeKm} km, no threat intercept.`;
  } else if (weapon.standoff && insideThreat) {
    assessment = 'MARGINAL';
    reason = `${weapon.name} release point inside threat ring — aircrew exposed.`;
  } else {
    assessment = 'MARGINAL';
    reason = `${weapon.name} requires penetration into threat ring.`;
  }

  return {
    aircraftId: aircraft.id,
    tailNumber: aircraft.tailNumber,
    aircraftType: aircraft.type,
    weaponId: weapon.id,
    weaponName: weapon.name,
    launchRangeKm: weapon.rangeKm,
    distanceToTargetKm: Math.round(distance),
    inRange,
    standoffSafe,
    assessment,
    reason,
  };
}

export function assessMissionFeasibility(
  aircraft: Aircraft[],
  mission: { id: string; target: Position; targetType?: TargetType },
  threats: Threat[],
): MissionFeasibility {
  const targetType = mission.targetType ?? 'hardened-bunker';
  const assignments: WeaponAssignment[] = [];
  const blockers: string[] = [];

  const eligible = aircraft.filter((a) => a.status !== 'NMC');

  for (const ac of eligible) {
    const a = assessSingleAssignment(ac, mission.target, targetType, threats);
    if (a) assignments.push(a);
  }

  const feasible = assignments.some((a) => a.assessment === 'OPTIMAL' || a.assessment === 'FEASIBLE');

  if (assignments.length === 0) {
    blockers.push(`No platform in current fleet carries a weapon matching ${targetType}.`);
  } else if (!feasible) {
    blockers.push('All candidate platforms lack range or standoff clearance.');
  }

  const notes: string[] = [];
  const infeasibleAircraft = eligible.filter((a) => !assignments.some((x) => x.aircraftId === a.id));
  if (infeasibleAircraft.length > 0) {
    notes.push(`${infeasibleAircraft.length} aircraft have no matching weapon for this target type.`);
  }
  const optimal = assignments.filter((a) => a.assessment === 'OPTIMAL');
  if (optimal.length > 0) {
    notes.push(`${optimal.length} platform(s) can engage from standoff.`);
  }

  return { missionId: mission.id, targetType, feasible, assignments, blockers, notes };
}

// ============ BEST PLATFORM / WEAPON PAIRING ============

export function bestPlatformFor(
  targetType: TargetType,
  targetPos: Position,
  aircraft: Aircraft[],
  threats: Threat[],
): WeaponAssignment | null {
  const candidates: WeaponAssignment[] = [];
  for (const ac of aircraft) {
    if (ac.status === 'NMC') continue;
    const a = assessSingleAssignment(ac, targetPos, targetType, threats);
    if (a && (a.assessment === 'OPTIMAL' || a.assessment === 'FEASIBLE')) candidates.push(a);
  }
  if (candidates.length === 0) return null;
  const rank: Record<string, number> = { OPTIMAL: 0, FEASIBLE: 1, MARGINAL: 2, INFEASIBLE: 3 };
  candidates.sort((a, b) => {
    const r = rank[a.assessment] - rank[b.assessment];
    if (r !== 0) return r;
    return a.distanceToTargetKm - b.distanceToTargetKm;
  });
  return candidates[0];
}

// ============ WEZ VISUALIZATION DATA ============

export interface WEZRing {
  weaponName: string;
  rangeKm: number;
  color: string;
  type: 'optimal' | 'feasible' | 'excluded';
}

export function wezRingsForAircraft(aircraft: Aircraft, targetType: TargetType): WEZRing[] {
  const weapons = Object.values(WEAPONS).filter((w) => w.platforms.includes(aircraft.type));
  return weapons
    .filter((w) => w.targetTypes.includes(targetType))
    .sort((a, b) => a.rangeKm - b.rangeKm)
    .map((w) => ({
      weaponName: w.name,
      rangeKm: w.rangeKm,
      color: w.standoff ? '#39ff14' : '#ffb800',
      type: w.standoff ? 'optimal' : 'feasible',
    }));
}

