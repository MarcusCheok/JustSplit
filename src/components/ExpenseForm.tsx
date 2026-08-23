"use client";

import { useState } from "react";
import { CATEGORIES, CATEGORY_EMOJI, type Expense, type User } from "@/lib/types";
import { splitEqually } from "@/lib/split";
import { useCurrentUser } from "./CurrentUserProvider";

type SplitMode = "equal" | "full" | "exact" | "percent";

function detectInitialMode(
  expense: Expense | undefined,
  participantIds: number[]
): SplitMode {
  if (!expense) return "equal";
  if (expense.splits.length === 1) return "full";
  const shares = splitEqually(expense.amount, participantIds);
  const isEqual =
    expense.splits.length === participantIds.length &&
    expense.splits.every((s) => Math.abs(s.amount - (shares[s.user_id] ?? NaN)) < 0.01);
  return isEqual ? "equal" : "exact";
}

export function ExpenseForm({
  action,
  tripId,
  participants,
  expense,
}: {
  action: (formData: FormData) => void;
  tripId: string;
  participants: User[];
  expense?: Expense;
}) {
  const { currentUser } = useCurrentUser();
  const participantIds = participants.map((p) => p.id);
  const [amount, setAmount] = useState(expense?.amount ?? 0);
  const [mode, setMode] = useState<SplitMode>(detectInitialMode(expense, participantIds));
  const [fullPayerId, setFullPayerId] = useState(
    expense && expense.splits.length === 1
      ? expense.splits[0].user_id
      : currentUser?.id ?? participants[0]?.id
  );

  const equalShares = splitEqually(amount, participantIds);

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
        <div className="flex flex-wrap gap-2">
          {participants.map((u) => (
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
        {mode === "full" && (
          <input type="hidden" name="fullPayerId" value={fullPayerId} />
        )}
        <div className="grid grid-cols-2 gap-2">
          <SplitChip label="Split equally" active={mode === "equal"} onClick={() => setMode("equal")} />
          <SplitChip
            label="One person pays it all"
            active={mode === "full"}
            onClick={() => setMode("full")}
          />
          <SplitChip label="Exact amounts" active={mode === "exact"} onClick={() => setMode("exact")} />
          <SplitChip label="Percentage" active={mode === "percent"} onClick={() => setMode("percent")} />
        </div>

        {mode === "equal" && (
          <p className="text-sm text-ink/50">
            {participants
              .map((u) => `${u.name} $${(equalShares[u.id] ?? 0).toFixed(2)}`)
              .join(" · ")}
          </p>
        )}

        {mode === "full" && (
          <select
            value={fullPayerId}
            onChange={(e) => setFullPayerId(Number(e.target.value))}
            className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5"
          >
            {participants.map((u) => (
              <option key={u.id} value={u.id}>
                {u.emoji} {u.name} covers it all
              </option>
            ))}
          </select>
        )}

        {mode === "exact" && (
          <div className="flex flex-col gap-2">
            {participants.map((u) => (
              <input
                key={u.id}
                name={`exact_${u.id}`}
                type="number"
                step="0.01"
                placeholder={`${u.name}'s share`}
                defaultValue={expense ? splitFor(u.id) : undefined}
                className="w-full rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5"
              />
            ))}
          </div>
        )}

        {mode === "percent" && (
          <div className="flex flex-col gap-2">
            {participants.map((u) => (
              <input
                key={u.id}
                name={`percent_${u.id}`}
                type="number"
                placeholder={`${u.name} %`}
                defaultValue={Math.round(100 / participants.length)}
                className="w-full rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5"
              />
            ))}
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
