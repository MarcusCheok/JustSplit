"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_EMOJI, type Expense } from "@/lib/types";
import { useCurrentUser } from "./CurrentUserProvider";

type SplitMode = "equal" | "full1" | "full2" | "exact" | "percent";

function detectInitialMode(expense?: Expense): SplitMode {
  if (!expense) return "equal";
  const [s1, s2] = expense.splits;
  if (expense.splits.length === 1) {
    return expense.splits[0].user_id === 1 ? "full1" : "full2";
  }
  if (s1 && s2 && Math.abs(s1.amount - s2.amount) < 0.01) return "equal";
  return "exact";
}

export function ExpenseForm({
  action,
  tripId,
  expense,
}: {
  action: (formData: FormData) => void;
  tripId: string;
  expense?: Expense;
}) {
  const { users, currentUser } = useCurrentUser();
  const [amount, setAmount] = useState(expense?.amount ?? 0);
  const [mode, setMode] = useState<SplitMode>(detectInitialMode(expense));

  const half = Math.round((amount / 2) * 100) / 100;
  const other = Math.round((amount - half) * 100) / 100;

  const splitFor = (userId: number) =>
    expense?.splits.find((s) => s.user_id === userId)?.amount ?? 0;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="tripId" value={tripId} />
      {expense && <input type="hidden" name="expenseId" value={expense.id} />}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Description</span>
        <input
          name="description"
          required
          defaultValue={expense?.description}
          className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Amount</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={expense?.amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Category</span>
        <select
          name="category"
          defaultValue={expense?.category ?? ""}
          className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
        >
          <option value="">None</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_EMOJI[c]} {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Paid by</span>
        <div className="flex gap-2">
          {users.map((u) => (
            <label
              key={u.id}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 transition has-checked:bg-mint has-checked:ring-mint-dark active:scale-[0.97]"
            >
              <input
                type="radio"
                name="paidBy"
                value={u.id}
                defaultChecked={
                  expense
                    ? expense.paid_by_user_id === u.id
                    : currentUser?.id === u.id
                }
                className="sr-only"
              />
              {u.emoji} {u.name}
            </label>
          ))}
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Date</span>
        <input
          name="date"
          type="date"
          defaultValue={expense?.expense_date ?? new Date().toISOString().slice(0, 10)}
          className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink/70">Split</span>
        <input type="hidden" name="splitMode" value={mode} />
        <div className="grid grid-cols-2 gap-2">
          <SplitChip label="50 / 50" active={mode === "equal"} onClick={() => setMode("equal")} />
          <SplitChip
            label={`100% ${users[0].name}`}
            active={mode === "full1"}
            onClick={() => setMode("full1")}
          />
          <SplitChip
            label={`100% ${users[1].name}`}
            active={mode === "full2"}
            onClick={() => setMode("full2")}
          />
          <SplitChip label="Exact amounts" active={mode === "exact"} onClick={() => setMode("exact")} />
          <SplitChip label="Percentage" active={mode === "percent"} onClick={() => setMode("percent")} />
        </div>

        {mode === "equal" && (
          <p className="text-sm text-ink/50">
            {users[0].name} ${half.toFixed(2)} · {users[1].name} ${other.toFixed(2)}
          </p>
        )}

        {mode === "exact" && (
          <div className="flex gap-2">
            <input
              name="exact1"
              type="number"
              step="0.01"
              placeholder={`${users[0].name}'s share`}
              defaultValue={expense ? splitFor(users[0].id) : undefined}
              className="w-full rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5"
            />
            <input
              name="exact2"
              type="number"
              step="0.01"
              placeholder={`${users[1].name}'s share`}
              defaultValue={expense ? splitFor(users[1].id) : undefined}
              className="w-full rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5"
            />
          </div>
        )}

        {mode === "percent" && (
          <div className="flex gap-2">
            <input
              name="percent1"
              type="number"
              placeholder={`${users[0].name} %`}
              defaultValue={50}
              className="w-full rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5"
            />
            <input
              name="percent2"
              type="number"
              placeholder={`${users[1].name} %`}
              defaultValue={50}
              className="w-full rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5"
            />
          </div>
        )}
      </div>

      <button
        type="submit"
        className="rounded-2xl bg-mint-dark px-4 py-3 font-semibold text-white shadow-sm transition active:scale-[0.97]"
      >
        {expense ? "Save changes" : "Add expense"}
      </button>
    </form>
  );
}

function SplitChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-medium shadow-sm ring-1 transition active:scale-[0.97] ${
        active
          ? "bg-blush-dark text-white ring-blush-dark"
          : "bg-white text-ink ring-black/5"
      }`}
    >
      {label}
    </button>
  );
}
