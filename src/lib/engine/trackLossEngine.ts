import type { Position } from '../types';

export type TrackLossHypothesis = 'CRASH' | 'ELECTRONIC_JAMMING' | 'STEALTH_MANEUVER' | 'TERRAIN_MASKING';

export interface TrackLossAnalysis {
  trackId: string;
  hypotheses: Record<TrackLossHypothesis, number>;
  topHypothesis: TrackLossHypothesis;
  confidence: number;
  context: string;
}

export function analyzeTrackLoss(
  trackId: string,
  lastPosition: Position,
  nearbyEnemyAssets: { type: string; position: Position }[],
  terrainElevation: number,
  recentCombat: boolean
): TrackLossAnalysis {
  const hypotheses: Record<TrackLossHypothesis, number> = {
    CRASH: 0.15,
    ELECTRONIC_JAMMING: 0.25,
    STEALTH_MANEUVER: 0.20,
    TERRAIN_MASKING: 0.40,
  };

  // Adjust probabilities based on context
  const nearbyEW = nearbyEnemyAssets.some(a => a.type === 'EW');
  const mountainous = terrainElevation > 2000;
  const stealthEnemy = nearbyEnemyAssets.some(a => a.type === 'STEALTH');

  if (nearbyEW) {
    hypotheses.ELECTRONIC_JAMMING += 0.25;
    hypotheses.TERRAIN_MASKING -= 0.10;
  }
  if (mountainous) {
    hypotheses.TERRAIN_MASKING += 0.30;
    hypotheses.ELECTRONIC_JAMMING -= 0.15;
  }
  if (recentCombat) {
    hypotheses.CRASH += 0.35;
    hypotheses.STEALTH_MANEUVER -= 0.10;
  }
  if (stealthEnemy) {
    hypotheses.STEALTH_MANEUVER += 0.25;
    hypotheses.CRASH -= 0.10;
  }

  // Normalize to sum to 1
  const total = Object.values(hypotheses).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(hypotheses) as TrackLossHypothesis[]) {
    hypotheses[key] /= total;
  }

  // Find top hypothesis
  const topHypothesis = (Object.entries(hypotheses).reduce((a, b) => 
    b[1] > a[1] ? b : a
  )[0]) as TrackLossHypothesis;
  const confidence = hypotheses[topHypothesis];

  const context = `Last known position: ${lastPosition.lat.toFixed(4)}N, ${lastPosition.lng.toFixed(4)}E. ` +
    `Nearby EW: ${nearbyEW}, Mountainous: ${mountainous}, Recent combat: ${recentCombat}, Stealth enemy: ${stealthEnemy}`;

  return {
    trackId,
    hypotheses,
    topHypothesis,
    confidence,
    context,
  };
}
