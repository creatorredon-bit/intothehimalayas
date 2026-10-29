import type { RouteLine } from '@/lib/types';

/** GeoJSON stores [lng, lat]; this helper keeps seed data readable as [lat, lng]. */
export function line(points: [number, number][]): RouteLine {
  return { type: 'LineString', coordinates: points.map(([lat, lng]) => [lng, lat]) };
}
