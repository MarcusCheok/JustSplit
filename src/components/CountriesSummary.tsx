"use client";

import { useCurrentUser } from "./CurrentUserProvider";
import { computeCountriesVisited } from "@/lib/analytics";
import type { Trip, User } from "@/lib/types";

/**
 * Airbnb-style "Countries Visited" cards, personalized to whoever's
 * currently using the device — same client-side pattern as
 * TripsSnapshotSummary/TopCompanionCard, since there's no server-side
 * "current user" concept in this app.
 */
export function CountriesSummary({
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

  const { totalCountries, topCountry } = computeCountriesVisited(
    me.id,
    trips,
    participantRows
  );

  if (totalCountries === 0) {
    return (
      <div className="rounded-2xl bg-lavender p-4 text-center text-sm">
        ✨ No countries logged yet — add a country to a trip and it&apos;ll show up
        here.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-black/5">
        <span className="text-3xl">🌍</span>
        <span className="text-2xl font-bold">{totalCountries}</span>
        <span className="text-xs text-ink/50">
          {totalCountries === 1 ? "country visited" : "countries visited"}
        </span>
      </div>
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-black/5">
        <span className="text-3xl">🏆</span>
        <span className="text-lg font-bold">{topCountry?.name}</span>
        <span className="text-xs text-ink/50">
          visited {topCountry?.count} time{topCountry?.count === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
