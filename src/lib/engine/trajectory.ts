import greatCircle from '@turf/great-circle';
import type { Position } from '../types';

export type Coordinate = [number, number];

export function greatCircleCoordinates(start: Position, end: Position, points = 80): Coordinate[] {
  const feature = greatCircle([start.lng, start.lat], [end.lng, end.lat], { npoints: points });
  const geometry = feature.geometry;
  const coordinates = geometry.type === 'LineString'
    ? geometry.coordinates
    : geometry.coordinates.flat();
  return coordinates.map(([lng, lat]) => [lng, lat]);
}

export function pointAlongPath(path: Coordinate[], fraction: number): Coordinate {
  if (path.length < 2) return path[0] ?? [0, 0];
  const scaled = Math.max(0, Math.min(0.999999, fraction)) * (path.length - 1);
  const index = Math.floor(scaled);
  const progress = scaled - index;
  const a = path[index];
  const b = path[index + 1];
  return [a[0] + (b[0] - a[0]) * progress, a[1] + (b[1] - a[1]) * progress];
}

export function circleAround(center: Coordinate, radiusKm: number, points = 48): Coordinate[] {
  const [lng, lat] = center;
  const radiusLat = radiusKm / 110.574;
  const radiusLng = radiusKm / (111.32 * Math.max(0.1, Math.cos(lat * Math.PI / 180)));
  return Array.from({ length: points + 1 }, (_, i) => {
    const angle = (i / points) * Math.PI * 2;
    return [lng + Math.cos(angle) * radiusLng, lat + Math.sin(angle) * radiusLat] as Coordinate;
  });
}
