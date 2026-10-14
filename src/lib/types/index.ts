export type AircraftStatus = 'FMC' | 'PMC' | 'NMC';
export type MissionStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETE' | 'ABORTED';
export type ThreatType = 'SAM' | 'RADAR' | 'AIR' | 'EW';

export type TargetType =
  | 'aircraft' | 'hardened-bunker' | 'radar-site' | 'troop-concentration'
  | 'bridge' | 'c2-node' | 'ship' | 'runway' | 'fuel-depot';

export interface Position { lat: number; lng: number; }

export interface Aircraft {
  id: string;
  tailNumber: string;
  callsign?: string;
  type: string;
  base: string;
  status: AircraftStatus;
  fuel: number;
  weapons: string[];
  crewRest: number;
  position: Position;
  heading: number;
  speed: number;
}

export interface Mission {
  id: string;
  name: string;
  priority: 1 | 2 | 3;
  target: Position;
  targetType: TargetType;
  requiredWeapons: string[];
  assignedAircraft: string[];
  status: MissionStatus;
  riskLevel: number;
  feasible: boolean;
}

export interface Threat {
  id: string;
  type: ThreatType;
  position: Position;
  radius: number;
  probability: number;
  confidence: number;
}

export type AirspaceZoneType = 'corridor' | 'restricted' | 'kill-box' | 'altitude-block';
export type AirspaceStatus = 'OPEN' | 'CLOSED' | 'CONDITIONAL';

export interface AirspaceZone {
  id: string;
  name: string;
  type: AirspaceZoneType;
  polygon: Position[];
  altitudeBand: { min: number; max: number };
  status: AirspaceStatus;
  controllingAuthority: string;
}

export type WeatherType = 'front' | 'storm' | 'fog' | 'clear';

export interface WeatherSystem {
  id: string;
  type: WeatherType;
  polygon: Position[];
  severity: 1 | 2 | 3 | 4 | 5;
  visibility_km: number;
  ceiling_ft: number;
  windDir_deg: number;
  windSpeed_kt: number;
  validUntil: string;
}

export interface COA {
  id: string;
  rank: number;
  assignments: Record<string, string[]>;
  riskScore: number;
  successProbability: number;
  timeToEffect: number;
  explanation: string;
}

export interface SystemState {
  aircraft: Aircraft[];
  missions: Mission[];
  threats: Threat[];
  coas: COA[];
  timestamp: number;
}
