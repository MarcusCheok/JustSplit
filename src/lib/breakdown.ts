import type { Expense, User } from "./types";

export type CategoryRow = {
  label: string;
  amounts: Record<number, number>;
};

/** How much each person paid, broken down by expense category. */
export function computeCategoryBreakdown(
  users: [User, User],
  expenses: Expense[]
): { rows: CategoryRow[]; totals: Record<number, number> } {
  const byCategory = new Map<string, Record<number, number>>();
  const totals: Record<number, number> = { [users[0].id]: 0, [users[1].id]: 0 };

  for (const expense of expenses) {
    const label = expense.category ?? "Uncategorized";
    const row = byCategory.get(label) ?? { [users[0].id]: 0, [users[1].id]: 0 };
    row[expense.paid_by_user_id] =
      (row[expense.paid_by_user_id] ?? 0) + expense.amount;
    byCategory.set(label, row);
    totals[expense.paid_by_user_id] =
      (totals[expense.paid_by_user_id] ?? 0) + expense.amount;
  }

  const rowTotal = (amounts: Record<number, number>) =>
    users.reduce((sum, u) => sum + (amounts[u.id] ?? 0), 0);

  const rows = Array.from(byCategory.entries())
    .map(([label, amounts]) => ({ label, amounts }))
    .sort((a, b) => rowTotal(b.amounts) - rowTotal(a.amounts));

  return { rows, totals };
}
