import { toSgd } from "./currency";
import type { Expense, User } from "./types";

export type CategoryRow = {
  label: string;
  amounts: Record<number, number>;
};

/**
 * How much each person paid, broken down by expense category. Amounts are
 * converted to SGD (the tabulation currency) regardless of what currency
 * each expense was originally entered in.
 */
export function computeCategoryBreakdown(
  users: User[],
  expenses: Expense[]
): { rows: CategoryRow[]; totals: Record<number, number> } {
  const emptyRow = () =>
    Object.fromEntries(users.map((u) => [u.id, 0])) as Record<number, number>;

  const byCategory = new Map<string, Record<number, number>>();
  const totals = emptyRow();

  for (const expense of expenses) {
    const amountSgd = toSgd(expense.amount, expense.currency, expense.exchange_rate_to_sgd);
    const label = expense.category ?? "Uncategorized";
    const row = byCategory.get(label) ?? emptyRow();
    row[expense.paid_by_user_id] = (row[expense.paid_by_user_id] ?? 0) + amountSgd;
    byCategory.set(label, row);
    totals[expense.paid_by_user_id] = (totals[expense.paid_by_user_id] ?? 0) + amountSgd;
  }

  const rowTotal = (amounts: Record<number, number>) =>
    users.reduce((sum, u) => sum + (amounts[u.id] ?? 0), 0);

  const rows = Array.from(byCategory.entries())
    .map(([label, amounts]) => ({ label, amounts }))
    .sort((a, b) => rowTotal(b.amounts) - rowTotal(a.amounts));

  return { rows, totals };
}
