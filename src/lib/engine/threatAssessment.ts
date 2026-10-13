import type { Position } from '../types';
import type { EnemyAsset } from '../data/enemyAssets';

export type EnemyIntent = 'defensive' | 'probing' | 'aggressive';
export interface SensorObservation { assetId: string; emissionState?: EnemyAsset['emissionState']; behaviour?: EnemyAsset['behaviour']; confidence?: number; }
export interface ThreatBelief { intent: Record<EnemyIntent, number>; capability: number; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; }

const baseline: Record<EnemyIntent, number> = { defensive: 0.45, probing: 0.35, aggressive: 0.2 };

export function updateThreatBelief(observation: SensorObservation, asset?: EnemyAsset): ThreatBelief {
  const intent = { ...baseline };
  const emission = observation.emissionState ?? asset?.emissionState;
  const behaviour = observation.behaviour ?? asset?.behaviour;
  if (emission === 'active') { intent.aggressive += 0.16; intent.defensive -= 0.08; }
  if (emission === 'intermittent') { intent.probing += 0.14; intent.defensive -= 0.05; }
  if (behaviour === 'aggressive') intent.aggressive += 0.12;
  if (behaviour === 'shoot-and-scoot') intent.probing += 0.08;
  const sum = Object.values(intent).reduce((a, b) => a + b, 0);
  (Object.keys(intent) as EnemyIntent[]).forEach((key) => intent[key] = Math.max(0.01, intent[key] / sum));
  const capability = Math.round(((asset?.probabilityKill ?? 0.35) * 70 + (emission === 'active' ? 25 : 10)) * 100) / 100;
  const observationConfidence = observation.confidence ?? 0.65;
  return { intent, capability, confidence: observationConfidence >= 0.8 ? 'HIGH' : observationConfidence >= 0.55 ? 'MEDIUM' : 'LOW' };
}

function distance(a: Position, b: Position): number {
  const lat = 111; const lng = 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot((a.lat - b.lat) * lat, (a.lng - b.lng) * lng);
}

export function assessThreatToRoute(route: Position[], assets: EnemyAsset[]) {
  let engagement = 0;
  for (const asset of assets) for (const point of route) {
    if (asset.engagementRange_km && distance(point, asset.position) <= asset.engagementRange_km) engagement += asset.probabilityKill / route.length;
  }
  const probability = Math.min(0.95, engagement);
  return { probability, confidence: probability > 0.55 ? 'HIGH' : probability > 0.25 ? 'MEDIUM' : 'LOW' } as const;
}
