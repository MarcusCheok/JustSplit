import { describe, it, expect } from "vitest";
import { groupExpensesByDay } from "./expenseDays";
import type { Expense } from "./types";

function expense(
  id: string,
  date: string,
  createdAt: string,
  amount: number,
  currency: Expense["currency"] = "SGD"
): Expense {
  return {
    id,
    trip_id: "t1",
    description: id,
    amount,
    currency,
    category: null,
    paid_by_user_id: 1,
    expense_date: date,
    created_at: createdAt,
    splits: [],
  };
}

describe("groupExpensesByDay", () => {
  it("returns nothing for no expenses", () => {
    expect(groupExpensesByDay([], 1)).toEqual([]);
  });

  it("orders days chronologically, earliest first", () => {
    const expenses = [
      expense("c", "2024-03-03", "2024-03-03T00:00:00.000Z", 10),
      expense("a", "2024-03-01", "2024-03-01T00:00:00.000Z", 10),
      expense("b", "2024-03-02", "2024-03-02T00:00:00.000Z", 10),
    ];
    const result = groupExpensesByDay(expenses, 1);
    expect(result.map((g) => g.date)).toEqual([
      "2024-03-01",
      "2024-03-02",
      "2024-03-03",
    ]);
  });

  it("orders expenses within a day by input order, earliest first", () => {
    const expenses = [
      expense("second", "2024-03-01", "2024-03-01T10:00:00.000Z", 10),
      expense("first", "2024-03-01", "2024-03-01T08:00:00.000Z", 10),
    ];
    const result = groupExpensesByDay(expenses, 1);
    expect(result[0].expenses.map((e) => e.id)).toEqual(["first", "second"]);
  });

  it("sums a day's expenses in SGD using the given exchange rate", () => {
    const expenses = [
      expense("a", "2024-03-01", "2024-03-01T08:00:00.000Z", 20, "SGD"),
      expense("b", "2024-03-01", "2024-03-01T09:00:00.000Z", 10, "AUD"),
    ];
    // 20 SGD + (10 AUD * 0.9 rate = 9 SGD) = 29 SGD
    const result = groupExpensesByDay(expenses, 0.9);
    expect(result[0].totalSgd).toBe(29);
  });
});
