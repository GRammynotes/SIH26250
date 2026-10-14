import type { Position } from '../types';

export interface EnemyAsset {
  id: string;
  designation: string;
  type: 'sam-long' | 'sam-medium' | 'sam-short' | 'radar' | 'aircraft' | 'c2-node';
  position: Position;
  engagementRange_km: number;
  probabilityKill: number;
  behaviour: 'aggressive' | 'passive' | 'shoot-and-scoot';
  emissionState: 'active' | 'silent' | 'intermittent';
  intent: 'defensive' | 'offensive' | 'probing';
}

export const ENEMY_ASSETS: EnemyAsset[] = [
  { id: 'red-sam-01', designation: 'HQ-9B BATTERY · A-01', type: 'sam-long', position: { lat: 34.24, lng: 77.88 }, engagementRange_km: 200, probabilityKill: 0.68, behaviour: 'aggressive', emissionState: 'active', intent: 'defensive' },
  { id: 'red-sam-02', designation: 'LY-80 BATTERY · B-12', type: 'sam-medium', position: { lat: 33.84, lng: 77.42 }, engagementRange_km: 70, probabilityKill: 0.52, behaviour: 'shoot-and-scoot', emissionState: 'intermittent', intent: 'probing' },
  { id: 'red-sam-03', designation: 'FM-90 DETACHMENT · C-07', type: 'sam-short', position: { lat: 34.45, lng: 78.36 }, engagementRange_km: 15, probabilityKill: 0.37, behaviour: 'passive', emissionState: 'silent', intent: 'defensive' },
  { id: 'red-sam-04', designation: 'HQ-9P BATTERY · D-15', type: 'sam-long', position: { lat: 33.95, lng: 78.55 }, engagementRange_km: 250, probabilityKill: 0.72, behaviour: 'aggressive', emissionState: 'active', intent: 'defensive' },
  { id: 'red-sam-05', designation: 'HQ-16 BATTERY · E-03', type: 'sam-medium', position: { lat: 34.12, lng: 77.34 }, engagementRange_km: 80, probabilityKill: 0.58, behaviour: 'shoot-and-scoot', emissionState: 'intermittent', intent: 'probing' },
  { id: 'red-radar-01', designation: 'JY-27A EARLY WARNING', type: 'radar', position: { lat: 34.02, lng: 77.72 }, engagementRange_km: 350, probabilityKill: 0.15, behaviour: 'aggressive', emissionState: 'active', intent: 'probing' },
  { id: 'red-radar-02', designation: 'TYPE-305 ACQUISITION', type: 'radar', position: { lat: 33.76, lng: 78.01 }, engagementRange_km: 180, probabilityKill: 0.2, behaviour: 'shoot-and-scoot', emissionState: 'intermittent', intent: 'defensive' },
  { id: 'red-radar-03', designation: 'YLC-8B 3D RADAR', type: 'radar', position: { lat: 34.28, lng: 78.14 }, engagementRange_km: 300, probabilityKill: 0.18, behaviour: 'aggressive', emissionState: 'active', intent: 'probing' },
  { id: 'red-air-01', designation: 'CAP FLIGHT RED-21', type: 'aircraft', position: { lat: 34.38, lng: 77.26 }, engagementRange_km: 110, probabilityKill: 0.42, behaviour: 'aggressive', emissionState: 'active', intent: 'offensive' },
  { id: 'red-air-02', designation: 'CAP FLIGHT RED-34', type: 'aircraft', position: { lat: 33.71, lng: 77.98 }, engagementRange_km: 110, probabilityKill: 0.42, behaviour: 'aggressive', emissionState: 'intermittent', intent: 'probing' },
  { id: 'red-air-03', designation: 'J-10C PATROL', type: 'aircraft', position: { lat: 34.45, lng: 77.89 }, engagementRange_km: 130, probabilityKill: 0.48, behaviour: 'aggressive', emissionState: 'active', intent: 'offensive' },
  { id: 'red-air-04', designation: 'JF-17 PATROL', type: 'aircraft', position: { lat: 33.62, lng: 78.12 }, engagementRange_km: 100, probabilityKill: 0.38, behaviour: 'aggressive', emissionState: 'intermittent', intent: 'probing' },
  { id: 'red-c2-01', designation: 'SECTOR C2 NODE · KARGIL', type: 'c2-node', position: { lat: 34.56, lng: 77.12 }, engagementRange_km: 0, probabilityKill: 0.1, behaviour: 'passive', emissionState: 'active', intent: 'defensive' },
  { id: 'red-c2-02', designation: 'SH-15 ARTILLERY C2', type: 'c2-node', position: { lat: 34.08, lng: 77.95 }, engagementRange_km: 0, probabilityKill: 0.12, behaviour: 'passive', emissionState: 'active', intent: 'defensive' },
];
