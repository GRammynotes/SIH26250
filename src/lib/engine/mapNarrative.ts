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

import { system } from '../stores/systemStore.svelte';

export interface NarrativeMarker { kind: string; label: string; id: string; lat: number; lng: number }

export function parseMapNarrative(text: string): { text: string; markers: NarrativeMarker[] } {
  const markers: NarrativeMarker[] = [];
  const clean = text.replace(/@target:([^,.;]+)|@(aircraft|threat|weapon):([^\s,.;]+)/gi, (_match, targetValue: string | undefined, rawKind: string | undefined, rawValue: string | undefined) => {
    const kind = targetValue !== undefined ? 'target' : (rawKind ?? '').toLowerCase(); const id = (targetValue ?? rawValue ?? '').trim().replaceAll('_', ' ');
    let position: { lat: number; lng: number } | undefined;
    let label = id;
    if (kind === 'aircraft') {
      const item = system.aircraft.find((aircraft) => aircraft.tailNumber.toLowerCase() === id.toLowerCase() || aircraft.id.toLowerCase() === id.toLowerCase());
      if (item) { position = item.position; label = item.tailNumber; }
    } else if (kind === 'threat') {
      const item = system.threats.find((threat) => threat.id.toLowerCase() === id.toLowerCase());
      if (item) position = item.position;
    } else if (kind === 'target') {
      const item = system.missions.find((mission) => mission.name.toLowerCase() === id.toLowerCase() || mission.name.toLowerCase().includes(id.toLowerCase()));
      if (item) { position = item.target; label = item.name; }
    } else if (kind === 'weapon') {
      const weapon = id;
      const mission = system.activeMissions.find((active) => active.weaponId?.toLowerCase() === weapon.toLowerCase());
      const targetMission = mission && system.missions.find((candidate) => candidate.id === mission.missionId);
      if (targetMission) position = targetMission.target;
    }
    if (position) markers.push({ kind, label, id, ...position });
    return label;
  });
  const plainText = clean.replace(/\s+([.,;])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  markers.forEach((marker, index) => {
    const reveal = () => {
      system.revealElement(marker.kind as 'aircraft' | 'threat' | 'target', marker.id);
      if (marker.kind === 'aircraft' || marker.kind === 'weapon') {
        const missionId = system.focusMode?.missionId ?? system.activeMissions.find((item) => item.phase !== 'COMPLETE' && item.phase !== 'ABORTED')?.missionId ?? '';
        window.dispatchEvent(new CustomEvent('aircommand:arc-viewer', { detail: { entityType: marker.kind === 'weapon' ? 'missile' : 'aircraft', entityId: marker.id, missionId } }));
      }
    };
    window.setTimeout(reveal, 800 + index * 300);
  });
  if (markers.length) window.dispatchEvent(new CustomEvent('aircommand:map-narrative-markers', { detail: { markers, text: plainText, duration: 3000 } }));
  return { text: plainText, markers };
}
