import type { COA } from '../types';
import type { EnemyAsset } from '../data/enemyAssets';

export interface EnemyResponse { action: string; rationale: string; expectedDamage: number; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; }

export function bestResponseToCOA(coa: COA, assets: EnemyAsset[]): EnemyResponse {
  const active = assets.filter((asset) => asset.emissionState !== 'silent');
  const aggressive = active.filter((asset) => asset.behaviour === 'aggressive').length;
  const mobile = active.filter((asset) => asset.behaviour === 'shoot-and-scoot').length;
  const expectedDamage = Math.min(95, Math.round(coa.riskScore * 0.55 + aggressive * 8 + mobile * 5));
  const action = coa.id === 'coa-aggressive' ? 'SURGE CAP + ILLUMINATE SAMS' : coa.id === 'coa-balanced' ? 'DISPLACE EMITTERS + AMBUSH' : 'LAYERED AIR DEFENCE POSTURE';
  return { action, rationale: `${active.length} emitting assets detected; RED maximises attrition against the selected ${coa.id.replace('coa-', '').toUpperCase()} posture.`, expectedDamage, confidence: active.length >= 5 ? 'HIGH' : active.length >= 3 ? 'MEDIUM' : 'LOW' };
}

export function expectedPayoff(coa: COA, response: EnemyResponse): number {
  return Math.round(coa.successProbability - coa.riskScore * 0.35 - response.expectedDamage * 0.45);
}
