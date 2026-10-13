export interface GroundAsset {
  id: string;
  designation: string;
  type: 'tank' | 'uav' | 'sam' | 'radar' | 'bmp';
  position: { lat: number; lng: number };
  base: string;
  status: 'ACTIVE' | 'STANDBY' | 'OFFLINE';
  specs: string;
  armament: string;
  range_km: number;
}

export const GROUND_ASSETS: GroundAsset[] = [
  // Tanks at forward positions
  {
    id: 't90-01',
    designation: 'T-90 BHISHMA',
    type: 'tank',
    position: { lat: 34.15, lng: 77.57 },
    base: 'leh',
    status: 'ACTIVE',
    specs: '46.5t · 125mm · Hunter-Killer',
    armament: 'APFSDS, HEAT, LASER-GUIDED',
    range_km: 5,
  },
  {
    id: 't90-02',
    designation: 'T-90 BHISHMA',
    type: 'tank',
    position: { lat: 34.08, lng: 78.12 },
    base: 'tezpur',
    status: 'STANDBY',
    specs: '46.5t · 125mm · ERA',
    armament: 'APFSDS, HEAT, LASER-GUIDED',
    range_km: 5,
  },
  {
    id: 'arjun-01',
    designation: 'ARJUN MK I',
    type: 'tank',
    position: { lat: 30.38, lng: 76.82 },
    base: 'ambala',
    status: 'ACTIVE',
    specs: '58.5t · 120mm · Kanchan',
    armament: 'APFSDS, HESH, NBC',
    range_km: 4,
  },
  // UAVs on station
  {
    id: 'tapas-01',
    designation: 'TAPAS-BH-201',
    type: 'uav',
    position: { lat: 34.5, lng: 78.2 },
    base: 'leh',
    status: 'ACTIVE',
    specs: '350kg · 18h · 30,000ft',
    armament: 'ISR · SAR · EO/IR',
    range_km: 250,
  },
  {
    id: 'heron-01',
    designation: 'HERON TP',
    type: 'uav',
    position: { lat: 33.8, lng: 79.1 },
    base: 'tezpur',
    status: 'ACTIVE',
    specs: '1,000kg · 40h · 45,000ft',
    armament: 'ISR · SIGINT · ARMED',
    range_km: 400,
  },
  // SAM batteries
  {
    id: 'akash-01',
    designation: 'AKASH BATTERY',
    type: 'sam',
    position: { lat: 30.0, lng: 77.0 },
    base: 'ambala',
    status: 'ACTIVE',
    specs: '25-45km · 4 targets/bty',
    armament: 'COMMAND GUIDED SAM',
    range_km: 45,
  },
];
