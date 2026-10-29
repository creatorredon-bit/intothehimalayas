export interface BudgetInputs {
  travelers: number;
  nights: number;
  lodgingPerNightNpr: number;
  foodPerDayNpr: number;
  transportNpr: number;
  permitsNpr: number;
  guidePerDayNpr: number;
  contingencyPercent: number;
}

export const DEFAULT_BUDGET_INPUTS: BudgetInputs = {
  travelers: 1,
  nights: 12,
  lodgingPerNightNpr: 2500,
  foodPerDayNpr: 2200,
  transportNpr: 18000,
  permitsNpr: 9000,
  guidePerDayNpr: 0,
  contingencyPercent: 10,
};

export interface BudgetBreakdown {
  lodging: number;
  food: number;
  transport: number;
  permits: number;
  guide: number;
  subtotal: number;
  contingency: number;
  total: number;
  perPerson: number;
  perDay: number;
  days: number;
}

/**
 * Transparent budget arithmetic based on numbers the traveller supplies.
 * Nothing is pre-filled with a "market average": every figure is an input.
 */
export function calculateBudget(inputs: BudgetInputs): BudgetBreakdown {
  const travelers = Math.max(1, Math.floor(inputs.travelers || 1));
  const days = Math.max(1, Math.floor(inputs.nights || 1));
  const nonNegative = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

  const lodging = nonNegative(inputs.lodgingPerNightNpr) * days;
  const food = nonNegative(inputs.foodPerDayNpr) * days * travelers;
  const transport = nonNegative(inputs.transportNpr) * travelers;
  const permits = nonNegative(inputs.permitsNpr) * travelers;
  const guide = nonNegative(inputs.guidePerDayNpr) * days;
  const subtotal = lodging + food + transport + permits + guide;
  const contingency = Math.round((subtotal * Math.max(0, inputs.contingencyPercent || 0)) / 100);
  const total = subtotal + contingency;

  return {
    lodging,
    food,
    transport,
    permits,
    guide,
    subtotal,
    contingency,
    total,
    perPerson: Math.round(total / travelers),
    perDay: Math.round(total / days / travelers),
    days,
  };
}

/** Sum of planner line-item costs, the figure shown next to the planned budget. */
export function sumItemCosts(costs: (number | null | undefined)[]): number {
  return costs.reduce<number>((sum, cost) => sum + (typeof cost === 'number' && Number.isFinite(cost) ? cost : 0), 0);
}
