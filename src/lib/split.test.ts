import { describe, expect, it } from 'vitest';
import {
  computeBalances,
  formatPaisa,
  memberOwedPaisa,
  settleDebts,
  splitEvenly,
  toPaisa,
  totalSpentPaisa,
} from './split';

const expense = (amountNpr: number, paidByMemberId: string, participantIds: string[]) => ({
  amountNpr,
  paidByMemberId,
  participantIds,
});

describe('splitEvenly', () => {
  it('splits a bill without losing or inventing paisa', () => {
    const shares = splitEvenly(10_000, ['a', 'b', 'c']);
    expect(shares).toEqual({ a: 3334, b: 3333, c: 3333 });
    expect(Object.values(shares).reduce((sum, value) => sum + value, 0)).toBe(10_000);
  });

  it('handles a single participant and empty input', () => {
    expect(splitEvenly(2500, ['a'])).toEqual({ a: 2500 });
    expect(splitEvenly(2500, [])).toEqual({});
  });

  it('ignores duplicate ids', () => {
    expect(splitEvenly(900, ['a', 'a', 'b'])).toEqual({ a: 450, b: 450 });
  });

  it('rounds NPR to paisa instead of accumulating float error', () => {
    expect(toPaisa(0.1) + toPaisa(0.2)).toBe(toPaisa(0.3));
    expect(toPaisa(1234.565)).toBe(123457);
  });
});

describe('computeBalances', () => {
  it('credits the payer in full and charges each participant a share', () => {
    const balances = computeBalances(['a', 'b', 'c'], [expense(3000, 'a', ['a', 'b', 'c'])]);
    const byId = Object.fromEntries(balances.map((balance) => [balance.memberId, balance]));

    expect(byId.a.paidPaisa).toBe(300_000);
    expect(byId.a.netPaisa).toBe(200_000);
    expect(byId.b.netPaisa).toBe(-100_000);
    expect(byId.c.netPaisa).toBe(-100_000);
    expect(balances.reduce((sum, balance) => sum + balance.netPaisa, 0)).toBe(0);
  });

  it('nets several bills paid by different people', () => {
    const balances = computeBalances(
      ['a', 'b'],
      [expense(2000, 'a', ['a', 'b']), expense(1000, 'b', ['a', 'b'])],
    );
    const byId = Object.fromEntries(balances.map((balance) => [balance.memberId, balance]));

    // a paid 2000 and owed 1500 → +500; b paid 1000 and owed 1500 → −500.
    expect(byId.a.netPaisa).toBe(50_000);
    expect(byId.b.netPaisa).toBe(-50_000);
  });

  it('supports an expense shared by only some of the group', () => {
    const balances = computeBalances(
      ['a', 'b', 'c'],
      [expense(1000, 'a', ['a']), expense(3000, 'a', ['b', 'c'])],
    );
    const byId = Object.fromEntries(balances.map((balance) => [balance.memberId, balance]));

    // a paid for b and c's hotel but did not stay, so the group owes a 3000.
    expect(byId.a.netPaisa).toBe(300_000);
    expect(byId.b.netPaisa).toBe(-150_000);
    expect(byId.c.netPaisa).toBe(-150_000);
  });

  it('ignores expenses paid by someone outside the group', () => {
    const balances = computeBalances(['a', 'b'], [expense(5000, 'stranger', ['a', 'b'])]);
    expect(balances.every((balance) => balance.netPaisa === 0)).toBe(true);
  });

  it('ignores zero and negative amounts', () => {
    const balances = computeBalances(['a', 'b'], [expense(0, 'a', ['a', 'b']), expense(-50, 'a', ['a', 'b'])]);
    expect(balances.every((balance) => balance.netPaisa === 0)).toBe(true);
  });
});

describe('settleDebts', () => {
  it('suggests the fewest transfers that clear the group', () => {
    const balances = computeBalances(['a', 'b', 'c'], [expense(3000, 'a', ['a', 'b', 'c'])]);
    const transfers = settleDebts(balances);

    expect(transfers).toHaveLength(2);
    expect(transfers.every((transfer) => transfer.toMemberId === 'a')).toBe(true);
    expect(transfers.reduce((sum, transfer) => sum + transfer.amountPaisa, 0)).toBe(200_000);
  });

  it('is empty when everyone is square', () => {
    expect(settleDebts(computeBalances(['a', 'b'], []))).toEqual([]);
  });

  it('handles an odd total without leaving a paisa behind', () => {
    const transfers = settleDebts(computeBalances(['a', 'b', 'c'], [expense(100, 'a', ['a', 'b', 'c'])]));
    const settled = transfers.reduce((sum, transfer) => sum + transfer.amountPaisa, 0);
    expect(settled).toBe(6_666);
    expect(transfers.map((transfer) => transfer.fromMemberId).sort()).toEqual(['b', 'c']);
  });
});

describe('totals and formatting', () => {
  it('totals every bill', () => {
    expect(totalSpentPaisa([expense(1200.5, 'a', ['a']), expense(800, 'b', ['a'])])).toBe(200_050);
  });

  it('totals what one member owes', () => {
    expect(memberOwedPaisa('b', [expense(3000, 'a', ['a', 'b', 'c'])])).toBe(100_000);
    expect(memberOwedPaisa('d', [expense(3000, 'a', ['a', 'b', 'c'])])).toBe(0);
  });

  it('formats rupees and paisa readably', () => {
    expect(formatPaisa(0)).toBe('NPR 0');
    expect(formatPaisa(120_000)).toBe('NPR 1,200');
    expect(formatPaisa(120_050)).toBe('NPR 1,200.50');
  });
});
