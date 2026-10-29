import { requireSupabase } from '@/lib/supabase';
import type { DbRow } from './mappers';
import type { SplitExpense, SplitGroup, SplitMember } from '@/lib/types';

/**
 * Cloud-backed cost splitting.
 *
 * Every read is scoped by Row Level Security: a group is visible to its owner and
 * to anyone whose account email matches a member email the owner added. Only the
 * owner can add or remove members, bills and the group itself.
 */

const GROUP_SELECT =
  'id, title, notes, owner_id, created_at, split_members(id, name, email), split_expenses(id, title, amount_npr, paid_by_member_id, spent_on, created_at, split_expense_participants(member_id))';

function mapGroup(row: DbRow): SplitGroup {
  const groupId = String(row.id);
  const members = ((row.split_members ?? []) as DbRow[]).map<SplitMember>((member) => ({
    id: String(member.id),
    groupId,
    name: String(member.name),
    email: (member.email as string | null) ?? null,
  }));

  const expenses = ((row.split_expenses ?? []) as DbRow[]).map<SplitExpense>((expense) => ({
    id: String(expense.id),
    groupId,
    title: String(expense.title),
    amountNpr: Number(expense.amount_npr ?? 0),
    paidByMemberId: String(expense.paid_by_member_id),
    participantIds: ((expense.split_expense_participants ?? []) as DbRow[]).map((participant) =>
      String(participant.member_id),
    ),
    spentOn: (expense.spent_on as string | null) ?? null,
    createdAt: String(expense.created_at),
  }));

  expenses.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    id: groupId,
    title: String(row.title),
    notes: (row.notes as string | null) ?? null,
    ownerId: String(row.owner_id),
    createdAt: String(row.created_at),
    members,
    expenses,
  };
}

export async function fetchSplitGroups(): Promise<SplitGroup[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('split_groups')
    .select(GROUP_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as DbRow[]).map(mapGroup);
}

export interface SplitGroupInput {
  title: string;
  notes: string | null;
  members: { name: string; email: string | null }[];
}

export async function createSplitGroup(ownerId: string, input: SplitGroupInput): Promise<string> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('split_groups')
    .insert({ owner_id: ownerId, title: input.title, notes: input.notes })
    .select('id')
    .single();
  if (error) throw error;

  const groupId = String((data as DbRow).id);
  if (input.members.length > 0) {
    const { error: memberError } = await db.from('split_members').insert(
      input.members.map((member) => ({
        group_id: groupId,
        name: member.name,
        email: member.email ? member.email.toLowerCase() : null,
      })),
    );
    if (memberError) {
      // Do not leave a half-created group behind.
      await db.from('split_groups').delete().eq('id', groupId);
      throw memberError;
    }
  }
  return groupId;
}

export async function deleteSplitGroup(groupId: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('split_groups').delete().eq('id', groupId);
  if (error) throw error;
}

export async function addSplitMember(
  groupId: string,
  member: { name: string; email: string | null },
): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('split_members').insert({
    group_id: groupId,
    name: member.name,
    email: member.email ? member.email.toLowerCase() : null,
  });
  if (error) throw error;
}

export async function removeSplitMember(groupId: string, memberId: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('split_members').delete().eq('group_id', groupId).eq('id', memberId);
  if (error) throw error;
}

export interface SplitExpenseInput {
  title: string;
  amountNpr: number;
  paidByMemberId: string;
  participantIds: string[];
  spentOn: string | null;
}

export async function addSplitExpense(
  groupId: string,
  createdBy: string,
  input: SplitExpenseInput,
): Promise<void> {
  const db = requireSupabase();
  const { data, error } = await db
    .from('split_expenses')
    .insert({
      group_id: groupId,
      created_by: createdBy,
      title: input.title,
      amount_npr: input.amountNpr,
      paid_by_member_id: input.paidByMemberId,
      spent_on: input.spentOn,
    })
    .select('id')
    .single();
  if (error) throw error;

  const expenseId = String((data as DbRow).id);
  const participants = [...new Set(input.participantIds)];
  if (participants.length > 0) {
    const { error: shareError } = await db.from('split_expense_participants').insert(
      participants.map((memberId) => ({ expense_id: expenseId, member_id: memberId })),
    );
    if (shareError) {
      await db.from('split_expenses').delete().eq('id', expenseId);
      throw shareError;
    }
  }
}

export async function deleteSplitExpense(groupId: string, expenseId: string): Promise<void> {
  const db = requireSupabase();
  const { error } = await db.from('split_expenses').delete().eq('group_id', groupId).eq('id', expenseId);
  if (error) throw error;
}
