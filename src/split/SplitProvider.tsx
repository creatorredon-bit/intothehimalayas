import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { describeError } from '@/lib/supabase';
import {
  addLocalExpense,
  addLocalMember,
  createLocalGroup,
  deleteLocalExpense,
  deleteLocalGroup,
  readLocalGroups,
  removeLocalMember,
  type GroupInput,
} from '@/data/localSplits';
import {
  addSplitExpense,
  addSplitMember,
  createSplitGroup,
  deleteSplitExpense,
  deleteSplitGroup,
  fetchSplitGroups,
  removeSplitMember,
  type SplitExpenseInput,
} from '@/data/splits';
import type { SplitGroup } from '@/lib/types';

interface SplitContextValue {
  groups: SplitGroup[];
  loading: boolean;
  error: string | null;
  isGuest: boolean;
  refresh: () => Promise<void>;
  createGroup: (input: GroupInput) => Promise<SplitGroup>;
  deleteGroup: (groupId: string) => Promise<void>;
  addMember: (groupId: string, member: { name: string; email: string | null }) => Promise<void>;
  removeMember: (groupId: string, memberId: string) => Promise<void>;
  addExpense: (groupId: string, input: SplitExpenseInput) => Promise<void>;
  deleteExpense: (groupId: string, expenseId: string) => Promise<void>;
  canEdit: (group: SplitGroup) => boolean;
}

const SplitContext = createContext<SplitContextValue | null>(null);

/**
 * One interface for the cost splitter: Supabase when signed in, localStorage for
 * guests. Groups shared by email are read-only for the invited member.
 */
export function SplitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<SplitGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (user) {
        setGroups(await fetchSplitGroups());
      } else {
        setGroups(readLocalGroups());
      }
    } catch (err) {
      setError(describeError(err, 'Could not load your split groups.'));
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createGroup = useCallback(
    async (input: GroupInput): Promise<SplitGroup> => {
      if (user) {
        const groupId = await createSplitGroup(user.id, input);
        const roster = await fetchSplitGroups();
        setGroups(roster);
        const created = roster.find((group) => group.id === groupId);
        if (created) return created;
        throw new Error('The group was created but could not be read back.');
      }
      const group = createLocalGroup(input);
      setGroups(readLocalGroups());
      return group;
    },
    [user],
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      if (user) {
        await deleteSplitGroup(groupId);
        setGroups((prev) => prev.filter((group) => group.id !== groupId));
      } else {
        setGroups(deleteLocalGroup(groupId));
      }
    },
    [user],
  );

  const addMember = useCallback(
    async (groupId: string, member: { name: string; email: string | null }) => {
      if (user) {
        await addSplitMember(groupId, member);
        setGroups(await fetchSplitGroups());
      } else {
        setGroups(addLocalMember(groupId, member));
      }
    },
    [user],
  );

  const removeMember = useCallback(
    async (groupId: string, memberId: string) => {
      if (user) {
        await removeSplitMember(groupId, memberId);
        setGroups(await fetchSplitGroups());
      } else {
        setGroups(removeLocalMember(groupId, memberId));
      }
    },
    [user],
  );

  const addExpense = useCallback(
    async (groupId: string, input: SplitExpenseInput) => {
      if (user) {
        await addSplitExpense(groupId, user.id, input);
        setGroups(await fetchSplitGroups());
      } else {
        setGroups(addLocalExpense(groupId, input));
      }
    },
    [user],
  );

  const deleteExpense = useCallback(
    async (groupId: string, expenseId: string) => {
      if (user) {
        await deleteSplitExpense(groupId, expenseId);
        setGroups(await fetchSplitGroups());
      } else {
        setGroups(deleteLocalExpense(groupId, expenseId));
      }
    },
    [user],
  );

  const canEdit = useCallback((group: SplitGroup) => !user || group.ownerId === user.id, [user]);

  const value = useMemo<SplitContextValue>(
    () => ({
      groups,
      loading,
      error,
      isGuest: !user,
      refresh,
      createGroup,
      deleteGroup,
      addMember,
      removeMember,
      addExpense,
      deleteExpense,
      canEdit,
    }),
    [groups, loading, error, user, refresh, createGroup, deleteGroup, addMember, removeMember, addExpense, deleteExpense, canEdit],
  );

  return <SplitContext.Provider value={value}>{children}</SplitContext.Provider>;
}

export function useSplit(): SplitContextValue {
  const context = useContext(SplitContext);
  if (!context) throw new Error('useSplit must be used inside <SplitProvider>');
  return context;
}
