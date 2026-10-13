import type { AirspaceZone } from '../types';

export const AIRSPACE_ZONES: AirspaceZone[] = [
  {
    id: 'punjab-corridor-alpha', name: 'PUNJAB CORRIDOR ALPHA', type: 'corridor', status: 'OPEN',
    polygon: [{ lat: 31.2, lng: 73.6 }, { lat: 31.75, lng: 74.0 }, { lat: 32.4, lng: 75.5 }, { lat: 31.95, lng: 75.9 }, { lat: 31.35, lng: 74.5 }],
    altitudeBand: { min: 5000, max: 25000 }, controllingAuthority: 'WESTERN AIR COMMAND',
  },
  {
    id: 'kashmir-corridor-bravo', name: 'KASHMIR CORRIDOR BRAVO', type: 'corridor', status: 'OPEN',
    polygon: [{ lat: 33.4, lng: 75.2 }, { lat: 33.85, lng: 76.1 }, { lat: 34.35, lng: 77.0 }, { lat: 34.0, lng: 77.35 }, { lat: 33.45, lng: 76.45 }],
    altitudeBand: { min: 12000, max: 32000 }, controllingAuthority: 'NORTHERN AIR COMMAND',
  },
  {
    id: 'srinagar-restricted', name: 'SRINAGAR PROTECTED AIRSPACE', type: 'restricted', status: 'CLOSED',
    polygon: [{ lat: 33.95, lng: 74.68 }, { lat: 34.18, lng: 74.68 }, { lat: 34.18, lng: 75.08 }, { lat: 33.95, lng: 75.08 }],
    altitudeBand: { min: 0, max: 45000 }, controllingAuthority: 'CIVIL-MIL COORDINATION CELL',
  },
  {
    id: 'loc-killbox-echo', name: 'KILL BOX ECHO', type: 'kill-box', status: 'CONDITIONAL',
    polygon: [{ lat: 33.68, lng: 76.85 }, { lat: 34.15, lng: 76.85 }, { lat: 34.15, lng: 77.45 }, { lat: 33.68, lng: 77.45 }],
    altitudeBand: { min: 18000, max: 36000 }, controllingAuthority: 'IACCS NORTH',
  },
  {
    id: 'ladakh-altitude-block', name: 'LADAKH ALTITUDE BLOCK', type: 'altitude-block', status: 'CONDITIONAL',
    polygon: [{ lat: 34.15, lng: 77.25 }, { lat: 34.78, lng: 77.25 }, { lat: 34.78, lng: 78.55 }, { lat: 34.15, lng: 78.55 }],
    altitudeBand: { min: 26000, max: 42000 }, controllingAuthority: 'NORTHERN AIR COMMAND',
  },
];

export const freshAirspace = () => AIRSPACE_ZONES.map((zone) => ({ ...zone, polygon: zone.polygon.map((point) => ({ ...point })) }));
