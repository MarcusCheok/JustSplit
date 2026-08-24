import type { Trip, User } from "./types";

export type TripsSnapshot = {
  tripCount: number; // F3 — excludes "General"
  medianSpendByUser: Record<number, number>; // one value per user, over trips they took part in
};

/**
 * Aggregate stats for the /trips/history snapshot block.
 * Pure function, no I/O — mirrors balance.ts / breakdown.ts.
 */
export function computeTripsSnapshot(
  users: User[],
  trips: Trip[],
  participantRows: { trip_id: string; user_id: number }[],
  expenseTotals: { trip_id: string; user_id: number; amount: number }[]
): TripsSnapshot {
  const countedTrips = trips.filter((t) => t.name !== "General");

  const participantsByTrip = new Map<string, Set<number>>();
  for (const row of participantRows) {
    const set = participantsByTrip.get(row.trip_id) ?? new Set<number>();
    set.add(row.user_id);
    participantsByTrip.set(row.trip_id, set);
  }

  // Sum each user's split share (their real cost, not who fronted the cash)
  // per trip in one pass (Map keyed by `${tripId}:${userId}`), then read one
  // number per user per counted trip they actually took part in.
  const spendByTripAndUser = new Map<string, number>();
  for (const e of expenseTotals) {
    const key = `${e.trip_id}:${e.user_id}`;
    spendByTripAndUser.set(key, (spendByTripAndUser.get(key) ?? 0) + e.amount);
  }

  const medianSpendByUser: Record<number, number> = {};
  for (const user of users) {
    const perTrip = countedTrips
      .filter((t) => participantsByTrip.get(t.id)?.has(user.id))
      .map((t) =>
        round2(spendByTripAndUser.get(`${t.id}:${user.id}`) ?? 0)
      );
    medianSpendByUser[user.id] = median(perTrip);
  }

  return {
    tripCount: countedTrips.length,
    medianSpendByUser,
  };
}

export type TopCompanion = {
  user: User;
  tripCount: number;
};

/**
 * The single person `meId` has shared the most counted trips with — not a
 * ranked list, just the #1 (ties broken by whichever companion id sorts
 * first among the tied leaders, for determinism).
 */
export function computeTopCompanion(
  meId: number,
  users: User[],
  trips: Trip[],
  participantRows: { trip_id: string; user_id: number }[]
): TopCompanion | null {
  const countedTripIds = new Set(
    trips.filter((t) => t.name !== "General").map((t) => t.id)
  );

  const participantsByTrip = new Map<string, number[]>();
  for (const row of participantRows) {
    if (!countedTripIds.has(row.trip_id)) continue;
    const list = participantsByTrip.get(row.trip_id) ?? [];
    list.push(row.user_id);
    participantsByTrip.set(row.trip_id, list);
  }

  const tripCountByCompanion = new Map<number, number>();
  for (const participantIds of participantsByTrip.values()) {
    if (!participantIds.includes(meId)) continue;
    for (const userId of participantIds) {
      if (userId === meId) continue;
      tripCountByCompanion.set(
        userId,
        (tripCountByCompanion.get(userId) ?? 0) + 1
      );
    }
  }

  let best: { userId: number; tripCount: number } | null = null;
  for (const [userId, tripCount] of tripCountByCompanion) {
    if (
      !best ||
      tripCount > best.tripCount ||
      (tripCount === best.tripCount && userId < best.userId)
    ) {
      best = { userId, tripCount };
    }
  }
  if (!best) return null;

  const user = users.find((u) => u.id === best!.userId);
  if (!user) return null;

  return { user, tripCount: best.tripCount };
}

export type CountriesVisited = {
  totalCountries: number;
  topCountry: { name: string; count: number } | null;
};

/**
 * How many distinct countries `meId` has visited (via counted trips they
 * were on) and which one they've been to most. Trips with no country set
 * are simply excluded from the count — there's no requirement to backfill
 * every trip for this to work.
 */
export function computeCountriesVisited(
  meId: number,
  trips: Trip[],
  participantRows: { trip_id: string; user_id: number }[]
): CountriesVisited {
  const myTripIds = new Set(
    participantRows.filter((r) => r.user_id === meId).map((r) => r.trip_id)
  );

  const countByCountry = new Map<string, number>();
  for (const trip of trips) {
    if (trip.name === "General") continue;
    if (!myTripIds.has(trip.id)) continue;
    const country = trip.country?.trim();
    if (!country) continue;
    countByCountry.set(country, (countByCountry.get(country) ?? 0) + 1);
  }

  let topCountry: { name: string; count: number } | null = null;
  for (const [name, count] of countByCountry) {
    if (
      !topCountry ||
      count > topCountry.count ||
      (count === topCountry.count && name < topCountry.name)
    ) {
      topCountry = { name, count };
    }
  }

  return { totalCountries: countByCountry.size, topCountry };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return round2(m);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
