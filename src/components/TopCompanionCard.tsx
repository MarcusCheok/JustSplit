"use client";

import { useCurrentUser } from "./CurrentUserProvider";
import { computeTopCompanion } from "@/lib/analytics";
import type { Trip, User } from "@/lib/types";

/**
 * "People that you play most with," JustSplit-flavored: just the single #1
 * travel companion (most shared trips), not a ranked carousel. Personalized
 * to whoever's currently using the device, the same client-side pattern as
 * TripsSnapshotSummary — there's no server-side "current user" concept.
 */
export function TopCompanionCard({
  users,
  trips,
  participantRows,
}: {
  users: User[];
  trips: Trip[];
  participantRows: { trip_id: string; user_id: number }[];
}) {
  // Every (app) page is wrapped in CurrentUserProvider, which renders the
  // "who's this" picker instead of children until a user is selected — by
  // the time this component mounts, currentUser is guaranteed non-null.
  const { currentUser } = useCurrentUser();
  const me = currentUser as User;

  const companion = computeTopCompanion(me.id, users, trips, participantRows);
  if (!companion) return null;

  const { user, tripCount } = companion;

  return (
    <div
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
      aria-label={`Your top travel companion is ${user.name}, ${tripCount} trip${tripCount === 1 ? "" : "s"} together`}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lavender text-2xl">
        {user.emoji}
      </span>
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">
          🏆 Top travel companion
        </span>
        <span className="font-semibold">{user.name}</span>
        <span className="text-sm text-ink/60">
          {tripCount} trip{tripCount === 1 ? "" : "s"} together
        </span>
      </div>
    </div>
  );
}
