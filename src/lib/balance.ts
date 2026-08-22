import type { Expense, Settlement, User } from "./types";

/**
 * Net balance per user: positive means the OTHER person owes them.
 * Only meaningful for exactly two users (JustSplit's fixed scope).
 */
export function computeBalance(
  users: [User, User],
  expenses: Expense[],
  settlements: Settlement[]
): { net: number; owedByUserId: number | null; owedToUserId: number | null } {
  const [a, b] = users;
  let net = 0; // positive => b owes a, negative => a owes b

  for (const expense of expenses) {
    // Whoever paid is owed the other person's share of that expense.
    const paidByA = expense.paid_by_user_id === a.id;
    const otherShare =
      expense.splits.find((s) => s.user_id === (paidByA ? b.id : a.id))
        ?.amount ?? 0;
    net += paidByA ? otherShare : -otherShare;
  }

  for (const s of settlements) {
    // b paying a shrinks what b owes a; a paying b shrinks a's debt (net grows).
    if (s.from_user_id === b.id && s.to_user_id === a.id) net -= s.amount;
    if (s.from_user_id === a.id && s.to_user_id === b.id) net += s.amount;
  }

  net = Math.round(net * 100) / 100;

  return {
    net,
    owedByUserId: net > 0 ? b.id : net < 0 ? a.id : null,
    owedToUserId: net > 0 ? a.id : net < 0 ? b.id : null,
  };
}
