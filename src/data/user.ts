import { requireSupabase } from '@/lib/supabase';
import { mapProfile, mapReview, mapSavedTrail, mapTrip, type DbRow } from './mappers';
import type {
  Collection,
  Inquiry,
  InquirySubject,
  Profile,
  Review,
  SavedTrail,
  Trip,
  TripDay,
  TripItem,
} from '@/lib/types';

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const db = requireSupabase();
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ? mapProfile(data as DbRow) : null;
}

export interface ProfilePatch {
  fullName?: string;
  bio?: string | null;
  homeRegion?: string | null;
  preferredDifficulty?: string | null;
  preferredActivity?: string | null;
  preferredSeason?: string | null;
  avatarUrl?: string | null;
}

export async function saveProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
  const db = requireSupabase();
  const values: Record<string, unknown> = { id: userId };
  if (patch.fullName !== undefined) values.full_name = patch.fullName;
  if (patch.bio !== undefined) values.bio = patch.bio || null;
  if (patch.homeRegion !== undefined) values.home_region = patch.homeRegion || null;
  if (patch.preferredDifficulty !== undefined) values.preferred_difficulty = patch.preferredDifficulty || null;
  if (patch.preferredActivity !== undefined) values.preferred_activity = patch.preferredActivity || null;
  if (patch.preferredSeason !== undefined) values.preferred_season = patch.preferredSeason || null;
  if (patch.avatarUrl !== undefined) values.avatar_url = patch.avatarUrl || null;

  const { data, error } = await db.from('profiles').upsert(values).select().single();
  if (error) throw error;
  return mapProfile(data as DbRow);
}

/* -------------------------------------------------------------------------- */
/* Saved trails + collections                                                 */
/* -------------------------------------------------------------------------- */

export async function fetchSavedTrails(userId: string): Promise<SavedTrail[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('saved_trails')
    .select('trail_id, note, collection_id, created_at, trails(slug, name, region, hero_image, difficulty, distance_km, duration_days)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(mapSavedTrail);
}

export async function addSavedTrail(
  userId: string,
  trailId: string,
  note: string | null = null,
  collectionId: string | null = null,
): Promise<void> {
  const db = requireSupabase();
  const { error } = await db
    .from('saved_trails')
    .upsert({ user_id: userId, trail_id: trailId, note, collection_id: collectionId }, { onConflict: 'user_id,trail_id' });
  if (error) throw error;
}

export async function updateSavedTrail(
  userId: string,
  trailId: string,
  patch: { note?: string | null; collectionId?: string | null },
): Promise<void> {
  const db = requireSupabase();
  const values: Record<string, unknown> = {};
  if (patch.note !== undefined) values.note = patch.note;
  if (patch.collectionId !== undefined) values.collection_id = patch.collectionId;
  if (Object.keys(values).length === 0) return;
  const { error } = await db.from('saved_trails').update(values).eq('user_id', userId).eq('trail_id', trailId);
  if (error) throw error;
}

export async function removeSavedTrail(userId: string, trailId: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('saved_trails').delete().eq('user_id', userId).eq('trail_id', trailId);
  if (error) throw error;
}

export async function fetchCollections(userId: string): Promise<Collection[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('collections')
    .select('id, name, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    createdAt: String(row.created_at),
  }));
}

export async function createCollection(userId: string, name: string): Promise<Collection> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('collections')
    .insert({ user_id: userId, name })
    .select('id, name, description, created_at')
    .single();
  if (error) throw error;
  const row = data as DbRow;
  return {
    id: String(row.id),
    name: String(row.name),
    description: (row.description as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function deleteCollection(userId: string, collectionId: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('collections').delete().eq('id', collectionId).eq('user_id', userId);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/* Trips                                                                      */
/* -------------------------------------------------------------------------- */

const TRIP_SELECT =
  'id, title, start_date, end_date, travelers, budget_npr, notes, created_at, updated_at, trip_days(id, trip_id, day_number, date, title, notes, trip_items(id, trip_day_id, trail_id, title, start_time, notes, estimated_cost_npr, trails(slug)))';

export async function fetchTrips(userId: string): Promise<Trip[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('trips')
    .select(TRIP_SELECT)
    .eq('user_id', userId)
    .order('start_date', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(mapTrip);
}

export async function fetchTrip(userId: string, tripId: string): Promise<Trip | null> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('trips')
    .select(TRIP_SELECT)
    .eq('id', tripId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTrip(data as DbRow) : null;
}

export interface TripInput {
  title: string;
  startDate: string | null;
  endDate: string | null;
  travelers: number;
  budgetNpr: number | null;
  notes: string | null;
}

export async function createTrip(userId: string, input: TripInput): Promise<Trip> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('trips')
    .insert({
      user_id: userId,
      title: input.title,
      start_date: input.startDate,
      end_date: input.endDate,
      travelers: input.travelers,
      budget_npr: input.budgetNpr,
      notes: input.notes,
    })
    .select('id')
    .single();
  if (error) throw error;
  const tripId = String((data as DbRow).id);

  // Start every trip with a first day so the planner is immediately usable.
  const { error: dayError } = await db.from('trip_days').insert({
    trip_id: tripId,
    day_number: 1,
    date: input.startDate,
    title: 'Day 1',
    notes: null,
  });
  if (dayError) throw dayError;

  const created = await fetchTrip(userId, tripId);
  if (!created) throw new Error('Trip was created but could not be read back.');
  return created;
}

export async function updateTrip(
  userId: string,
  tripId: string,
  patch: Partial<TripInput>,
): Promise<void> {
  const db = requireSupabase();
  const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.startDate !== undefined) values.start_date = patch.startDate;
  if (patch.endDate !== undefined) values.end_date = patch.endDate;
  if (patch.travelers !== undefined) values.travelers = patch.travelers;
  if (patch.budgetNpr !== undefined) values.budget_npr = patch.budgetNpr;
  if (patch.notes !== undefined) values.notes = patch.notes;
  const { error } = await db.from('trips').update(values).eq('id', tripId).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('trips').delete().eq('id', tripId).eq('user_id', userId);
  if (error) throw error;
}

export async function addTripDay(
  userId: string,
  tripId: string,
  input: { dayNumber: number; date?: string | null; title: string; notes?: string | null },
): Promise<TripDay> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('trip_days')
    .insert({
      trip_id: tripId,
      day_number: input.dayNumber,
      date: input.date ?? null,
      title: input.title,
      notes: input.notes ?? null,
      user_id: userId,
    })
    .select('id, trip_id, day_number, date, title, notes')
    .single();
  if (error) throw error;
  const row = data as DbRow;
  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    dayNumber: Number(row.day_number),
    date: (row.date as string | null) ?? null,
    title: String(row.title),
    notes: (row.notes as string | null) ?? null,
    items: [],
  };
}

