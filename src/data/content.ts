import { supabase } from '@/lib/supabase';
import { filterTrails } from '@/lib/trailFilters';
import { sampleDestinations, sampleGuides, sampleReviews, sampleStays, sampleTrails } from './sample';
import { mapDestination, mapGuide, mapReview, mapStay, mapTrail, sanitizeSearch, type DbRow } from './mappers';
import type {
  Destination,
  Guide,
  GuideFilters,
  Review,
  Stay,
  StayFilters,
  Trail,
  TrailFilterState,
  TrailPage,
} from '@/lib/types';

/** Where the public content on screen came from. Surfaced in the UI banner. */
export const contentSource: 'supabase' | 'sample' = supabase ? 'supabase' : 'sample';

export class ContentError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ContentError';
    this.cause = cause;
  }
}

function fail(error: unknown, context: string): never {
  const message =
    typeof error === 'object' && error && 'message' in error
      ? String((error as { message: unknown }).message)
      : 'Unknown database error';
  const schemaHint = /relation .* does not exist|column .* does not exist|schema cache/i.test(message)
    ? ' The database schema looks incomplete — run the SQL in supabase/migrations/ against your project.'
    : '';
  throw new ContentError(`${context}: ${message}.${schemaHint}`, error);
}

const TRAIL_SELECT = `
  id, slug, name, summary, description, region, destination_id, difficulty, activity,
  distance_km, duration_days, max_elevation_m, elevation_gain_m, start_point_name, start_lat, start_lng,
  best_seasons, hero_image, gallery, route_geojson, itinerary, facilities, safety_notes, permit_info,
  permits_required, is_sample, featured, published, avg_rating, review_count,
  destinations ( name, slug )
`;

const DESTINATION_SELECT =
  'id, slug, name, region, tagline, description, hero_image, best_seasons, lat, lng, featured, published';

