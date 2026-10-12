import { AIRCRAFT_TYPES } from './aircraft';
import { IAF_BASES } from './bases';
import type { Aircraft, Mission, Threat, Position, AircraftStatus, ThreatType, SystemState } from '../types';

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(2026);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const between = (min: number, max: number) => min + rand() * (max - min);

export function generateAircraft(): Aircraft[] {
  const out: Aircraft[] = [];
  let n = 1;
  for (const base of IAF_BASES) {
    const count = 1 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
      const type = base.primaryAircraft[0];
      const roll = rand();
      const status: AircraftStatus = roll < 0.7 ? 'FMC' : roll < 0.9 ? 'PMC' : 'NMC';
      out.push({
        id: `ac-${String(n).padStart(3, '0')}`,
        tailNumber: `${base.code}-${String(100 + n)}`,
        type,
        base: base.id,
        status,
        fuel: Math.round(between(40, 100)),
        weapons: AIRCRAFT_TYPES[type].typicalWeapons.slice(0, 2 + Math.floor(rand() * 2)),
        crewRest: Math.round(between(4, 20)),
        position: { lat: base.lat + between(-0.05, 0.05), lng: base.lng + between(-0.05, 0.05) },
        heading: Math.round(between(0, 359)),
        speed: 0,
      });
      n++;
    }
  }
  return out;
}

export function generateMissions(): Mission[] {
  const targets: Position[] = [
    { lat: 34.1520, lng: 77.5770 },
    { lat: 34.0800, lng: 78.1200 },
    { lat: 33.9500, lng: 78.6500 },
    { lat: 34.3000, lng: 76.9000 },
    { lat: 33.8000, lng: 79.1000 },
    { lat: 34.5000, lng: 78.2000 },
  ];
  const names = ['SWIFT STRIKE', 'IRON VEIL', 'SILENT HAWK', 'DESERT FALCON', 'MOUNTAIN GUARD', 'NIGHT LANCE'];
  return targets.map((t, i) => ({
    id: `ms-${String(i + 1).padStart(3, '0')}`,
    name: names[i],
    priority: (i < 2 ? 1 : i < 4 ? 2 : 3) as 1 | 2 | 3,
    target: t,
    requiredWeapons: [pick(['Meteor', 'Astra', 'R-77']), pick(['SCALP', 'BrahMos-A', 'Spice-2000'])],
    assignedAircraft: [],
    status: 'PLANNED',
    riskLevel: Math.round(between(20, 80)),
  }));
}

export function generateThreats(): Threat[] {
  const types: ThreatType[] = ['SAM', 'RADAR', 'AIR', 'EW'];
  const out: Threat[] = [];
  for (let i = 0; i < 8; i++) {
    const t = pick(types);
    out.push({
      id: `th-${String(i + 1).padStart(3, '0')}`,
      type: t,
      position: { lat: 33.8 + rand() * 0.9, lng: 76.8 + rand() * 2.4 },
      radius: t === 'SAM' ? 40 : t === 'RADAR' ? 120 : t === 'AIR' ? 60 : 80,
      probability: Math.round(between(30, 95)),
      confidence: Math.round(between(50, 95)),
    });
  }
  return out;
}

export function generateSystemState(): SystemState {
  return {
    aircraft: generateAircraft(),
    missions: generateMissions(),
    threats: generateThreats(),
    coas: [],
    timestamp: Date.now(),
  };
}
