/**
 * Cost splitting arithmetic.
 *
 * Every amount is handled as an integer number of paisa (1 NPR = 100 paisa) so
 * that repeated division of a bill cannot drift by a paisa. The UI works in NPR
 * and converts at the boundary.
 */

export const PAISA_PER_NPR = 100;

export interface SplitExpenseLike {
  amountNpr: number;
  paidByMemberId: string;
  participantIds: string[];
}

export interface MemberBalance {
  memberId: string;
  /** Paisa this member actually put on the table. */
  paidPaisa: number;
  /** Paisa this member owes for their share of all bills. */
  owedPaisa: number;
  /** paid − owed. Positive means the group owes them. */
  netPaisa: number;
}

export interface Transfer {
  fromMemberId: string;
  toMemberId: string;
  amountPaisa: number;
}

export function toPaisa(amountNpr: number): number {
  if (!Number.isFinite(amountNpr)) return 0;
  return Math.round(amountNpr * PAISA_PER_NPR);
}

export function fromPaisa(paisa: number): number {
  return Math.round(paisa) / PAISA_PER_NPR;
}

/** `NPR 1,240` for whole rupees, `NPR 1,240.50` when paisa are involved. */
export function formatPaisa(paisa: number): string {
  const value = Math.round(paisa) / PAISA_PER_NPR;
  const hasFraction = Math.abs(Math.round(paisa) % PAISA_PER_NPR) > 0;
  const formatted = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `NPR ${formatted}`;
}

/**
 * Divide a total evenly in paisa. Any indivisible remainder is handed out one
 * paisa at a time in the order the members were listed, so the shares always add
 * up to exactly the total.
 */
export function splitEvenly(totalPaisa: number, memberIds: string[]): Record<string, number> {
  const shares: Record<string, number> = {};
  const ids = [...new Set(memberIds)];
  if (ids.length === 0) return shares;

  const total = Math.max(0, Math.round(totalPaisa));
  const base = Math.floor(total / ids.length);
  let remainder = total - base * ids.length;

  for (const id of ids) {
    shares[id] = base;
  }
  for (const id of ids) {
    if (remainder <= 0) break;
    shares[id] += 1;
    remainder -= 1;
  }
  return shares;
}

/**
 * Net position for every member across all expenses. Expenses whose payer is not
 * in `memberIds` are ignored rather than silently crediting an outsider.
 */
export function computeBalances(memberIds: string[], expenses: SplitExpenseLike[]): MemberBalance[] {
  const ids = [...new Set(memberIds)];
  const paid = new Map<string, number>(ids.map((id) => [id, 0]));
  const owed = new Map<string, number>(ids.map((id) => [id, 0]));

  for (const expense of expenses) {
    const amount = toPaisa(expense.amountNpr);
    if (amount <= 0) continue;
    if (!paid.has(expense.paidByMemberId)) continue;

    const participantIds = expense.participantIds.filter((id) => paid.has(id));
    if (participantIds.length === 0) continue;

    const shares = splitEvenly(amount, participantIds);
    paid.set(expense.paidByMemberId, (paid.get(expense.paidByMemberId) ?? 0) + amount);
    for (const id of participantIds) {
      owed.set(id, (owed.get(id) ?? 0) + (shares[id] ?? 0));
    }
  }

  return ids.map((memberId) => {
    const paidPaisa = paid.get(memberId) ?? 0;
    const owedPaisa = owed.get(memberId) ?? 0;
    return { memberId, paidPaisa, owedPaisa, netPaisa: paidPaisa - owedPaisa };
  });
}

/**
 * Reduce balances to a short list of payments. Largest creditor is matched with
 * largest debtor repeatedly; the number of transfers is at most members − 1.
 */
export function settleDebts(balances: MemberBalance[]): Transfer[] {
  const creditors = balances
    .filter((balance) => balance.netPaisa > 0)
    .map((balance) => ({ id: balance.memberId, remaining: balance.netPaisa }))
    .sort((a, b) => b.remaining - a.remaining);
  const debtors = balances
    .filter((balance) => balance.netPaisa < 0)
    .map((balance) => ({ id: balance.memberId, remaining: -balance.netPaisa }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers: Transfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.remaining, creditor.remaining);

    if (amount > 0) {
      transfers.push({ fromMemberId: debtor.id, toMemberId: creditor.id, amountPaisa: amount });
      debtor.remaining -= amount;
      creditor.remaining -= amount;
    }

    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return transfers;
}

/** Sum of everything spent, in paisa. */
export function totalSpentPaisa(expenses: SplitExpenseLike[]): number {
  return expenses.reduce((sum, expense) => sum + Math.max(0, toPaisa(expense.amountNpr)), 0);
}

/** Total of one member's shares, in paisa. */
export function memberOwedPaisa(memberId: string, expenses: SplitExpenseLike[]): number {
  let owed = 0;
  for (const expense of expenses) {
    const amount = toPaisa(expense.amountNpr);
    if (amount <= 0) continue;
    const participants = [...new Set(expense.participantIds)];
    if (!participants.includes(memberId)) continue;
    const shares = splitEvenly(amount, participants);
    owed += shares[memberId] ?? 0;
  }
  return owed;
}
