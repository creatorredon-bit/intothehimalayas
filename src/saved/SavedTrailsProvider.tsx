import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { addSavedTrail, fetchCollections, fetchSavedTrails, removeSavedTrail } from '@/data/user';
import { describeError } from '@/lib/supabase';
import type { Collection, SavedTrail, Trail } from '@/lib/types';

const GUEST_KEY = 'ith-saved-trails-v1';

interface SavedContextValue {
  saved: SavedTrail[];
  collections: Collection[];
  loading: boolean;
  error: string | null;
  isGuest: boolean;
  count: number;
  isSaved: (trailId: string) => boolean;
  toggle: (trail: Trail) => Promise<{ saved: boolean; error?: string }>;
  remove: (trailId: string) => Promise<{ error?: string }>;
  refresh: () => Promise<void>;
  refreshCollections: () => Promise<void>;
}

const SavedContext = createContext<SavedContextValue | null>(null);

function readGuestSaved(): SavedTrail[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedTrail => Boolean(item) && typeof item === 'object' && typeof (item as SavedTrail).trailId === 'string',
    );
  } catch {
    return [];
  }
}

function writeGuestSaved(saved: SavedTrail[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(saved));
  } catch {
    // Ignore storage failures; the in-memory state still works for this session.
  }
}

export function SavedTrailsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedTrail[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCollections = useCallback(async () => {
    if (!user) {
      setCollections([]);
      return;
    }
    try {
      setCollections(await fetchCollections(user.id));
    } catch {
      setCollections([]);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!user) {
      setSaved(readGuestSaved());
      setLoading(false);
      return;
    }
    try {
      setSaved(await fetchSavedTrails(user.id));
    } catch (err) {
      setError(describeError(err, 'Could not load your saved trails.'));
      setSaved([]);
    } finally {
      setLoading(false);
    }
    void refreshCollections();
  }, [refreshCollections, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isSaved = useCallback((trailId: string) => saved.some((item) => item.trailId === trailId), [saved]);

  const remove = useCallback(
    async (trailId: string): Promise<{ error?: string }> => {
      if (!user) {
        const next = readGuestSaved().filter((item) => item.trailId !== trailId);
        writeGuestSaved(next);
        setSaved(next);
        return {};
      }
      try {
        await removeSavedTrail(user.id, trailId);
        setSaved((prev) => prev.filter((item) => item.trailId !== trailId));
        return {};
      } catch (err) {
        return { error: describeError(err, 'Could not remove this trail.') };
      }
    },
    [user],
  );

  const toggle = useCallback(
    async (trail: Trail): Promise<{ saved: boolean; error?: string }> => {
      const alreadySaved = saved.some((item) => item.trailId === trail.id);
      if (alreadySaved) {
        const result = await remove(trail.id);
        return { saved: false, error: result.error };
      }

      const entry: SavedTrail = {
        trailId: trail.id,
        slug: trail.slug,
        name: trail.name,
        region: trail.region,
        heroImage: trail.heroImage,
        difficulty: trail.difficulty,
        distanceKm: trail.distanceKm,
        durationDays: trail.durationDays,
        note: null,
        collectionId: null,
        savedAt: new Date().toISOString(),
      };

      if (!user) {
        const next = [entry, ...readGuestSaved()];
        writeGuestSaved(next);
        setSaved(next);
        return { saved: true };
      }

      try {
        await addSavedTrail(user.id, trail.id);
        setSaved((prev) => [entry, ...prev]);
        return { saved: true };
      } catch (err) {
        return { saved: false, error: describeError(err, 'Could not save this trail.') };
      }
    },
    [remove, saved, user],
  );

  const value = useMemo<SavedContextValue>(
    () => ({
      saved,
      collections,
      loading,
      error,
      isGuest: !user,
      count: saved.length,
      isSaved,
      toggle,
      remove,
      refresh,
      refreshCollections,
    }),
    [saved, collections, loading, error, user, isSaved, toggle, remove, refresh, refreshCollections],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSavedTrails(): SavedContextValue {
  const context = useContext(SavedContext);
  if (!context) throw new Error('useSavedTrails must be used inside <SavedTrailsProvider>');
  return context;
}
