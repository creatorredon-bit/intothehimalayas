import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import {
  addLocalTripDay as localAddDay,
  addLocalTripItem as localAddItem,
  createLocalTrip,
  deleteLocalTrip,
  deleteLocalTripDay as localDeleteDay,
  deleteLocalTripItem as localDeleteItem,
  readLocalTrips,
  updateLocalTrip,
  updateLocalTripDay as localUpdateDay,
} from '@/data/localTrips';
import {
  addTripDay,
  addTripItem,
  createTrip,
  deleteTrip,
  deleteTripDay,
  deleteTripItem,
  fetchTrips,
  updateTrip,
  updateTripDay,
  type TripInput,
} from '@/data/user';
import { describeError } from '@/lib/supabase';
import type { Trip } from '@/lib/types';

/**
 * One interface for the planner, backed by Supabase when signed in and by
 * localStorage when browsing as a guest.
 */
export function useTrips() {
  const { user, configured } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isGuest = !user;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (user) {
        setTrips(await fetchTrips(user.id));
      } else {
        setTrips(readLocalTrips());
      }
    } catch (err) {
      setError(describeError(err, 'Could not load your trips.'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: TripInput): Promise<Trip> => {
      if (user) {
        const trip = await createTrip(user.id, input);
        setTrips((prev) => [...prev, trip]);
        return trip;
      }
      const trip = createLocalTrip(input);
      setTrips(readLocalTrips());
      return trip;
    },
    [user],
  );

  const update = useCallback(
    async (tripId: string, patch: Partial<TripInput>) => {
      if (user) {
        await updateTrip(user.id, tripId, patch);
        setTrips(await fetchTrips(user.id));
      } else {
        setTrips(updateLocalTrip(tripId, patch));
      }
    },
    [user],
  );

  const remove = useCallback(
    async (tripId: string) => {
      if (user) {
        await deleteTrip(user.id, tripId);
        setTrips((prev) => prev.filter((trip) => trip.id !== tripId));
      } else {
        setTrips(deleteLocalTrip(tripId));
      }
    },
    [user],
  );

  const addDay = useCallback(
    async (trip: Trip, input: { title: string; date?: string | null }) => {
      if (user) {
        await addTripDay(user.id, trip.id, {
          dayNumber: (trip.days.at(-1)?.dayNumber ?? 0) + 1,
          title: input.title,
          date: input.date ?? null,
        });
        setTrips(await fetchTrips(user.id));
      } else {
        setTrips(localAddDay(trip.id, input));
      }
    },
    [user],
  );

  const updateDay = useCallback(
    async (tripId: string, dayId: string, patch: { title?: string; notes?: string | null; date?: string | null }) => {
      if (user) {
        await updateTripDay(user.id, dayId, patch);
        setTrips(await fetchTrips(user.id));
      } else {
        setTrips(localUpdateDay(tripId, dayId, patch));
      }
    },
    [user],
  );

  const removeDay = useCallback(
    async (tripId: string, dayId: string) => {
      if (user) {
        await deleteTripDay(user.id, dayId);
        setTrips(await fetchTrips(user.id));
      } else {
        setTrips(localDeleteDay(tripId, dayId));
      }
    },
    [user],
  );

  const addItem = useCallback(
    async (
      tripId: string,
      dayId: string,
      input: { title: string; trailId?: string | null; startTime?: string | null; notes?: string | null; estimatedCostNpr?: number | null },
    ) => {
      if (user) {
        await addTripItem(user.id, dayId, input);
        setTrips(await fetchTrips(user.id));
      } else {
        setTrips(localAddItem(tripId, dayId, input));
      }
    },
    [user],
  );

  const removeItem = useCallback(
    async (tripId: string, dayId: string, itemId: string) => {
      if (user) {
        await deleteTripItem(user.id, itemId);
        setTrips(await fetchTrips(user.id));
      } else {
        setTrips(localDeleteItem(tripId, dayId, itemId));
      }
    },
    [user],
  );

  const sortedTrips = useMemo(
    () =>
      [...trips].sort((a, b) => {
        const aKey = a.startDate ?? a.createdAt;
        const bKey = b.startDate ?? b.createdAt;
        return aKey.localeCompare(bKey);
      }),
    [trips],
  );

  return {
    trips: sortedTrips,
    loading,
    error,
    isGuest,
    canPersistRemotely: Boolean(user) && configured,
    refresh,
    create,
    update,
    remove,
    addDay,
    updateDay,
    removeDay,
    addItem,
    removeItem,
  };
}
