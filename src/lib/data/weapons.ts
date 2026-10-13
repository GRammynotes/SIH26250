export type WeaponDomain = 'air-air' | 'air-ground' | 'air-surface';
export type GuidanceType = 'active-radar' | 'IR' | 'INS-GPS' | 'INS-GPS-IIR' | 'anti-radiation' | 'dual-mode';
export type TargetType =
  | 'aircraft' | 'hardened-bunker' | 'radar-site' | 'troop-concentration'
  | 'bridge' | 'c2-node' | 'ship' | 'runway' | 'fuel-depot';

export interface Weapon {
  id: string;
  name: string;
  domain: WeaponDomain;
  guidance: GuidanceType;
  rangeKm: number;
  minRangeKm: number;
  speedMach: number;
  weightKg: number;
  warheadKg: number;
  cepMeters: number;
  targetTypes: TargetType[];
  platforms: string[];
  standoff: boolean;
  notes: string;
}

export const WEAPONS: Record<string, Weapon> = {
  'astra-mk1': {
    id: 'astra-mk1', name: 'Astra Mk1', domain: 'air-air', guidance: 'active-radar',
    rangeKm: 110, minRangeKm: 5, speedMach: 4.5, weightKg: 154, warheadKg: 15, cepMeters: 10,
    targetTypes: ['aircraft'], platforms: ['Su-30MKI', 'Tejas'], standoff: false,
    notes: 'Baseline in-service. Upgraded config reaches 160+ km.',
  },
  'astra-mk2': {
    id: 'astra-mk2', name: 'Astra Mk2', domain: 'air-air', guidance: 'active-radar',
    rangeKm: 160, minRangeKm: 5, speedMach: 4.5, weightKg: 180, warheadKg: 15, cepMeters: 8,
    targetTypes: ['aircraft'], platforms: ['Su-30MKI', 'Tejas'], standoff: false,
    notes: 'In development, ~2027. Dual-pulse motor.',
  },
  'r-77': {
    id: 'r-77', name: 'R-77', domain: 'air-air', guidance: 'active-radar',
    rangeKm: 110, minRangeKm: 5, speedMach: 4, weightKg: 175, warheadKg: 22, cepMeters: 12,
    targetTypes: ['aircraft'], platforms: ['Su-30MKI', 'MiG-29UPG'], standoff: false,
    notes: 'Legacy BVR. Being replaced by Astra.',
  },
  'r-73': {
    id: 'r-73', name: 'R-73', domain: 'air-air', guidance: 'IR',
    rangeKm: 30, minRangeKm: 1, speedMach: 2.5, weightKg: 105, warheadKg: 7.4, cepMeters: 5,
    targetTypes: ['aircraft'], platforms: ['Su-30MKI', 'MiG-29UPG'], standoff: false,
    notes: 'High off-boresight IR.',
  },
  'mica-rf': {
    id: 'mica-rf', name: 'MICA RF', domain: 'air-air', guidance: 'active-radar',
    rangeKm: 80, minRangeKm: 3, speedMach: 4.9, weightKg: 112, warheadKg: 12, cepMeters: 8,
    targetTypes: ['aircraft'], platforms: ['Rafale', 'Mirage-2000'], standoff: false,
    notes: 'Medium-range, fire-and-forget.',
  },
  'mica-ir': {
    id: 'mica-ir', name: 'MICA IR', domain: 'air-air', guidance: 'IR',
    rangeKm: 60, minRangeKm: 1, speedMach: 4.9, weightKg: 112, warheadKg: 12, cepMeters: 6,
    targetTypes: ['aircraft'], platforms: ['Rafale', 'Mirage-2000'], standoff: false,
    notes: 'Imaging IR seeker.',
  },
  'meteor': {
    id: 'meteor', name: 'Meteor', domain: 'air-air', guidance: 'active-radar',
    rangeKm: 200, minRangeKm: 10, speedMach: 4, weightKg: 190, warheadKg: 25, cepMeters: 6,
    targetTypes: ['aircraft'], platforms: ['Rafale'], standoff: false,
    notes: 'Ramjet. No-escape zone far exceeds conventional BVR.',
  },
  'brahmos-a': {
    id: 'brahmos-a', name: 'BrahMos-A', domain: 'air-surface', guidance: 'INS-GPS-IIR',
    rangeKm: 400, minRangeKm: 50, speedMach: 3, weightKg: 2500, warheadKg: 300, cepMeters: 5,
    targetTypes: ['hardened-bunker', 'c2-node', 'ship', 'runway', 'fuel-depot'],
    platforms: ['Su-30MKI'], standoff: true,
    notes: 'Supersonic. Requires specially modified Su-30MKI.',
  },
  'brahmos-ng': {
    id: 'brahmos-ng', name: 'BrahMos-NG', domain: 'air-surface', guidance: 'INS-GPS-IIR',
    rangeKm: 400, minRangeKm: 30, speedMach: 3, weightKg: 1200, warheadKg: 200, cepMeters: 4,
    targetTypes: ['hardened-bunker', 'c2-node', 'ship', 'runway', 'fuel-depot'],
    platforms: ['Su-30MKI', 'Tejas', 'Rafale'], standoff: true,
    notes: 'Lighter variant. In development. Four per Su-30MKI.',
  },
  'scalp': {
    id: 'scalp', name: 'SCALP / Storm Shadow', domain: 'air-ground', guidance: 'INS-GPS-IIR',
    rangeKm: 300, minRangeKm: 30, speedMach: 0.8, weightKg: 1300, warheadKg: 450, cepMeters: 3,
    targetTypes: ['hardened-bunker', 'c2-node', 'bridge', 'fuel-depot', 'runway'],
    platforms: ['Rafale'], standoff: true,
    notes: 'Deep-penetration. Used in Operation Sindoor (May 2025).',
  },
  'spice-2000': {
    id: 'spice-2000', name: 'Spice-2000', domain: 'air-ground', guidance: 'INS-GPS-IIR',
    rangeKm: 60, minRangeKm: 5, speedMach: 0.9, weightKg: 1000, warheadKg: 500, cepMeters: 3,
    targetTypes: ['hardened-bunker', 'c2-node', 'bridge'],
    platforms: ['Mirage-2000'], standoff: false,
    notes: 'Precision glide bomb. Used in Balakot (2019).',
  },
  'spice-1000': {
    id: 'spice-1000', name: 'Spice-1000', domain: 'air-ground', guidance: 'INS-GPS-IIR',
    rangeKm: 100, minRangeKm: 5, speedMach: 0.9, weightKg: 500, warheadKg: 250, cepMeters: 3,
    targetTypes: ['hardened-bunker', 'c2-node', 'bridge', 'fuel-depot'],
    platforms: ['Mirage-2000'], standoff: false,
    notes: 'Longer glide than Spice-2000.',
  },
  'rudram': {
    id: 'rudram', name: 'Rudram', domain: 'air-ground', guidance: 'anti-radiation',
    rangeKm: 150, minRangeKm: 20, speedMach: 2, weightKg: 600, warheadKg: 100, cepMeters: 10,
    targetTypes: ['radar-site'],
    platforms: ['Su-30MKI'], standoff: true,
    notes: 'Anti-radiation. Homes on enemy radar emissions.',
  },
  'hammer': {
    id: 'hammer', name: 'HAMMER', domain: 'air-ground', guidance: 'INS-GPS-IIR',
    rangeKm: 70, minRangeKm: 5, speedMach: 0.9, weightKg: 250, warheadKg: 125, cepMeters: 3,
    targetTypes: ['hardened-bunker', 'c2-node', 'bridge', 'fuel-depot', 'troop-concentration'],
    platforms: ['Rafale'], standoff: false,
    notes: 'All-weather. Anti-jam.',
  },
  'harpoon': {
    id: 'harpoon', name: 'Harpoon', domain: 'air-surface', guidance: 'active-radar',
    rangeKm: 124, minRangeKm: 5, speedMach: 0.85, weightKg: 540, warheadKg: 221, cepMeters: 5,
    targetTypes: ['ship'],
    platforms: ['Jaguar'], standoff: true,
    notes: 'Anti-ship missile.',
  },
};

