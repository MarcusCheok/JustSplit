import { toSgd } from "./currency";
import type { Expense, Settlement, User } from "./types";

export type Transaction = {
  fromUserId: number;
  toUserId: number;
  amount: number;
};

export type GroupBalance = {
  /** Net position per participant: positive = owed to them, negative = they owe. */
  net: Record<number, number>;
  /** Simplified minimum set of payments that would settle every debt. */
  transactions: Transaction[];
};

/**
 * Computes each trip participant's net balance from expenses + settlements,
 * then simplifies the group's debts into a minimal set of payments (greedily
 * matching the biggest debtor to the biggest creditor, repeatedly) — the
 * standard "splitwise" debt-simplification approach, generalized from pairs
 * to any number of participants.
 *
 * Expenses may be entered in AUD or SGD; every amount is converted to SGD
 * (the tabulation currency) before netting. Settlements are SGD-only.
 */
export function computeGroupBalance(
  participants: User[],
  expenses: Expense[],
  settlements: Settlement[]
): GroupBalance {
  const net: Record<number, number> = {};
  for (const p of participants) net[p.id] = 0;

  for (const expense of expenses) {
    const paidSgd = toSgd(expense.amount, expense.currency, expense.exchange_rate_to_sgd);
    net[expense.paid_by_user_id] = (net[expense.paid_by_user_id] ?? 0) + paidSgd;
    for (const split of expense.splits) {
      const splitSgd = toSgd(split.amount, expense.currency, expense.exchange_rate_to_sgd);
      net[split.user_id] = (net[split.user_id] ?? 0) - splitSgd;
    }
  }

  for (const s of settlements) {
    net[s.from_user_id] = (net[s.from_user_id] ?? 0) + s.amount;
    net[s.to_user_id] = (net[s.to_user_id] ?? 0) - s.amount;
  }

  for (const id in net) net[id] = round2(net[id]);

  const creditors = Object.entries(net)
    .filter(([, amount]) => amount > 0.004)
    .map(([id, amount]) => ({ id: Number(id), amount }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = Object.entries(net)
    .filter(([, amount]) => amount < -0.004)
    .map(([id, amount]) => ({ id: Number(id), amount: -amount }))
    .sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = round2(Math.min(debtors[i].amount, creditors[j].amount));
    if (amount > 0) {
      transactions.push({
        fromUserId: debtors[i].id,
        toUserId: creditors[j].id,
        amount,
      });
    }
    debtors[i].amount = round2(debtors[i].amount - amount);
    creditors[j].amount = round2(creditors[j].amount - amount);
    if (debtors[i].amount <= 0.004) i++;
    if (creditors[j].amount <= 0.004) j++;
  }

  return { net, transactions };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
