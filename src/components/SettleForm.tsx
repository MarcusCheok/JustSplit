"use client";

import { useState } from "react";
import type { User } from "@/lib/types";

export function SettleForm({
  action,
  tripId,
  users,
  balance,
}: {
  action: (formData: FormData) => void;
  tripId: string;
  users: [User, User];
  balance: { net: number; owedByUserId: number | null; owedToUserId: number | null };
}) {
  const suggestedFrom = balance.owedByUserId ?? users[0].id;
  const suggestedTo = balance.owedToUserId ?? users[1].id;
  const [from, setFrom] = useState(suggestedFrom);

  const to = users.find((u) => u.id !== from)?.id ?? suggestedTo;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="toUserId" value={to} />
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Who paid?</span>
        <div className="flex gap-2">
          {users.map((u) => (
            <label
              key={u.id}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 transition has-checked:bg-mint has-checked:ring-mint-dark active:scale-[0.97]"
            >
              <input
                type="radio"
                name="fromUserId"
                value={u.id}
                checked={from === u.id}
                onChange={() => setFrom(u.id)}
                className="sr-only"
              />
              {u.emoji} {u.name}
            </label>
          ))}
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Amount</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={Math.abs(balance.net) || undefined}
          className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Note (optional)</span>
        <input
          name="note"
          className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
        />
      </label>

      <button
        type="submit"
        className="rounded-2xl bg-blush-dark px-4 py-3 font-semibold text-white shadow-sm transition active:scale-[0.97]"
      >
        Record payment
      </button>
    </form>
  );
}
