"use client";

import { useState } from "react";
import type { User } from "@/lib/types";
import type { GroupBalance } from "@/lib/balance";

export function SettleForm({
  action,
  tripId,
  participants,
  balance,
}: {
  action: (formData: FormData) => void;
  tripId: string;
  participants: User[];
  balance: GroupBalance;
}) {
  const suggested = balance.transactions[0];
  const [from, setFrom] = useState(suggested?.fromUserId ?? participants[0]?.id);
  const [to, setTo] = useState(
    suggested?.toUserId ?? participants[1]?.id ?? participants[0]?.id
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="tripId" value={tripId} />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Who paid?</span>
        <select
          name="fromUserId"
          value={from}
          onChange={(e) => setFrom(Number(e.target.value))}
          className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
        >
          {participants.map((u) => (
            <option key={u.id} value={u.id}>
              {u.emoji} {u.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Who received it?</span>
        <select
          name="toUserId"
          value={to}
          onChange={(e) => setTo(Number(e.target.value))}
          className="rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
        >
          {participants.map((u) => (
            <option key={u.id} value={u.id}>
              {u.emoji} {u.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink/70">Amount (SGD)</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          defaultValue={suggested?.amount}
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
