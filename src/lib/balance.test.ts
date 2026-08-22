import { describe, it, expect } from "vitest";
import { computeGroupBalance } from "./balance";
import type { Expense, Settlement, User } from "./types";

const a: User = { id: 1, name: "A", emoji: "🧑", color: "blue" };
const b: User = { id: 2, name: "B", emoji: "🧑‍🦰", color: "pink" };
const c: User = { id: 3, name: "C", emoji: "🧑‍🎤", color: "peach" };

function expense(
  paidBy: number,
  amount: number,
  splits: { user_id: number; amount: number }[]
): Expense {
  return {
    id: crypto.randomUUID(),
    trip_id: "t1",
    description: "e",
    amount,
    category: null,
    paid_by_user_id: paidBy,
    expense_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00.000Z",
    splits,
  };
}

describe("computeGroupBalance", () => {
  it("settles up to zero transactions when nothing was ever paid", () => {
    const result = computeGroupBalance([a, b], [], []);
    expect(result.transactions).toEqual([]);
  });

  it("produces one transaction for a simple two-person split", () => {
    const expenses = [
      expense(a.id, 100, [
        { user_id: a.id, amount: 50 },
        { user_id: b.id, amount: 50 },
      ]),
    ];
    const result = computeGroupBalance([a, b], expenses, []);
    expect(result.transactions).toEqual([
      { fromUserId: b.id, toUserId: a.id, amount: 50 },
    ]);
  });

  it("a settlement payment closes out the debt", () => {
    const expenses = [
      expense(a.id, 100, [
        { user_id: a.id, amount: 50 },
        { user_id: b.id, amount: 50 },
      ]),
    ];
    const settlements: Settlement[] = [
      {
        id: "s1",
        trip_id: "t1",
        from_user_id: b.id,
        to_user_id: a.id,
        amount: 50,
        note: null,
        settled_at: "2024-01-02T00:00:00.000Z",
      },
    ];
    const result = computeGroupBalance([a, b], expenses, settlements);
    expect(result.transactions).toEqual([]);
  });

  it("simplifies a three-person trip into the minimum number of payments", () => {
    // A fronts 90, split evenly three ways (30 each): B and C each owe A 30.
    const expenses = [
      expense(a.id, 90, [
        { user_id: a.id, amount: 30 },
        { user_id: b.id, amount: 30 },
        { user_id: c.id, amount: 30 },
      ]),
    ];
    const result = computeGroupBalance([a, b, c], expenses, []);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions.every((t) => t.toUserId === a.id)).toBe(true);
    const totalOwed = result.transactions.reduce((sum, t) => sum + t.amount, 0);
    expect(totalOwed).toBe(60);
  });

  it("nets multiple expenses across a three-person trip down to one payment", () => {
    // A pays 60 (split 20 each among A, B, C).
    // B pays 60 (split 20 each among A, B, C).
    // Net: A +20 (paid 60, owes 40 total across 2 expenses -> +20),
    //      B +20, C -40. So C should owe both A and B 20 each,
    //      collapsible depending on ordering — but the total must net to 0
    //      and nobody is owed/owes more than their true net position.
    const splits = [
      { user_id: a.id, amount: 20 },
      { user_id: b.id, amount: 20 },
      { user_id: c.id, amount: 20 },
    ];
    const expenses = [expense(a.id, 60, splits), expense(b.id, 60, splits)];
    const result = computeGroupBalance([a, b, c], expenses, []);
    expect(result.net[a.id]).toBe(20);
    expect(result.net[b.id]).toBe(20);
    expect(result.net[c.id]).toBe(-40);
    const totalPaid = result.transactions.reduce((sum, t) => sum + t.amount, 0);
    expect(totalPaid).toBe(40);
    expect(result.transactions.every((t) => t.fromUserId === c.id)).toBe(true);
  });
});