export async function listTrails(filters: TrailFilterState): Promise<TrailPage> {
  if (!supabase) return filterTrails(sampleTrails, filters);

  const pageSize = filters.pageSize > 0 ? filters.pageSize : 9;
  const requestedPage = Math.max(1, filters.page);
  const q = sanitizeSearch(filters.q);

  let query = supabase
    .from('trails')
    .select(TRAIL_SELECT, { count: 'exact' })
    .eq('published', true);

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,summary.ilike.%${q}%,description.ilike.%${q}%,region.ilike.%${q}%,start_point_name.ilike.%${q}%`,
    );
  }
  if (filters.region) query = query.eq('region', filters.region);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
  if (filters.activity) query = query.eq('activity', filters.activity);
  if (filters.season) query = query.contains('best_seasons', [filters.season]);
  if (filters.minDistance !== null) query = query.gte('distance_km', filters.minDistance);
  if (filters.maxDistance !== null) query = query.lte('distance_km', filters.maxDistance);
  if (filters.maxDuration !== null) query = query.lte('duration_days', filters.maxDuration);
  if (filters.minElevation !== null) query = query.gte('max_elevation_m', filters.minElevation);

  switch (filters.sort) {
    case 'distance-asc':
      query = query.order('distance_km', { ascending: true });
      break;
    case 'duration-asc':
      query = query.order('duration_days', { ascending: true }).order('distance_km', { ascending: true });
      break;
    case 'elevation-desc':
      query = query.order('max_elevation_m', { ascending: false });
      break;
    case 'name-asc':
      query = query.order('name', { ascending: true });
      break;
    default:
      query = query
        .order('featured', { ascending: false })
        .order('avg_rating', { ascending: false, nullsFirst: false })
        .order('name', { ascending: true });
  }

  const from = (requestedPage - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) fail(error, 'Could not load trails');

  const total = count ?? data?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    items: ((data ?? []) as DbRow[]).map(mapTrail),
    total,
    page: Math.min(requestedPage, totalPages),
    pageSize,
    totalPages,
  };
}

export async function getTrailBySlug(slug: string): Promise<Trail | null> {
  if (!supabase) return sampleTrails.find((trail) => trail.slug === slug) ?? null;
  const { data, error } = await supabase.from('trails').select(TRAIL_SELECT).eq('slug', slug).maybeSingle();
  if (error) fail(error, 'Could not load this trail');
  return data ? mapTrail(data as DbRow) : null;
}

export async function listFeaturedTrails(limit = 3): Promise<Trail[]> {
  if (!supabase) return sampleTrails.filter((trail) => trail.featured).slice(0, limit);
  const { data, error } = await supabase
    .from('trails')
    .select(TRAIL_SELECT)
    .eq('published', true)
    .eq('featured', true)
    .order('avg_rating', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) fail(error, 'Could not load featured trails');
  return ((data ?? []) as DbRow[]).map(mapTrail);
}

export async function listAllTrails(limit = 200): Promise<Trail[]> {
  if (!supabase) return sampleTrails;
  const { data, error } = await supabase
    .from('trails')
    .select(TRAIL_SELECT)
    .eq('published', true)
    .order('name', { ascending: true })
    .limit(limit);
  if (error) fail(error, 'Could not load trails');
  return ((data ?? []) as DbRow[]).map(mapTrail);
}

export async function listRegions(): Promise<string[]> {
  if (!supabase) {
    return [...new Set(sampleTrails.map((trail) => trail.region))].sort((a, b) => a.localeCompare(b));
  }
  const { data, error } = await supabase.from('trails').select('region').eq('published', true);
  if (error) fail(error, 'Could not load regions');
  return [...new Set(((data ?? []) as { region: string }[]).map((row) => row.region))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export async function listDestinations(): Promise<Destination[]> {
  if (!supabase) {
    return sampleDestinations.map((destination) => ({
      ...destination,
      trailCount: sampleTrails.filter((trail) => trail.destinationId === destination.id).length,
    }));
  }

  const [destinationsResult, trailsResult] = await Promise.all([
    supabase
      .from('destinations')
      .select(DESTINATION_SELECT)
      .eq('published', true)
      .order('featured', { ascending: false })
      .order('name', { ascending: true }),
    supabase.from('trails').select('destination_id').eq('published', true),
  ]);

  if (destinationsResult.error) fail(destinationsResult.error, 'Could not load destinations');

  const counts = new Map<string, number>();
  for (const row of (trailsResult.data ?? []) as { destination_id: string | null }[]) {
    if (row.destination_id) counts.set(row.destination_id, (counts.get(row.destination_id) ?? 0) + 1);
  }

  return ((destinationsResult.data ?? []) as DbRow[]).map((row) => ({
    ...mapDestination(row),
    trailCount: counts.get(String(row.id)) ?? 0,
  }));
}

export async function getDestinationBySlug(slug: string): Promise<Destination | null> {
  if (!supabase) return sampleDestinations.find((destination) => destination.slug === slug) ?? null;
  const { data, error } = await supabase
    .from('destinations')
    .select(DESTINATION_SELECT)
    .eq('slug', slug)
    .maybeSingle();
  if (error) fail(error, 'Could not load this destination');
  return data ? mapDestination(data as DbRow) : null;
}

export async function listTrailsForDestination(destinationId: string, limit = 12): Promise<Trail[]> {
  if (!supabase) return sampleTrails.filter((trail) => trail.destinationId === destinationId).slice(0, limit);
  const { data, error } = await supabase
    .from('trails')
    .select(TRAIL_SELECT)
    .eq('destination_id', destinationId)
    .eq('published', true)
    .order('featured', { ascending: false })
    .limit(limit);
  if (error) fail(error, 'Could not load trails for this destination');
  return ((data ?? []) as DbRow[]).map(mapTrail);
}

export async function listReviews(trailId: string): Promise<Review[]> {
  if (!supabase) return sampleReviews.filter((review) => review.trailId === trailId);
  const { data, error } = await supabase
    .from('trail_reviews')
    .select('id, trail_id, user_id, author_name, rating, title, body, visited_on, status, created_at')
    .eq('trail_id', trailId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  if (error) fail(error, 'Could not load reviews');
  return ((data ?? []) as DbRow[]).map(mapReview);
}

export async function listGuides(filters: GuideFilters): Promise<Guide[]> {
  if (!supabase) {
    const q = filters.q.toLowerCase();
    return sampleGuides.filter((guide) => {
      if (q && !`${guide.fullName} ${guide.bio} ${guide.specialties.join(' ')}`.toLowerCase().includes(q))
        return false;
      if (filters.region && guide.region !== filters.region) return false;
      if (filters.language && !guide.languages.includes(filters.language)) return false;
      if (filters.specialty && !guide.specialties.some((s) => s.toLowerCase().includes(filters.specialty.toLowerCase())))
        return false;
      return true;
    });
  }

  const q = sanitizeSearch(filters.q);
  let query = supabase
    .from('guides')
    .select('id, slug, full_name, region, languages, specialties, experience_years, day_rate_npr, bio, contact_email, contact_phone, verified, published, is_sample')
    .eq('published', true);

  if (q) query = query.or(`full_name.ilike.%${q}%,bio.ilike.%${q}%,region.ilike.%${q}%`);
  if (filters.region) query = query.eq('region', filters.region);
  if (filters.language) query = query.contains('languages', [filters.language]);

  const { data, error } = await query.order('verified', { ascending: false }).order('full_name');
  if (error) fail(error, 'Could not load guides');
  return ((data ?? []) as DbRow[]).map(mapGuide).filter((guide) => {
    if (!filters.specialty) return true;
    return guide.specialties.some((s) => s.toLowerCase().includes(filters.specialty.toLowerCase()));
  });
}

export async function getGuideBySlug(slug: string): Promise<Guide | null> {
  if (!supabase) return sampleGuides.find((guide) => guide.slug === slug) ?? null;
  const { data, error } = await supabase.from('guides').select('*').eq('slug', slug).maybeSingle();
  if (error) fail(error, 'Could not load this guide');
  return data ? mapGuide(data as DbRow) : null;
}

export async function listStays(filters: StayFilters): Promise<Stay[]> {
  if (!supabase) {
    const q = filters.q.toLowerCase();
    return sampleStays.filter((stay) => {
      if (q && !`${stay.name} ${stay.description} ${stay.region}`.toLowerCase().includes(q)) return false;
      if (filters.region && stay.region !== filters.region) return false;
      if (filters.type && stay.type !== filters.type) return false;
      if (filters.maxPrice !== null && (stay.pricePerNightNpr ?? 0) > filters.maxPrice) return false;
      return true;
    });
  }

  const q = sanitizeSearch(filters.q);
  let query = supabase
    .from('stays')
    .select('id, slug, name, type, region, destination_id, description, price_per_night_npr, amenities, photo_url, contact_email, lat, lng, published, is_sample')
    .eq('published', true);

  if (q) query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%,region.ilike.%${q}%`);
  if (filters.region) query = query.eq('region', filters.region);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.maxPrice !== null) query = query.lte('price_per_night_npr', filters.maxPrice);

  const { data, error } = await query.order('name');
  if (error) fail(error, 'Could not load stays');
  return ((data ?? []) as DbRow[]).map(mapStay);
}

export async function getStayBySlug(slug: string): Promise<Stay | null> {
  if (!supabase) return sampleStays.find((stay) => stay.slug === slug) ?? null;
  const { data, error } = await supabase.from('stays').select('*').eq('slug', slug).maybeSingle();
  if (error) fail(error, 'Could not load this stay');
  return data ? mapStay(data as DbRow) : null;
}

/** All distinct guide regions/languages for filter menus, with graceful fallback. */
export async function listGuideFacets(): Promise<{ regions: string[]; languages: string[]; specialties: string[] }> {
  const guides = await listGuides({ q: '', region: '', language: '', specialty: '' });
  return {
    regions: [...new Set(guides.map((guide) => guide.region))].sort((a, b) => a.localeCompare(b)),
    languages: [...new Set(guides.flatMap((guide) => guide.languages))].sort((a, b) => a.localeCompare(b)),
    specialties: [...new Set(guides.flatMap((guide) => guide.specialties))].sort((a, b) => a.localeCompare(b)),
  };
}