export function weaponsForAircraft(aircraftType: string): Weapon[] {
  return Object.values(WEAPONS).filter((w) => w.platforms.includes(aircraftType));
}

export function weaponsForTarget(targetType: TargetType): Weapon[] {
  return Object.values(WEAPONS).filter((w) => w.targetTypes.includes(targetType));
}

export function canWeapon(aircraftType: string, weaponId: string, targetType: TargetType): boolean {
  const w = WEAPONS[weaponId];
  if (!w) return false;
  return w.platforms.includes(aircraftType) && w.targetTypes.includes(targetType);
}

export function optimalWeaponFor(aircraftType: string, targetType: TargetType): Weapon | null {
  const candidates = weaponsForAircraft(aircraftType).filter((w) => w.targetTypes.includes(targetType));
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => b.rangeKm - a.rangeKm)[0];
}

export function standoffWeapons(): Weapon[] {
  return Object.values(WEAPONS).filter((w) => w.standoff);
}

export function getTargetLabel(t: TargetType): string {
  const labels: Record<TargetType, string> = {
    aircraft: 'AIRCRAFT',
    'hardened-bunker': 'HARDENED BUNKER',
    'radar-site': 'RADAR SITE',
    'troop-concentration': 'TROOP CONCENTRATION',
    bridge: 'BRIDGE',
    'c2-node': 'C2 NODE',
    ship: 'SHIP',
    runway: 'RUNWAY',
    'fuel-depot': 'FUEL DEPOT',
  };
  return labels[t] ?? t.toUpperCase();
}
