import type { LngLatBoundsLike } from 'maplibre-gl';

export const EXPERIENCE_BOUNDS: Record<string, LngLatBoundsLike> = {
  deep_strike: [[72, 30], [80, 36]],
  sead_campaign: [[73, 30], [78, 35]],
  air_superiority: [[68, 20], [78, 30]],
  kargil: [[75, 33], [78, 36]],
  surgical: [[73, 32], [76, 35]],
};

export const DEFAULT_EXPERIENCE_BOUNDS: LngLatBoundsLike = [[65, 20], [95, 40]];

export function experienceBounds(key: string | null | undefined): LngLatBoundsLike {
  if (!key) return DEFAULT_EXPERIENCE_BOUNDS;
  const normalized = key.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_');
  if (normalized === 'sead') return EXPERIENCE_BOUNDS.sead_campaign;
  return EXPERIENCE_BOUNDS[normalized] ?? DEFAULT_EXPERIENCE_BOUNDS;
}
