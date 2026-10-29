import { requireSupabase } from '@/lib/supabase';

export type AdminEntity =
  | 'trails'
  | 'destinations'
  | 'guides'
  | 'stays'
  | 'trail_reviews'
  | 'inquiries'
  | 'contact_messages';

export type AdminFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'tags'
  | 'json'
  | 'date';

export interface AdminField {
  name: string;
  label: string;
  type: AdminFieldType;
  required?: boolean;
  help?: string;
  options?: { label: string; value: string }[];
  wide?: boolean;
}

export interface AdminEntityConfig {
  label: string;
  table: AdminEntity;
  primaryLabel: string;
  description: string;
  fields: AdminField[];
  readOnly?: boolean;
}

export const ADMIN_ENTITIES: Record<AdminEntity, AdminEntityConfig> = {
  trails: {
    label: 'Trails',
    table: 'trails',
    primaryLabel: 'name',
    description: 'Publish, feature and correct trail data. Route geometry is GeoJSON (LineString, [lng, lat]).',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text', required: true, help: 'Lowercase, hyphenated, unique.' },
      { name: 'region', label: 'Region', type: 'text', required: true },
      { name: 'destination_id', label: 'Destination ID', type: 'text', help: 'Copy an id from the Destinations tab.' },
      { name: 'summary', label: 'Summary', type: 'textarea', wide: true, required: true },
      { name: 'description', label: 'Description', type: 'textarea', wide: true, required: true },
      {
        name: 'difficulty',
        label: 'Difficulty',
        type: 'select',
        options: [
          { label: 'Easy', value: 'easy' },
          { label: 'Moderate', value: 'moderate' },
          { label: 'Hard', value: 'hard' },
          { label: 'Strenuous', value: 'strenuous' },
        ],
      },
      {
        name: 'activity',
        label: 'Activity',
        type: 'select',
        options: [
          { label: 'Trekking', value: 'trekking' },
          { label: 'Day hiking', value: 'hiking' },
          { label: 'Peak climbing', value: 'peak_climbing' },
          { label: 'Sightseeing', value: 'sightseeing' },
        ],
      },
      { name: 'distance_km', label: 'Distance (km)', type: 'number' },
      { name: 'duration_days', label: 'Duration (days)', type: 'number' },
      { name: 'max_elevation_m', label: 'Max elevation (m)', type: 'number' },
      { name: 'elevation_gain_m', label: 'Total ascent (m)', type: 'number' },
      { name: 'start_point_name', label: 'Start point', type: 'text' },
      { name: 'start_lat', label: 'Start latitude', type: 'number' },
      { name: 'start_lng', label: 'Start longitude', type: 'number' },
      { name: 'best_seasons', label: 'Best seasons', type: 'tags', help: 'spring, autumn, …', wide: true },
      { name: 'hero_image', label: 'Hero image URL', type: 'text', wide: true },
      { name: 'gallery', label: 'Gallery image URLs', type: 'tags', wide: true },
      {
        name: 'route_geojson',
        label: 'Route geometry (GeoJSON)',
        type: 'json',
        wide: true,
        help: '{"type":"LineString","coordinates":[[lng,lat],…]} — leave blank if unknown.',
      },
      {
        name: 'itinerary',
        label: 'Itinerary (JSON array)',
        type: 'json',
        wide: true,
        help: '[{"day":1,"title":"…","description":"…","altitudeM":2800}]',
      },
      { name: 'facilities', label: 'Facilities', type: 'tags', wide: true },
      { name: 'safety_notes', label: 'Safety notes', type: 'textarea', wide: true },
      { name: 'permit_info', label: 'Permit information', type: 'textarea', wide: true },
      { name: 'permits_required', label: 'Permit names', type: 'tags', wide: true },
      { name: 'is_sample', label: 'Sample / unverified data', type: 'checkbox' },
      { name: 'featured', label: 'Featured', type: 'checkbox' },
      { name: 'published', label: 'Published', type: 'checkbox' },
    ],
  },
  destinations: {
    label: 'Destinations',
    table: 'destinations',
    primaryLabel: 'name',
    description: 'Regions and parks shown on the Destinations page.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text', required: true },
      { name: 'region', label: 'Region', type: 'text', required: true },
      { name: 'tagline', label: 'Tagline', type: 'text', wide: true },
      { name: 'description', label: 'Description', type: 'textarea', wide: true, required: true },
      { name: 'hero_image', label: 'Hero image URL', type: 'text', wide: true },
      { name: 'best_seasons', label: 'Best seasons', type: 'tags', wide: true },
      { name: 'lat', label: 'Latitude', type: 'number' },
      { name: 'lng', label: 'Longitude', type: 'number' },
      { name: 'featured', label: 'Featured', type: 'checkbox' },
      { name: 'published', label: 'Published', type: 'checkbox' },
    ],
  },
  guides: {
    label: 'Guides',
    table: 'guides',
    primaryLabel: 'full_name',
    description: 'Guide and operator listings. Verify a listing before enabling the verified badge.',
    fields: [
      { name: 'full_name', label: 'Full name', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text', required: true },
      { name: 'region', label: 'Region', type: 'text', required: true },
      { name: 'languages', label: 'Languages', type: 'tags', wide: true },
      { name: 'specialties', label: 'Specialities', type: 'tags', wide: true },
      { name: 'experience_years', label: 'Experience (years)', type: 'number' },
      { name: 'day_rate_npr', label: 'Day rate (NPR)', type: 'number' },
      { name: 'bio', label: 'Bio', type: 'textarea', wide: true },
      { name: 'contact_email', label: 'Contact email', type: 'text' },
      { name: 'contact_phone', label: 'Contact phone', type: 'text' },
      { name: 'verified', label: 'Verified', type: 'checkbox' },
      { name: 'is_sample', label: 'Sample listing', type: 'checkbox' },
      { name: 'published', label: 'Published', type: 'checkbox' },
    ],
  },
  stays: {
    label: 'Stays',
    table: 'stays',
    primaryLabel: 'name',
    description: 'Teahouses, lodges, hotels and homestays.',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'slug', label: 'Slug', type: 'text', required: true },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        options: [
          { label: 'Teahouse', value: 'teahouse' },
          { label: 'Mountain lodge', value: 'lodge' },
          { label: 'Hotel', value: 'hotel' },
          { label: 'Homestay', value: 'homestay' },
        ],
      },
      { name: 'region', label: 'Region', type: 'text', required: true },
      { name: 'destination_id', label: 'Destination ID', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea', wide: true, required: true },
      { name: 'price_per_night_npr', label: 'Price per night (NPR)', type: 'number' },
      { name: 'amenities', label: 'Amenities', type: 'tags', wide: true },
      { name: 'photo_url', label: 'Photo URL', type: 'text', wide: true },
      { name: 'contact_email', label: 'Contact email', type: 'text' },
      { name: 'lat', label: 'Latitude', type: 'number' },
      { name: 'lng', label: 'Longitude', type: 'number' },
      { name: 'is_sample', label: 'Sample listing', type: 'checkbox' },
      { name: 'published', label: 'Published', type: 'checkbox' },
    ],
  },
  trail_reviews: {
    label: 'Reviews',
    table: 'trail_reviews',
    primaryLabel: 'title',
    description: 'Reviews are moderated: only approved reviews are visible publicly.',
    fields: [
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Pending', value: 'pending' },
          { label: 'Approved', value: 'approved' },
          { label: 'Rejected', value: 'rejected' },
        ],
      },
      { name: 'rating', label: 'Rating (1–5)', type: 'number' },
      { name: 'title', label: 'Title', type: 'text', wide: true },
      { name: 'body', label: 'Review', type: 'textarea', wide: true },
      { name: 'author_name', label: 'Author', type: 'text' },
    ],
  },
  inquiries: {
    label: 'Inquiries',
    table: 'inquiries',
    primaryLabel: 'name',
    description: 'Guide and stay inquiry messages. Delivery by email is not configured — this inbox is the record.',
    readOnly: true,
    fields: [
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'New', value: 'new' },
          { label: 'Read', value: 'read' },
          { label: 'Closed', value: 'closed' },
        ],
      },
    ],
  },
  contact_messages: {
    label: 'Contact messages',
    table: 'contact_messages',
    primaryLabel: 'name',
    description: 'Messages sent through the public contact form.',
    readOnly: true,
    fields: [],
  },
};