export async function updateTripDay(
  userId: string,
  dayId: string,
  patch: { date?: string | null; title?: string; notes?: string | null },
): Promise<void> {
  const db = requireSupabase();
  const values: Record<string, unknown> = {};
  if (patch.date !== undefined) values.date = patch.date;
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.notes !== undefined) values.notes = patch.notes;
  if (Object.keys(values).length === 0) return;
  const { error } = await db.from('trip_days').update(values).eq('id', dayId).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteTripDay(userId: string, dayId: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('trip_days').delete().eq('id', dayId).eq('user_id', userId);
  if (error) throw error;
}

export async function addTripItem(
  userId: string,
  dayId: string,
  input: { title: string; trailId?: string | null; startTime?: string | null; notes?: string | null; estimatedCostNpr?: number | null },
): Promise<TripItem> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('trip_items')
    .insert({
      trip_day_id: dayId,
      trail_id: input.trailId ?? null,
      title: input.title,
      start_time: input.startTime ?? null,
      notes: input.notes ?? null,
      estimated_cost_npr: input.estimatedCostNpr ?? null,
      user_id: userId,
    })
    .select('id, trip_day_id, trail_id, title, start_time, notes, estimated_cost_npr')
    .single();
  if (error) throw error;
  const row = data as DbRow;
  return {
    id: String(row.id),
    tripDayId: String(row.trip_day_id),
    trailId: (row.trail_id as string | null) ?? null,
    title: String(row.title),
    startTime: (row.start_time as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    estimatedCostNpr: row.estimated_cost_npr === null ? null : Number(row.estimated_cost_npr),
  };
}

export async function deleteTripItem(userId: string, itemId: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('trip_items').delete().eq('id', itemId).eq('user_id', userId);
  if (error) throw error;
}

/* -------------------------------------------------------------------------- */
/* Reviews, inquiries, contact                                                */
/* -------------------------------------------------------------------------- */

export interface ReviewInput {
  trailId: string;
  rating: number;
  title: string | null;
  body: string;
  visitedOn: string | null;
  authorName: string;
}

export async function createReview(userId: string, input: ReviewInput): Promise<Review> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('trail_reviews')
    .insert({
      trail_id: input.trailId,
      user_id: userId,
      rating: input.rating,
      title: input.title,
      body: input.body,
      visited_on: input.visitedOn,
      author_name: input.authorName,
      status: 'pending',
    })
    .select('id, trail_id, user_id, author_name, rating, title, body, visited_on, status, created_at')
    .single();
  if (error) throw error;
  return mapReview(data as DbRow);
}

export async function createInquiry(input: {
  userId: string;
  subjectType: InquirySubject;
  subjectId: string;
  name: string;
  email: string;
  message: string;
}): Promise<Inquiry> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('inquiries')
    .insert({
      user_id: input.userId,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      name: input.name,
      email: input.email,
      message: input.message,
    })
    .select('id, user_id, subject_type, subject_id, name, email, message, status, created_at')
    .single();
  if (error) throw error;
  const row = data as DbRow;
  return {
    id: String(row.id),
    userId: String(row.user_id),
    subjectType: row.subject_type as Inquiry['subjectType'],
    subjectId: String(row.subject_id),
    name: String(row.name),
    email: String(row.email),
    message: String(row.message),
    status: 'new',
    createdAt: String(row.created_at),
  };
}

export async function createContactMessage(input: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('contact_messages').insert(input);
  if (error) throw error;
}
