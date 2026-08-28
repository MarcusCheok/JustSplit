import { describe, it, expect } from "vitest";
import { computeTripSpend } from "./tripSpend";
import type { Expense } from "./types";

function expense(
  amount: number,
  splits: { user_id: number; amount: number }[],
  currency: Expense["currency"] = "SGD"
): Expense {
  return {
    id: crypto.randomUUID(),
    trip_id: "t1",
    description: "e",
    amount,
    currency,
    category: null,
    paid_by_user_id: splits[0]?.user_id ?? 1,
    expense_date: "2024-01-01",
    created_at: "2024-01-01T00:00:00.000Z",
    splits,
  };
}

describe("computeTripSpend", () => {
  it("returns zero for a trip with no expenses", () => {
    expect(computeTripSpend(1, [], 1)).toEqual({ totalSgd: 0, yourSgd: 0 });
  });

  it("sums the trip total and just the given user's share", () => {
    const expenses = [
      expense(100, [
        { user_id: 1, amount: 50 },
        { user_id: 2, amount: 50 },
      ]),
      expense(60, [
        { user_id: 1, amount: 20 },
        { user_id: 2, amount: 20 },
        { user_id: 3, amount: 20 },
      ]),
    ];
    expect(computeTripSpend(1, expenses, 1)).toEqual({
      totalSgd: 160,
      yourSgd: 70,
    });
  });

  it("excludes a user's share from expenses they're not part of", () => {
    const expenses = [expense(50, [{ user_id: 2, amount: 50 }])];
    expect(computeTripSpend(1, expenses, 1)).toEqual({
      totalSgd: 50,
      yourSgd: 0,
    });
  });

  it("converts AUD expenses to SGD using the trip's exchange rate", () => {
    // 100 AUD at 0.9 -> 90 SGD total, split 45/45.
    const expenses = [
      expense(
        100,
        [
          { user_id: 1, amount: 50 },
          { user_id: 2, amount: 50 },
        ],
        "AUD"
      ),
    ];
    expect(computeTripSpend(1, expenses, 0.9)).toEqual({
      totalSgd: 90,
      yourSgd: 45,
    });
  });
});
