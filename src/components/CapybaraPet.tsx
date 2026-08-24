"use client";

import { useState } from "react";
import { useCurrentUser } from "./CurrentUserProvider";
import { computeCapybaraWeight, capybaraStage } from "@/lib/capybara";
import type { Trip, User } from "@/lib/types";

/**
 * A small, purely-cosmetic pet — no gameplay, just a fun reflection of how
 * much you've been traveling lately. Personalized to whoever's currently
 * using the device, same client-side pattern as TopCompanionCard.
 */
export function CapybaraPet({
  trips,
  participantRows,
}: {
  trips: Trip[];
  participantRows: { trip_id: string; user_id: number }[];
}) {
  // Every (app) page is wrapped in CurrentUserProvider, which renders the
  // "who's this" picker instead of children until a user is selected — by
  // the time this component mounts, currentUser is guaranteed non-null.
  const { currentUser } = useCurrentUser();
  const me = currentUser as User;

  const weight = computeCapybaraWeight(me.id, trips, participantRows);
  const stage = capybaraStage(weight);
  const [messageIndex, setMessageIndex] = useState<number | null>(null);

  return (
    <button
      type="button"
      onClick={() =>
        setMessageIndex((i) => ((i ?? -1) + 1) % stage.messages.length)
      }
      className="flex flex-col items-center gap-1 rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-black/5 transition active:scale-[0.97]"
      aria-label={`Your capybara: ${stage.label}. Tap for a message.`}
    >
      <span
        className="leading-none transition-transform"
        style={{ fontSize: `${2.5 * stage.scale}rem` }}
      >
        🦫
      </span>
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">
        {stage.label}
      </span>
      <span className="min-h-4 text-xs text-ink/60 italic">
        {messageIndex === null ? "Tap me!" : stage.messages[messageIndex]}
      </span>
    </button>
  );
}
