import type { WeatherSystem } from '../types';

const validUntil = '2026-10-14T18:00:00+05:30';

export const WEATHER_SYSTEMS: WeatherSystem[] = [
  {
    id: 'cirrus-7', type: 'fog', severity: 4, visibility_km: 1.2, ceiling_ft: 700, windDir_deg: 310, windSpeed_kt: 12, validUntil,
    polygon: [{ lat: 33.55, lng: 75.85 }, { lat: 34.08, lng: 75.85 }, { lat: 34.08, lng: 76.75 }, { lat: 33.55, lng: 76.75 }],
  },
  {
    id: 'western-front', type: 'front', severity: 3, visibility_km: 7, ceiling_ft: 5000, windDir_deg: 270, windSpeed_kt: 26, validUntil,
    polygon: [{ lat: 31.0, lng: 73.6 }, { lat: 32.25, lng: 73.6 }, { lat: 32.6, lng: 75.8 }, { lat: 31.3, lng: 75.8 }],
  },
  {
    id: 'ladakh-cell', type: 'storm', severity: 5, visibility_km: 2.5, ceiling_ft: 2200, windDir_deg: 225, windSpeed_kt: 42, validUntil,
    polygon: [{ lat: 34.05, lng: 77.7 }, { lat: 34.85, lng: 77.7 }, { lat: 34.85, lng: 79.1 }, { lat: 34.05, lng: 79.1 }],
  },
  {
    id: 'leh-clear', type: 'clear', severity: 1, visibility_km: 20, ceiling_ft: 18000, windDir_deg: 180, windSpeed_kt: 8, validUntil,
    polygon: [{ lat: 33.85, lng: 76.9 }, { lat: 34.3, lng: 76.9 }, { lat: 34.3, lng: 77.55 }, { lat: 33.85, lng: 77.55 }],
  },
];

export const freshWeather = () => WEATHER_SYSTEMS.map((system) => ({ ...system, polygon: system.polygon.map((point) => ({ ...point })) }));
