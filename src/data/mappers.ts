import type {
  Destination,
  Difficulty,
  Guide,
  ItineraryDay,
  Profile,
  Review,
  RouteLine,
  SavedTrail,
  Season,
  Stay,
  StayType,
  Trail,
  Trip,
  TripDay,
  TripItem,
  Activity,
} from '@/lib/types';

export type DbRow = Record<string, unknown>;

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const nullableStr = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;
const nullableNum = (value: unknown): number | null =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
      ? Number(value)
      : null;
const bool = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const asSeasons = (value: unknown): Season[] =>
  asArray<string>(value).filter((season): season is Season =>
    ['spring', 'summer', 'autumn', 'winter'].includes(season),
  );

const asRoute = (value: unknown): RouteLine | null => {
  if (!value || typeof value !== 'object') return null;
  const route = value as { type?: string; coordinates?: unknown };
  if (route.type !== 'LineString' || !Array.isArray(route.coordinates)) return null;
  const coords = route.coordinates.filter(
    (pair): pair is [number, number] =>
      Array.isArray(pair) &&
      pair.length >= 2 &&
      Number.isFinite(Number(pair[0])) &&
      Number.isFinite(Number(pair[1])),
  );
  return coords.length >= 2 ? { type: 'LineString', coordinates: coords } : null;
};

const asItinerary = (value: unknown): ItineraryDay[] =>
  asArray<DbRow>(value)
    .map((day, index) => ({
      day: num(day.day, index + 1),
      title: str(day.title),
      description: str(day.description),
      altitudeM: nullableNum(day.altitudeM ?? day.altitude_m) ?? undefined,
      walkingHours: nullableStr(day.walkingHours ?? day.walking_hours) ?? undefined,
      accommodation: nullableStr(day.accommodation) ?? undefined,
    }))
    .filter((day) => day.title.length > 0);

export function mapTrail(row: DbRow): Trail {
  const destination = row.destinations as DbRow | null | undefined;
  return {
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name),
    summary: str(row.summary),
    description: str(row.description),
    region: str(row.region),
    destinationId: nullableStr(row.destination_id),
    destinationName: destination ? nullableStr(destination.name) : null,
    destinationSlug: destination ? nullableStr(destination.slug) : null,
    difficulty: (str(row.difficulty, 'moderate') as Difficulty) || 'moderate',
    activity: (str(row.activity, 'trekking') as Activity) || 'trekking',
    distanceKm: num(row.distance_km),
    durationDays: num(row.duration_days),
    maxElevationM: num(row.max_elevation_m),
    elevationGainM: nullableNum(row.elevation_gain_m),
    startPointName: str(row.start_point_name),
    startLat: num(row.start_lat),
    startLng: num(row.start_lng),
    bestSeasons: asSeasons(row.best_seasons),
    heroImage: str(row.hero_image),
    gallery: asArray<string>(row.gallery),
    route: asRoute(row.route_geojson),
    itinerary: asItinerary(row.itinerary),
    facilities: asArray<string>(row.facilities),
    safetyNotes: str(row.safety_notes),
    permitInfo: str(row.permit_info),
    permitsRequired: asArray<string>(row.permits_required),
    isSample: bool(row.is_sample, true),
    featured: bool(row.featured),
    published: bool(row.published, true),
    avgRating: nullableNum(row.avg_rating),
    reviewCount: num(row.review_count),
  };
}

export function mapDestination(row: DbRow): Destination {
  return {
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name),
    region: str(row.region),
    tagline: str(row.tagline),
    description: str(row.description),
    heroImage: str(row.hero_image),
    bestSeasons: asSeasons(row.best_seasons),
    lat: num(row.lat),
    lng: num(row.lng),
    featured: bool(row.featured),
    published: bool(row.published, true),
    trailCount: nullableNum(row.trail_count) ?? undefined,
  };
}

export function mapGuide(row: DbRow): Guide {
  return {
    id: str(row.id),
    slug: str(row.slug),
    fullName: str(row.full_name),
    region: str(row.region),
    languages: asArray<string>(row.languages),
    specialties: asArray<string>(row.specialties),
    experienceYears: nullableNum(row.experience_years),
    dayRateNpr: nullableNum(row.day_rate_npr),
    bio: str(row.bio),
    contactEmail: nullableStr(row.contact_email),
    contactPhone: nullableStr(row.contact_phone),
    verified: bool(row.verified),
    published: bool(row.published, true),
    isSample: bool(row.is_sample, true),
  };
}

