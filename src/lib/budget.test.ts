import { describe, expect, it } from 'vitest';
import { calculateBudget, DEFAULT_BUDGET_INPUTS, sumItemCosts } from './budget';

describe('calculateBudget', () => {
  it('multiplies per-person costs by travellers and daily costs by nights', () => {
    const result = calculateBudget({
      travelers: 2,
      nights: 10,
      lodgingPerNightNpr: 3000,
      foodPerDayNpr: 2000,
      transportNpr: 15000,
      permitsNpr: 5000,
      guidePerDayNpr: 4000,
      contingencyPercent: 10,
    });

    expect(result.lodging).toBe(30_000);
    expect(result.food).toBe(40_000);
    expect(result.transport).toBe(30_000);
    expect(result.permits).toBe(10_000);
    expect(result.guide).toBe(40_000);
    expect(result.subtotal).toBe(150_000);
    expect(result.contingency).toBe(15_000);
    expect(result.total).toBe(165_000);
    expect(result.perPerson).toBe(82_500);
    expect(result.perDay).toBe(8_250);
  });

  it('applies zero contingency when unset', () => {
    const result = calculateBudget({ ...DEFAULT_BUDGET_INPUTS, contingencyPercent: 0 });
    expect(result.contingency).toBe(0);
    expect(result.total).toBe(result.subtotal);
  });

  it('clamps travellers and nights to at least one', () => {
    const result = calculateBudget({
      travelers: 0,
      nights: 0,
      lodgingPerNightNpr: 1000,
      foodPerDayNpr: 1000,
      transportNpr: 0,
      permitsNpr: 0,
      guidePerDayNpr: 0,
      contingencyPercent: 0,
    });
    expect(result.days).toBe(1);
    expect(result.total).toBe(2000);
  });

  it('treats negative or NaN inputs as zero', () => {
    const result = calculateBudget({
      travelers: Number.NaN,
      nights: 5,
      lodgingPerNightNpr: -500,
      foodPerDayNpr: 1000,
      transportNpr: Number.NaN,
      permitsNpr: 0,
      guidePerDayNpr: 0,
      contingencyPercent: 10,
    });
    expect(result.lodging).toBe(0);
    expect(result.food).toBe(5000);
    expect(result.transport).toBe(0);
    expect(result.total).toBe(5500);
  });
});

describe('sumItemCosts', () => {
  it('adds numeric costs and ignores nullish values', () => {
    expect(sumItemCosts([100, null, 250, undefined, 0])).toBe(350);
    expect(sumItemCosts([])).toBe(0);
    expect(sumItemCosts([Number.NaN, 10])).toBe(10);
  });
});
