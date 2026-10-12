export interface AircraftType {
  id: string;
  name: string;
  role: 'multirole' | 'interceptor' | 'strike' | 'recon';
  origin: string;
  maxSpeed: number;
  combatRadius: number;
  hardpoints: number;
  typicalWeapons: string[];
}

export const AIRCRAFT_TYPES: Record<string, AircraftType> = {
  'Su-30MKI': {
    id: 'su30mki', name: 'Su-30MKI', role: 'multirole', origin: 'Russia/India',
    maxSpeed: 1150, combatRadius: 1500, hardpoints: 12,
    typicalWeapons: ['R-77', 'R-73', 'Astra', 'BrahMos-A', 'KAB-1500'],
  },
  'Rafale': {
    id: 'rafale', name: 'Rafale', role: 'multirole', origin: 'France',
    maxSpeed: 1030, combatRadius: 1850, hardpoints: 14,
    typicalWeapons: ['Meteor', 'MICA', 'SCALP', 'Hammer', 'Exocet'],
  },
  'Tejas': {
    id: 'tejas', name: 'Tejas Mk1', role: 'multirole', origin: 'India',
    maxSpeed: 980, combatRadius: 500, hardpoints: 8,
    typicalWeapons: ['Astra', 'R-73', 'Derby', 'Python-5'],
  },
  'Jaguar': {
    id: 'jaguar', name: 'Jaguar', role: 'strike', origin: 'UK/India',
    maxSpeed: 917, combatRadius: 908, hardpoints: 7,
    typicalWeapons: ['Harpoon', 'Paveway-II', 'CBU-105'],
  },
  'Mirage-2000': {
    id: 'mirage2000', name: 'Mirage-2000', role: 'multirole', origin: 'France',
    maxSpeed: 1360, combatRadius: 1480, hardpoints: 9,
    typicalWeapons: ['MICA', 'R-73', 'Spice-2000', 'Crystal Maze'],
  },
  'MiG-29UPG': {
    id: 'mig29upg', name: 'MiG-29UPG', role: 'interceptor', origin: 'Russia',
    maxSpeed: 1290, combatRadius: 700, hardpoints: 7,
    typicalWeapons: ['R-77', 'R-73', 'Astra'],
  },
};
