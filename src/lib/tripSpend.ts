import { toSgd } from "./currency";
import type { Expense } from "./types";

export type TripSpend = {
  /** Sum of every expense in the trip, converted to SGD. */
  totalSgd: number;
  /** Sum of just the given user's share across every expense's split. */
  yourSgd: number;
};

export function computeTripSpend(
  meId: number,
  expenses: Expense[],
  exchangeRateToSgd: number
): TripSpend {
  let totalSgd = 0;
  let yourSgd = 0;

  for (const expense of expenses) {
    totalSgd += toSgd(expense.amount, expense.currency, exchangeRateToSgd);
    for (const split of expense.splits) {
      if (split.user_id === meId) {
        yourSgd += toSgd(split.amount, expense.currency, exchangeRateToSgd);
      }
    }
  }

  return { totalSgd: round2(totalSgd), yourSgd: round2(yourSgd) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
