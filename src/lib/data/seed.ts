import { AIRCRAFT_TYPES } from './aircraft';
import { IAF_BASES } from './bases';
import type { Aircraft, Mission, Threat, Position, AircraftStatus, ThreatType, TargetType, SystemState } from '../types';

type Rand = () => number;

function mulberry32(seed: number): Rand {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rand: Rand, arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (rand: Rand, min: number, max: number) => min + rand() * (max - min);

function generateAircraft(rand: Rand): Aircraft[] {
  const out: Aircraft[] = [];
  const squadrons = [
    { baseId: 'ambala', type: 'Su-30MKI', count: 18, tailPrefix: 'SB', firstTail: 301, callsign: 'Tiger' },
    { baseId: 'hasimara', type: 'Rafale', count: 8, tailPrefix: 'RB', firstTail: 201, callsign: 'Falcon' },
    { baseId: 'jodhpur', type: 'MiG-29UPG', count: 8, tailPrefix: 'JI', firstTail: 501, callsign: 'Warrior' },
    { baseId: 'leh', type: 'Rafale', count: 6, tailPrefix: 'RC', firstTail: 301, callsign: 'Sky Guardian' },
    { baseId: 'sulur', type: 'Tejas', count: 12, tailPrefix: 'TE', firstTail: 101, callsign: 'Garuda' },
  ] as const;
  let n = 1;
  for (const squadron of squadrons) {
    const base = IAF_BASES.find((item) => item.id === squadron.baseId)!;
    for (let i = 0; i < squadron.count; i++) {
      const type = squadron.type;
      const roll = rand();
      const status: AircraftStatus = roll < 0.7 ? 'FMC' : roll < 0.9 ? 'PMC' : 'NMC';
      out.push({
        id: `ac-${String(n).padStart(3, '0')}`,
        tailNumber: `${squadron.tailPrefix}-${squadron.firstTail + i}`,
        callsign: `${squadron.callsign}-${String(i + 1).padStart(2, '0')}`,
        type,
        base: base.id,
        status,
        fuel: Math.round(between(rand, 40, 100)),
        weapons: AIRCRAFT_TYPES[type].typicalWeapons.slice(0, 2 + Math.floor(rand() * 2)),
        crewRest: Math.round(between(rand, 4, 20)),
        position: { lat: base.lat + between(rand, -0.05, 0.05), lng: base.lng + between(rand, -0.05, 0.05) },
        heading: Math.round(between(rand, 0, 359)),
        speed: 0,
      });
      n++;
    }
  }
  return out;
}

interface MissionSpec {
  name: string;
  target: Position;
  targetType: TargetType;
  priority: 1 | 2 | 3;
}

const MISSION_SPECS: MissionSpec[] = [
  { name: 'SWIFT STRIKE',  target: { lat: 34.1520, lng: 77.5770 }, targetType: 'hardened-bunker',     priority: 1 },
  { name: 'IRON VEIL',     target: { lat: 34.0800, lng: 78.1200 }, targetType: 'radar-site',          priority: 1 },
  { name: 'SILENT HAWK',   target: { lat: 33.9500, lng: 78.6500 }, targetType: 'c2-node',             priority: 2 },
  { name: 'DESERT FALCON', target: { lat: 34.3000, lng: 76.9000 }, targetType: 'bridge',              priority: 2 },
  { name: 'MOUNTAIN GUARD',target: { lat: 33.8000, lng: 79.1000 }, targetType: 'troop-concentration', priority: 3 },
  { name: 'NIGHT LANCE',   target: { lat: 34.5000, lng: 78.2000 }, targetType: 'fuel-depot',          priority: 3 },
];

function generateMissions(rand: Rand): Mission[] {
  return MISSION_SPECS.map((spec, i) => ({
    id: `ms-${String(i + 1).padStart(3, '0')}`,
    name: spec.name,
    priority: spec.priority,
    target: spec.target,
    targetType: spec.targetType,
    requiredWeapons: [pick(rand, ['Meteor', 'Astra', 'R-77']), pick(rand, ['SCALP', 'BrahMos-A', 'Spice-2000'])],
    assignedAircraft: [],
    status: 'PLANNED',
    riskLevel: Math.round(between(rand, 20, 80)),
    feasible: spec.name !== 'IRON VEIL',
  }));
}

function generateThreats(rand: Rand): Threat[] {
  const types: ThreatType[] = ['SAM', 'RADAR', 'AIR', 'EW'];
  const out: Threat[] = [];
  for (let i = 0; i < 8; i++) {
    const t = pick(rand, types);
    out.push({
      id: `th-${String(i + 1).padStart(3, '0')}`,
      type: t,
      position: { lat: 33.8 + rand() * 0.9, lng: 76.8 + rand() * 2.4 },
      radius: t === 'SAM' ? 40 : t === 'RADAR' ? 120 : t === 'AIR' ? 60 : 80,
      probability: Math.round(between(rand, 30, 95)),
      confidence: Math.round(between(rand, 50, 95)),
    });
  }
  return out;
}

export function generateSystemState(): SystemState {
  const rand = mulberry32(2026);
  return {
    aircraft: generateAircraft(rand),
    missions: generateMissions(rand),
    threats: generateThreats(rand),
    coas: [],
    timestamp: Date.now(),
  };
}
