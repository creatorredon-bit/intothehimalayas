import type { Trip, TripDay, TripItem } from '@/lib/types';

/**
 * Guest trip planner storage.
 *
 * Signed-in users get trips in Postgres (via `src/data/user.ts` and RLS).
 * Signed-out visitors can still plan a trip; it is stored in this browser only
 * and the UI says so. This is local persistence, not authentication.
 */
const STORAGE_KEY = 'ith-local-trips-v1';

const newId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `local-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
};

const now = () => new Date().toISOString();

function isTripArray(value: unknown): value is Trip[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as Trip).id === 'string' &&
        typeof (item as Trip).title === 'string',
    )
  );
}

export function readLocalTrips(): Trip[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isTripArray(parsed)) return [];
    return parsed.map((trip) => ({ ...trip, isLocal: true }));
  } catch {
    return [];
  }
}

export function writeLocalTrips(trips: Trip[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch {
    // Storage can be unavailable (private mode / quota); the UI stays usable.
  }
}

export interface LocalTripInput {
  title: string;
  startDate: string | null;
  endDate: string | null;
  travelers: number;
  budgetNpr: number | null;
  notes: string | null;
}

export function createLocalTrip(input: LocalTripInput): Trip {
  const id = newId();
  const createdAt = now();
  const trip: Trip = {
    id,
    title: input.title,
    startDate: input.startDate,
    endDate: input.endDate,
    travelers: input.travelers,
    budgetNpr: input.budgetNpr,
    notes: input.notes,
    createdAt,
    updatedAt: createdAt,
    isLocal: true,
    days: [
      {
        id: newId(),
        tripId: id,
        dayNumber: 1,
        date: input.startDate,
        title: 'Day 1',
        notes: null,
        items: [],
      },
    ],
  };
  const trips = [trip, ...readLocalTrips()];
  writeLocalTrips(trips);
  return trip;
}

function mutate(id: string, updater: (trip: Trip) => Trip): Trip[] {
  const trips = readLocalTrips().map((trip) => (trip.id === id ? { ...updater(trip), updatedAt: now() } : trip));
  writeLocalTrips(trips);
  return trips;
}

export function updateLocalTrip(id: string, patch: Partial<LocalTripInput>): Trip[] {
  return mutate(id, (trip) => ({
    ...trip,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.startDate !== undefined ? { startDate: patch.startDate } : {}),
    ...(patch.endDate !== undefined ? { endDate: patch.endDate } : {}),
    ...(patch.travelers !== undefined ? { travelers: patch.travelers } : {}),
    ...(patch.budgetNpr !== undefined ? { budgetNpr: patch.budgetNpr } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  }));
}

export function deleteLocalTrip(id: string): Trip[] {
  const trips = readLocalTrips().filter((trip) => trip.id !== id);
  writeLocalTrips(trips);
  return trips;
}

export function addLocalTripDay(tripId: string, input: { date?: string | null; title: string }): Trip[] {
  return mutate(tripId, (trip) => {
    const day: TripDay = {
      id: newId(),
      tripId,
      dayNumber: (trip.days.at(-1)?.dayNumber ?? 0) + 1,
      date: input.date ?? null,
      title: input.title,
      notes: null,
      items: [],
    };
    return { ...trip, days: [...trip.days, day] };
  });
}

export function updateLocalTripDay(
  tripId: string,
  dayId: string,
  patch: { title?: string; notes?: string | null; date?: string | null },
): Trip[] {
  return mutate(tripId, (trip) => ({
    ...trip,
    days: trip.days.map((day) => (day.id === dayId ? { ...day, ...patch } : day)),
  }));
}

export function deleteLocalTripDay(tripId: string, dayId: string): Trip[] {
  return mutate(tripId, (trip) => ({
    ...trip,
    days: trip.days.filter((day) => day.id !== dayId).map((day, index) => ({ ...day, dayNumber: index + 1 })),
  }));
}

export function addLocalTripItem(
  tripId: string,
  dayId: string,
  input: { title: string; trailId?: string | null; startTime?: string | null; notes?: string | null; estimatedCostNpr?: number | null },
): Trip[] {
  return mutate(tripId, (trip) => ({
    ...trip,
    days: trip.days.map((day) => {
      if (day.id !== dayId) return day;
      const item: TripItem = {
        id: newId(),
        tripDayId: dayId,
        trailId: input.trailId ?? null,
        title: input.title,
        startTime: input.startTime ?? null,
        notes: input.notes ?? null,
        estimatedCostNpr: input.estimatedCostNpr ?? null,
      };
      return { ...day, items: [...day.items, item] };
    }),
  }));
}

export function deleteLocalTripItem(tripId: string, dayId: string, itemId: string): Trip[] {
  return mutate(tripId, (trip) => ({
    ...trip,
    days: trip.days.map((day) =>
      day.id === dayId ? { ...day, items: day.items.filter((item) => item.id !== itemId) } : day,
    ),
  }));
}
