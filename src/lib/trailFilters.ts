import type { Trail, TrailFilterState, TrailPage, TrailSort } from './types';

export const PAGE_SIZE = 9;

export const DEFAULT_FILTERS: TrailFilterState = {
  q: '',
  region: '',
  difficulty: '',
  activity: '',
  season: '',
  minDistance: null,
  maxDistance: null,
  maxDuration: null,
  minElevation: null,
  sort: 'recommended',
  page: 1,
  pageSize: PAGE_SIZE,
};

export const SORT_OPTIONS: { value: TrailSort; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'distance-asc', label: 'Shortest distance' },
  { value: 'duration-asc', label: 'Fewest days' },
  { value: 'elevation-desc', label: 'Highest altitude' },
  { value: 'name-asc', label: 'Name (A–Z)' },
];

const SORTS: TrailSort[] = SORT_OPTIONS.map((option) => option.value);

export function numeric(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Reads filters from a shareable URL query string. */
export function parseFilters(params: URLSearchParams, pageSize = PAGE_SIZE): TrailFilterState {
  const sortParam = params.get('sort') as TrailSort | null;
  const pageParam = Number(params.get('page'));
  return {
    q: params.get('q')?.trim() ?? '',
    region: params.get('region')?.trim() ?? '',
    difficulty: params.get('difficulty')?.trim() ?? '',
    activity: params.get('activity')?.trim() ?? '',
    season: params.get('season')?.trim() ?? '',
    minDistance: numeric(params.get('minDistance')),
    maxDistance: numeric(params.get('maxDistance')),
    maxDuration: numeric(params.get('maxDuration')),
    minElevation: numeric(params.get('minElevation')),
    sort: sortParam && SORTS.includes(sortParam) ? sortParam : 'recommended',
    page: Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1,
    pageSize,
  };
}

export function filtersToParams(filters: TrailFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.region) params.set('region', filters.region);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.activity) params.set('activity', filters.activity);
  if (filters.season) params.set('season', filters.season);
  if (filters.minDistance !== null) params.set('minDistance', String(filters.minDistance));
  if (filters.maxDistance !== null) params.set('maxDistance', String(filters.maxDistance));
  if (filters.maxDuration !== null) params.set('maxDuration', String(filters.maxDuration));
  if (filters.minElevation !== null) params.set('minElevation', String(filters.minElevation));
  if (filters.sort !== 'recommended') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export function activeFilterCount(filters: TrailFilterState): number {
  let count = 0;
  if (filters.q) count += 1;
  if (filters.region) count += 1;
  if (filters.difficulty) count += 1;
  if (filters.activity) count += 1;
  if (filters.season) count += 1;
  if (filters.minDistance !== null) count += 1;
  if (filters.maxDistance !== null) count += 1;
  if (filters.maxDuration !== null) count += 1;
  if (filters.minElevation !== null) count += 1;
  return count;
}

function matchesQuery(trail: Trail, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    trail.name,
    trail.summary,
    trail.description,
    trail.region,
    trail.destinationName ?? '',
    trail.startPointName,
    ...trail.facilities,
    ...trail.bestSeasons,
  ]
    .join(' ')
    .toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

/** Pure filtering + sorting + pagination, shared by the sample and Supabase paths. */
export function filterTrails(trails: Trail[], filters: TrailFilterState): TrailPage {
  const filtered = trails.filter((trail) => {
    if (!matchesQuery(trail, filters.q)) return false;
    if (filters.region && trail.region !== filters.region) return false;
    if (filters.difficulty && trail.difficulty !== filters.difficulty) return false;
    if (filters.activity && trail.activity !== filters.activity) return false;
    if (filters.season && !trail.bestSeasons.includes(filters.season as Trail['bestSeasons'][number])) {
      return false;
    }
    if (filters.minDistance !== null && trail.distanceKm < filters.minDistance) return false;
    if (filters.maxDistance !== null && trail.distanceKm > filters.maxDistance) return false;
    if (filters.maxDuration !== null && trail.durationDays > filters.maxDuration) return false;
    if (filters.minElevation !== null && trail.maxElevationM < filters.minElevation) return false;
    return true;
  });

  const sorted = [...filtered].sort(comparator(filters.sort));
  const total = sorted.length;
  const pageSize = filters.pageSize > 0 ? filters.pageSize : PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, filters.page), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: sorted.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

function comparator(sort: TrailSort): (a: Trail, b: Trail) => number {
  switch (sort) {
    case 'distance-asc':
      return (a, b) => a.distanceKm - b.distanceKm;
    case 'duration-asc':
      return (a, b) => a.durationDays - b.durationDays || a.distanceKm - b.distanceKm;
    case 'elevation-desc':
      return (a, b) => b.maxElevationM - a.maxElevationM;
    case 'name-asc':
      return (a, b) => a.name.localeCompare(b.name);
    case 'recommended':
    default:
      return (a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        const ratingDiff = (b.avgRating ?? 0) - (a.avgRating ?? 0);
        if (ratingDiff !== 0) return ratingDiff;
        return a.name.localeCompare(b.name);
      };
  }
}

export function uniqueRegions(trails: Trail[]): string[] {
  return [...new Set(trails.map((trail) => trail.region))].sort((a, b) => a.localeCompare(b));
}

export function trailsForSeason(trails: Trail[], season: string, limit = 3): Trail[] {
  return trails.filter((trail) => trail.bestSeasons.includes(season as Trail['bestSeasons'][number])).slice(0, limit);
}

export function beginnerTrails(trails: Trail[], limit = 3): Trail[] {
  return trails
    .filter((trail) => trail.difficulty === 'easy')
    .sort((a, b) => a.durationDays - b.durationDays || a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
