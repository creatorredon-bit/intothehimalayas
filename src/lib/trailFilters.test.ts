import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  beginnerTrails,
  filterTrails,
  filtersToParams,
  parseFilters,
  trailsForSeason,
} from './trailFilters';
import type { Trail } from './types';

function makeTrail(overrides: Partial<Trail> = {}): Trail {
  return {
    id: 'trail-1',
    slug: 'trail-1',
    name: 'Test Trek',
    summary: 'A test route through teahouse country.',
    description: 'Long description.',
    region: 'Khumbu',
    destinationId: null,
    difficulty: 'moderate',
    activity: 'trekking',
    distanceKm: 50,
    durationDays: 5,
    maxElevationM: 4000,
    elevationGainM: 2000,
    startPointName: 'Lukla',
    startLat: 27.68,
    startLng: 86.73,
    bestSeasons: ['spring', 'autumn'],
    heroImage: 'https://example.com/a.jpg',
    gallery: [],
    route: null,
    itinerary: [],
    facilities: ['Teahouses'],
    safetyNotes: '',
    permitInfo: '',
    isSample: true,
    featured: false,
    published: true,
    avgRating: null,
    reviewCount: 0,
    ...overrides,
  };
}

const trails: Trail[] = [
  makeTrail({ id: 'a', slug: 'a', name: 'Alpha Ridge', difficulty: 'easy', distanceKm: 12, durationDays: 2, maxElevationM: 2100, region: 'Kathmandu Valley', activity: 'hiking', bestSeasons: ['winter'] }),
  makeTrail({ id: 'b', slug: 'b', name: 'Bravo Base Camp', difficulty: 'hard', distanceKm: 130, durationDays: 14, maxElevationM: 5545, region: 'Khumbu', featured: true }),
  makeTrail({ id: 'c', slug: 'c', name: 'Charlie Valley', difficulty: 'moderate', distanceKm: 70, durationDays: 8, maxElevationM: 4773, region: 'Langtang', bestSeasons: ['autumn'] }),
  makeTrail({ id: 'd', slug: 'd', name: 'Delta Lake', difficulty: 'moderate', distanceKm: 40, durationDays: 4, maxElevationM: 3210, region: 'Annapurna', bestSeasons: ['autumn'], facilities: ['Hot springs'] }),
];

describe('filterTrails', () => {
  it('returns every trail for default filters', () => {
    const page = filterTrails(trails, { ...DEFAULT_FILTERS, pageSize: 10 });
    expect(page.total).toBe(4);
    expect(page.totalPages).toBe(1);
    expect(page.page).toBe(1);
  });

  it('filters by difficulty and region together', () => {
    const page = filterTrails(trails, { ...DEFAULT_FILTERS, difficulty: 'moderate', region: 'Langtang', pageSize: 10 });
    expect(page.items.map((trail) => trail.slug)).toEqual(['c']);
  });

  it('filters distance, duration and elevation bounds', () => {
    const page = filterTrails(trails, {
      ...DEFAULT_FILTERS,
      minDistance: 40,
      maxDistance: 100,
      maxDuration: 10,
      minElevation: 3000,
      pageSize: 10,
    });
    expect(page.items.map((trail) => trail.slug).sort()).toEqual(['c', 'd']);
  });

  it('matches multi-word queries across searchable fields', () => {
    expect(filterTrails(trails, { ...DEFAULT_FILTERS, q: 'teahouse country', pageSize: 10 }).total).toBe(4);
    expect(filterTrails(trails, { ...DEFAULT_FILTERS, q: 'hot springs', pageSize: 10 }).total).toBe(1);
    expect(filterTrails(trails, { ...DEFAULT_FILTERS, q: 'hot glacier', pageSize: 10 }).total).toBe(0);
  });

  it('filters by season', () => {
    const page = filterTrails(trails, { ...DEFAULT_FILTERS, season: 'winter', pageSize: 10 });
    expect(page.items.map((trail) => trail.slug)).toEqual(['a']);
  });

  it('sorts by distance ascending', () => {
    const page = filterTrails(trails, { ...DEFAULT_FILTERS, sort: 'distance-asc', pageSize: 10 });
    expect(page.items.map((trail) => trail.slug)).toEqual(['a', 'd', 'c', 'b']);
  });

  it('sorts by elevation descending', () => {
    const page = filterTrails(trails, { ...DEFAULT_FILTERS, sort: 'elevation-desc', pageSize: 10 });
    expect(page.items[0].slug).toBe('b');
  });

  it('puts featured trails first for recommended sorting', () => {
    const page = filterTrails(trails, { ...DEFAULT_FILTERS, pageSize: 10 });
    expect(page.items[0].slug).toBe('b');
  });

  it('paginates and clamps out-of-range pages', () => {
    const first = filterTrails(trails, { ...DEFAULT_FILTERS, pageSize: 2 });
    expect(first.totalPages).toBe(2);
    expect(first.items).toHaveLength(2);

    const beyond = filterTrails(trails, { ...DEFAULT_FILTERS, pageSize: 2, page: 99 });
    expect(beyond.page).toBe(2);

    const second = filterTrails(trails, { ...DEFAULT_FILTERS, pageSize: 2, page: 2 });
    expect(second.items).toHaveLength(2);
    expect(second.items[0].slug).not.toBe(first.items[0].slug);
  });
});

describe('filter URL serialisation', () => {
  it('round-trips a full filter set', () => {
    const filters = {
      ...DEFAULT_FILTERS,
      q: 'langtang',
      region: 'Langtang',
      difficulty: 'moderate',
      activity: 'trekking',
      season: 'autumn',
      minDistance: 20,
      maxDistance: 80,
      maxDuration: 9,
      minElevation: 3000,
      sort: 'distance-asc' as const,
      page: 2,
    };
    const parsed = parseFilters(filtersToParams(filters));
    expect(parsed).toMatchObject(filters);
  });

  it('ignores invalid sort and page values', () => {
    const parsed = parseFilters(new URLSearchParams('sort=sideways&page=-4'));
    expect(parsed.sort).toBe('recommended');
    expect(parsed.page).toBe(1);
  });

  it('omits default values from the URL', () => {
    const params = filtersToParams(DEFAULT_FILTERS);
    expect(params.toString()).toBe('');
  });

  it('counts only active filters', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, region: 'Khumbu', maxDuration: 7 })).toBe(2);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, minDistance: 0 })).toBe(1);
  });
});

describe('homepage helpers', () => {
  it('returns only easy routes for beginners', () => {
    const list = beginnerTrails(trails, 3);
    expect(list.map((trail) => trail.slug)).toEqual(['a']);
  });

  it('limits seasonal recommendations', () => {
    const list = trailsForSeason(trails, 'autumn', 1);
    expect(list).toHaveLength(1);
  });
});