export function mapStay(row: DbRow): Stay {
  return {
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name),
    type: (str(row.type, 'teahouse') as StayType) || 'teahouse',
    region: str(row.region),
    destinationId: nullableStr(row.destination_id),
    description: str(row.description),
    pricePerNightNpr: nullableNum(row.price_per_night_npr),
    amenities: asArray<string>(row.amenities),
    photoUrl: str(row.photo_url),
    contactEmail: nullableStr(row.contact_email),
    lat: nullableNum(row.lat),
    lng: nullableNum(row.lng),
    published: bool(row.published, true),
    isSample: bool(row.is_sample, true),
  };
}

export function mapProfile(row: DbRow): Profile {
  return {
    id: str(row.id),
    fullName: str(row.full_name),
    avatarUrl: nullableStr(row.avatar_url),
    bio: nullableStr(row.bio),
    homeRegion: nullableStr(row.home_region),
    preferredDifficulty: (nullableStr(row.preferred_difficulty) as Difficulty | null) ?? null,
    preferredActivity: (nullableStr(row.preferred_activity) as Activity | null) ?? null,
    preferredSeason: (nullableStr(row.preferred_season) as Season | null) ?? null,
    role: str(row.role, 'user') === 'admin' ? 'admin' : str(row.role) === 'moderator' ? 'moderator' : 'user',
    createdAt: str(row.created_at),
  };
}

export function mapReview(row: DbRow): Review {
  return {
    id: str(row.id),
    trailId: str(row.trail_id),
    userId: str(row.user_id),
    authorName: nullableStr(row.author_name),
    rating: num(row.rating, 5),
    title: nullableStr(row.title),
    body: str(row.body),
    visitedOn: nullableStr(row.visited_on),
    status: (str(row.status, 'pending') as Review['status']) || 'pending',
    createdAt: str(row.created_at),
  };
}

export function mapSavedTrail(row: DbRow): SavedTrail {
  const trail = (row.trails as DbRow | null) ?? {};
  return {
    trailId: str(row.trail_id),
    slug: str(trail.slug),
    name: str(trail.name),
    region: str(trail.region),
    heroImage: str(trail.hero_image),
    difficulty: (str(trail.difficulty, 'moderate') as Difficulty) || 'moderate',
    distanceKm: num(trail.distance_km),
    durationDays: num(trail.duration_days),
    note: nullableStr(row.note),
    collectionId: nullableStr(row.collection_id),
    savedAt: str(row.created_at),
  };
}

export function mapTripDay(row: DbRow): TripDay {
  return {
    id: str(row.id),
    tripId: str(row.trip_id),
    dayNumber: num(row.day_number, 1),
    date: nullableStr(row.date),
    title: str(row.title),
    notes: nullableStr(row.notes),
    items: asArray<DbRow>(row.trip_items)
      .map((item) => mapTripItem(item))
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
  };
}

export function mapTripItem(row: DbRow): TripItem {
  const trail = row.trails as DbRow | null | undefined;
  return {
    id: str(row.id),
    tripDayId: str(row.trip_day_id),
    trailId: nullableStr(row.trail_id),
    trailSlug: trail ? nullableStr(trail.slug) : null,
    title: str(row.title),
    startTime: nullableStr(row.start_time),
    notes: nullableStr(row.notes),
    estimatedCostNpr: nullableNum(row.estimated_cost_npr),
  };
}

export function mapTrip(row: DbRow): Trip {
  return {
    id: str(row.id),
    title: str(row.title),
    startDate: nullableStr(row.start_date),
    endDate: nullableStr(row.end_date),
    travelers: num(row.travelers, 1),
    budgetNpr: nullableNum(row.budget_npr),
    notes: nullableStr(row.notes),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
    days: asArray<DbRow>(row.trip_days)
      .map((day) => mapTripDay(day))
      .sort((a, b) => a.dayNumber - b.dayNumber),
  };
}

/**
 * Strips characters that would break PostgREST's `or()` filter grammar.
 * The value is still passed as a bound query parameter by supabase-js.
 */
export function sanitizeSearch(input: string): string {
  return input.replace(/[(),*%\\"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}
