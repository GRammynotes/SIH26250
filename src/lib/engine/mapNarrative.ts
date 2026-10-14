export type MapFocusElement = { type: 'aircraft' | 'target' | 'weapon'; id: string; label?: string };

export function distanceKm(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)));
}

/** Ask the tactical map to briefly ring the map-addressable narration entities. */
export function focusMapElements(focus: MapFocusElement[]) {
  window.dispatchEvent(new CustomEvent<MapFocusElement[]>('aircommand:map-focus-elements', { detail: focus }));
}
