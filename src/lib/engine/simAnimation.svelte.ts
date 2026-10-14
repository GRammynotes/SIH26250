import { system } from '../stores/systemStore.svelte';
import { phaseDuration, progressFraction, interpolatePosition } from './missionExecutor';
import { GROUND_ASSETS } from '../data/groundAssets';

export interface AnimatedTrack { lat: number; lng: number; heading: number; scale: number; trail: [number, number][] }
export interface SimulationFrame {
  aircraft: Record<string, AnimatedTrack>;
  assets: Record<string, { lat: number; lng: number; heading: number }>;
  missiles: Array<{ id: string; coordinates: [number, number]; trail: [number, number][] }>;
  impacts: Array<{ id: string; coordinates: [number, number]; progress: number; flash: boolean }>;
  threats: Record<string, number>;
}

let simulationFrame = $state.raw<SimulationFrame>({ aircraft: {}, assets: {}, missiles: [], impacts: [], threats: {} });
export function getSimulationFrame(): SimulationFrame { return simulationFrame; }
const missionOrigins = new Map<string, Record<string, { lat: number; lng: number }>>();
const missionReleaseStart = new Map<string, number>();
const recentImpacts = new Map<string, { at: number; lat: number; lng: number }>();
const trails = new Map<string, [number, number][]>();
let raf = 0;
let lastUpdate = 0;

function bearing(from: [number, number], to: [number, number]): number {
  const y = Math.sin((to[0] - from[0]) * Math.PI / 180) * Math.cos(to[1] * Math.PI / 180);
  const x = Math.cos(from[1] * Math.PI / 180) * Math.sin(to[1] * Math.PI / 180) - Math.sin(from[1] * Math.PI / 180) * Math.cos(to[1] * Math.PI / 180) * Math.cos((to[0] - from[0]) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function update(now: number) {
  if (!system.activeScenarioFilter && !system.activeMissions.some((mission) => mission.phase !== 'COMPLETE' && mission.phase !== 'ABORTED')) {
    if (Object.keys(simulationFrame.aircraft).length || simulationFrame.missiles.length || simulationFrame.impacts.length) simulationFrame = { aircraft: {}, assets: {}, missiles: [], impacts: [], threats: {} };
    raf = 0;
    return;
  }
  raf = requestAnimationFrame(update);
  if (now - lastUpdate < 80) return;
  lastUpdate = now;
  const wallNow = Date.now();
  const aircraft: SimulationFrame['aircraft'] = {};
  const missiles: SimulationFrame['missiles'] = [];
  const impacts: SimulationFrame['impacts'] = [];
  const threats: SimulationFrame['threats'] = {};

  for (const mission of system.activeMissions) {
    if (mission.phase === 'COMPLETE' || mission.phase === 'ABORTED') continue;
    if (system.simSpeed === 0) continue;
    const elapsed = Math.max(0, (wallNow - mission.phaseStartTime) / 60000);
    const fraction = progressFraction(mission.phase, elapsed, phaseDuration(mission.phase));
    const origins = missionOrigins.get(mission.id) ?? mission.origins;
    if (!missionOrigins.has(mission.id)) missionOrigins.set(mission.id, origins);
    for (const id of mission.aircraftIds) {
      const origin = origins[id];
      if (!origin) continue;
      const pos = interpolatePosition(origin, mission.target, fraction);
      const prior = trails.get(id) ?? [];
      const coords: [number, number] = [pos.lng, pos.lat];
      if (!prior.length || Math.hypot(prior[prior.length - 1][0] - coords[0], prior[prior.length - 1][1] - coords[1]) > 0.0002) prior.push(coords);
      trails.set(id, prior.slice(-80));
      const reverse = mission.phase === 'EGRESS' || mission.phase === 'RTB';
      const next = interpolatePosition(origin, mission.target, Math.max(0, Math.min(1, fraction + (reverse ? -0.001 : 0.001))));
      aircraft[id] = { lat: pos.lat, lng: pos.lng, heading: bearing(coords, [next.lng, next.lat]), scale: mission.phase === 'RELEASE' ? 1.3 : 1, trail: trails.get(id)! };
    }
    if (mission.phase === 'RELEASE') {
      const began = missionReleaseStart.get(mission.id) ?? wallNow;
      missionReleaseStart.set(mission.id, began);
      const progress = Math.min(1, (wallNow - began) / 2000);
      for (const id of mission.aircraftIds) {
        const origin = origins[id]; if (!origin) continue;
        const start = interpolatePosition(origin, mission.target, 0.95);
        const point = interpolatePosition(start, mission.target, progress);
        if (progress < 1) missiles.push({ id: `missile-${mission.id}-${id}`, coordinates: [point.lng, point.lat], trail: [[start.lng, start.lat], [point.lng, point.lat]] });
      }
      if (progress >= 1 && !recentImpacts.has(mission.id)) recentImpacts.set(mission.id, { at: wallNow, lat: mission.target.lat, lng: mission.target.lng });
    } else missionReleaseStart.delete(mission.id);
    const nearThreat = system.scenarioThreats.find((threat) => Math.hypot((threat.position.lat - mission.target.lat) * 111, (threat.position.lng - mission.target.lng) * 91) < threat.radius);
    if (nearThreat && fraction > 0.75) threats[nearThreat.id] = (Math.sin(wallNow / 130) + 1) / 2;
  }

  for (const [id, impact] of recentImpacts) {
    const progress = (wallNow - impact.at) / 1500;
    if (progress >= 1) { recentImpacts.delete(id); continue; }
    impacts.push({ id, coordinates: [impact.lng, impact.lat], progress, flash: wallNow - impact.at < 500 });
  }

  const assets: SimulationFrame['assets'] = {};
  for (const [index, asset] of GROUND_ASSETS.entries()) {
    const angle = wallNow / (asset.type === 'tank' ? 70000 : 18000) + index;
    const radius = asset.type === 'tank' && asset.status === 'ACTIVE' ? 0.018 : asset.type === 'uav' ? 0.035 : 0;
    assets[asset.id] = { lat: asset.position.lat + Math.sin(angle) * radius, lng: asset.position.lng + Math.cos(angle) * radius, heading: (angle * 180 / Math.PI + 360) % 360 };
  }
  simulationFrame = { aircraft, assets, missiles, impacts, threats };
}

export function setSimulationAnimationActive(active: boolean): void {
  if (active && !raf) raf = requestAnimationFrame(update);
  if (!active && raf) { cancelAnimationFrame(raf); raf = 0; }
}