/** Fields that are generated by the database and must not be written by the admin UI. */
const SERVER_MANAGED = new Set([
  'id',
  'created_at',
  'updated_at',
  'created_by',
  'user_id',
  'avg_rating',
  'review_count',
  'trip_days',
]);

export type AdminRow = Record<string, unknown>;

export async function adminList(entity: AdminEntity): Promise<AdminRow[]> {
  const db = requireSupabase();
  const orderColumn = entity === 'trail_reviews' ? 'created_at' : 'created_at';
  const { data, error } = await db.from(entity).select('*').order(orderColumn, { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as AdminRow[];
}

export async function adminSave(
  entity: AdminEntity,
  values: Record<string, unknown>,
  id: string | null,
  userId: string,
): Promise<void> {
  const db = requireSupabase();
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (!SERVER_MANAGED.has(key)) clean[key] = value;
  }

  if (id) {
    const { error } = await db.from(entity).update(clean).eq('id', id);
    if (error) throw error;
    return;
  }

  if (['trails', 'destinations', 'guides', 'stays'].includes(entity)) {
    clean.created_by = userId;
  }
  const { error } = await db.from(entity).insert(clean);
  if (error) throw error;
}

export async function adminDelete(entity: AdminEntity, id: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from(entity).delete().eq('id', id);
  if (error) throw error;
}

export async function adminSetPublished(entity: 'trails' | 'destinations' | 'guides' | 'stays', id: string, published: boolean) {
  const db = requireSupabase();
  const { error } = await db.from(entity).update({ published }).eq('id', id);
  if (error) throw error;
}

export interface AdminCounts {
  trails: number;
  destinations: number;
  guides: number;
  stays: number;
  pendingReviews: number;
  inquiries: number;
  users: number;
}

export async function adminCounts(): Promise<AdminCounts> {
  const db = requireSupabase();
  const countOf = async (table: string, filter?: { column: string; value: string }) => {
    let query = db.from(table).select('id', { count: 'exact', head: true });
    if (filter) query = query.eq(filter.column, filter.value);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  };

  const [trails, destinations, guides, stays, pendingReviews, inquiries, users] = await Promise.all([
    countOf('trails'),
    countOf('destinations'),
    countOf('guides'),
    countOf('stays'),
    countOf('trail_reviews', { column: 'status', value: 'pending' }),
    countOf('inquiries'),
    countOf('profiles'),
  ]);

  return { trails, destinations, guides, stays, pendingReviews, inquiries, users };
}

/** Value conversion for the generated admin form. */
export function toFormValue(field: AdminField, raw: unknown): string | boolean {
  if (field.type === 'checkbox') return Boolean(raw);
  if (field.type === 'tags') return Array.isArray(raw) ? raw.join(', ') : '';
  if (field.type === 'json') return raw ? JSON.stringify(raw, null, 2) : '';
  if (field.type === 'date') return typeof raw === 'string' ? raw.slice(0, 10) : '';
  if (raw === null || raw === undefined) return '';
  return String(raw);
}

export function fromFormValue(field: AdminField, value: string | boolean): unknown {
  if (field.type === 'checkbox') return Boolean(value);
  const text = String(value).trim();
  if (field.type === 'number') return text === '' ? null : Number(text);
  if (field.type === 'tags') {
    return text
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);
  }
  if (field.type === 'json') {
    if (!text) return null;
    return JSON.parse(text) as unknown;
  }
  if (field.type === 'date') return text || null;
  return text === '' ? null : text;
}
