export type TrailHistory = Record<string, [number, number][]>;

export function createTrailPathDeriver() {
  let lastKey = '';
  let paths: TrailHistory = {};
  return (history: TrailHistory): TrailHistory => {
    const key = JSON.stringify(history);
    if (key === lastKey) return paths;
    lastKey = key;
    paths = Object.fromEntries(Object.entries(history).map(([id, points]) => [
      id,
      points.map(([lng, lat]) => [lng, lat] as [number, number]),
    ]));
    return paths;
  };
}
