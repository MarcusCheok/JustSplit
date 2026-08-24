import { toSgd } from "./currency";
import type { Expense } from "./types";

export type DayGroup = {
  date: string;
  expenses: Expense[];
  totalSgd: number;
};

/**
 * Groups a trip's expenses by day, earliest day first — a chronological
 * "what we did each day" view rather than a flat reverse-input-order list.
 * Within a day, expenses stay in the order they were entered.
 */
export function groupExpensesByDay(
  expenses: Expense[],
  exchangeRateToSgd: number
): DayGroup[] {
  const byDate = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const day = byDate.get(expense.expense_date) ?? [];
    day.push(expense);
    byDate.set(expense.expense_date, day);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayExpenses]) => {
      const sorted = [...dayExpenses].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      const totalSgd = round2(
        sorted.reduce(
          (sum, e) => sum + toSgd(e.amount, e.currency, exchangeRateToSgd),
          0
        )
      );
      return { date, expenses: sorted, totalSgd };
    });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
