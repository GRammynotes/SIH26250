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
}

export interface Threat {
  id: string;
  type: ThreatType;
  position: Position;
  radius: number;
  probability: number;
  confidence: number;
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
