"use client";

import { useState } from "react";
import type { User } from "@/lib/types";
import { COUNTRIES } from "@/lib/countries";
import { useCurrentUser } from "./CurrentUserProvider";

type NewPerson = { name: string; emoji: string };

export function TripForm({
  action,
  existingUsers,
}: {
  action: (formData: FormData) => void;
  existingUsers: User[];
}) {
  const { currentUser } = useCurrentUser();
  const others = existingUsers.filter((u) => u.id !== currentUser?.id);
  const [checked, setChecked] = useState<Set<number>>(
    new Set(others.map((u) => u.id))
  );
  const [newPeople, setNewPeople] = useState<NewPerson[]>([]);

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updatePerson(index: number, patch: Partial<NewPerson>) {
    setNewPeople((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function removePerson(index: number) {
    setNewPeople((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form
      action={action}
      className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
    >
      <input type="hidden" name="currentUserId" value={currentUser?.id ?? ""} />
      <input
        name="name"
        placeholder="New trip name"
        required
        className="rounded-xl bg-cream px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blush-dark"
      />

      <input
        name="country"
        list="country-options"
        placeholder="Country (optional)"
        className="rounded-xl bg-cream px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blush-dark"
      />
      <datalist id="country-options">
        {COUNTRIES.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <div className="flex gap-2">
        <select
          name="rateDirection"
          defaultValue="sgdToAud"
          className="rounded-xl bg-cream px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blush-dark"
        >
          <option value="sgdToAud">1 SGD = ? AUD</option>
          <option value="audToSgd">1 AUD = ? SGD</option>
        </select>
        <input
          name="rateValue"
          type="number"
          step="0.0001"
          min="0.0001"
          placeholder="optional, for AUD expenses"
          className="flex-1 rounded-xl bg-cream px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blush-dark"
        />
      </div>

      {others.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-ink/50">Who&apos;s coming?</span>
          <div className="flex flex-wrap gap-2">
            {others.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-1.5 rounded-xl bg-cream px-3 py-1.5 text-sm shadow-sm ring-1 ring-black/5 transition has-checked:bg-mint has-checked:ring-mint-dark active:scale-[0.97]"
              >
                <input
                  type="checkbox"
                  name="participantIds"
                  value={u.id}
                  checked={checked.has(u.id)}
                  onChange={() => toggle(u.id)}
                  className="sr-only"
                />
                {u.emoji} {u.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {newPeople.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={p.emoji}
              onChange={(e) => updatePerson(i, { emoji: e.target.value })}
              name="newPersonEmoji"
              maxLength={2}
              className="w-12 rounded-xl bg-cream px-2 py-2 text-center text-sm outline-none focus:ring-2 focus:ring-blush-dark"
            />
            <input
              value={p.name}
              onChange={(e) => updatePerson(i, { name: e.target.value })}
              name="newPersonName"
              placeholder="New person's name"
              className="flex-1 rounded-xl bg-cream px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blush-dark"
            />
            <button
              type="button"
              onClick={() => removePerson(i)}
              aria-label="Remove person"
              className="rounded-xl bg-cream px-3 text-sm text-ink/50 transition active:scale-[0.97]"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setNewPeople((prev) => [...prev, { name: "", emoji: "🙂" }])}
          className="self-start text-sm font-medium text-blush-dark transition active:scale-[0.97]"
        >
          + Add someone new
        </button>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-mint-dark px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.97]"
      >
        + Add trip
      </button>
    </form>
  );
}
