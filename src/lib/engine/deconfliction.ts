import type { Aircraft, COA, Mission } from '../types';

function distanceKm(a: Aircraft['position'], b: Aircraft['position']): number {
  return Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180));
}

export function detectDeconflictionWarnings(coa: COA, aircraft: Aircraft[], missions: Mission[]): string[] {
  const assignments = Object.entries(coa.assignments);
  const warnings: string[] = [];
  for (let i = 0; i < assignments.length; i++) for (let j = i + 1; j < assignments.length; j++) {
    const [missionA, idsA] = assignments[i], [missionB, idsB] = assignments[j];
    const targetA = missions.find((mission) => mission.id === missionA)?.target;
    const targetB = missions.find((mission) => mission.id === missionB)?.target;
    if (!targetA || !targetB || distanceKm(targetA, targetB) > 5) continue;
    for (const idA of idsA) for (const idB of idsB) {
      const a = aircraft.find((item) => item.id === idA); const b = aircraft.find((item) => item.id === idB);
      if (a && b && distanceKm(a.position, b.position) <= 45) warnings.push(`${a.tailNumber}/${b.tailNumber} · ${missionA.toUpperCase()}↔${missionB.toUpperCase()} · ALT/TIME SEPARATION REQUIRED`);
    }
  }
  return warnings;
}
