import type { SplitExpense, SplitGroup, SplitMember } from '@/lib/types';

/**
 * Guest split storage.
 *
 * Signed-in users get groups in Postgres (via `src/data/splits.ts` and RLS).
 * Signed-out visitors can still split a bill; it lives in this browser only and
 * the UI says so. This is local persistence, not authentication or sharing.
 */
const STORAGE_KEY = 'ith-split-groups-v1';

export const newId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `local-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
};

const now = () => new Date().toISOString();

function isGroupArray(value: unknown): value is SplitGroup[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as SplitGroup).id === 'string' &&
        typeof (item as SplitGroup).title === 'string' &&
        Array.isArray((item as SplitGroup).members) &&
        Array.isArray((item as SplitGroup).expenses),
    )
  );
}

export function readLocalGroups(): SplitGroup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isGroupArray(parsed)) return [];
    return parsed.map((group) => ({ ...group, isLocal: true }));
  } catch {
    return [];
  }
}

export function writeLocalGroups(groups: SplitGroup[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch {
    // Storage can be unavailable (private mode / quota); the UI stays usable.
  }
}

export interface GroupInput {
  title: string;
  notes: string | null;
  members: { name: string; email: string | null }[];
}

export function createLocalGroup(input: GroupInput): SplitGroup {
  const id = newId();
  const createdAt = now();
  const group: SplitGroup = {
    id,
    title: input.title,
    notes: input.notes,
    ownerId: 'local',
    createdAt,
    isLocal: true,
    members: input.members.map((member) => ({
      id: newId(),
      groupId: id,
      name: member.name,
      email: member.email,
    })),
    expenses: [],
  };
  writeLocalGroups([group, ...readLocalGroups()]);
  return group;
}

function mutate(groupId: string, updater: (group: SplitGroup) => SplitGroup): SplitGroup[] {
  const groups = readLocalGroups().map((group) => (group.id === groupId ? updater(group) : group));
  writeLocalGroups(groups);
  return groups;
}

export function deleteLocalGroup(groupId: string): SplitGroup[] {
  const groups = readLocalGroups().filter((group) => group.id !== groupId);
  writeLocalGroups(groups);
  return groups;
}

export function addLocalMember(groupId: string, member: { name: string; email: string | null }): SplitGroup[] {
  return mutate(groupId, (group) => ({
    ...group,
    members: [...group.members, { id: newId(), groupId, name: member.name, email: member.email }],
  }));
}

export function removeLocalMember(groupId: string, memberId: string): SplitGroup[] {
  return mutate(groupId, (group) => ({
    ...group,
    members: group.members.filter((member) => member.id !== memberId),
    expenses: group.expenses.filter(
      (expense) => expense.paidByMemberId !== memberId && !expense.participantIds.includes(memberId),
    ),
  }));
}

export function addLocalExpense(
  groupId: string,
  input: { title: string; amountNpr: number; paidByMemberId: string; participantIds: string[]; spentOn: string | null },
): SplitGroup[] {
  return mutate(groupId, (group) => {
    const expense: SplitExpense = {
      id: newId(),
      groupId,
      title: input.title,
      amountNpr: input.amountNpr,
      paidByMemberId: input.paidByMemberId,
      participantIds: input.participantIds,
      spentOn: input.spentOn,
      createdAt: now(),
    };
    return { ...group, expenses: [expense, ...group.expenses] };
  });
}

export function deleteLocalExpense(groupId: string, expenseId: string): SplitGroup[] {
  return mutate(groupId, (group) => ({
    ...group,
    expenses: group.expenses.filter((expense) => expense.id !== expenseId),
  }));
}

export function memberName(group: SplitGroup, memberId: string): string {
  return group.members.find((member: SplitMember) => member.id === memberId)?.name ?? 'Someone';
}
