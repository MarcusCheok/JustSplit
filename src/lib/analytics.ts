import type { Trip, User } from "./types";

export type TripsSnapshot = {
  tripCount: number; // F3 — excludes "General"
  medianPaidByUser: Record<number, number>; // F4 — one value per user id, excludes "General"
  tripsTogetherCount: number; // F5 — identical to tripCount, see PRD rationale
};

/**
 * Aggregate stats for the /trips/history snapshot block.
 * Pure function, no I/O — mirrors balance.ts / breakdown.ts.
 */
export function computeTripsSnapshot(
  users: [User, User],
  trips: Trip[],
  expenseTotals: { trip_id: string; paid_by_user_id: number; amount: number }[]
): TripsSnapshot {
  const countedTrips = trips.filter((t) => t.name !== "General");

  // Sum paid-by-user-per-trip in one pass (Map keyed by `${tripId}:${userId}`),
  // then read one number per user per counted trip (0 if they paid nothing that trip).
  const paidByTripAndUser = new Map<string, number>();
  for (const e of expenseTotals) {
    const key = `${e.trip_id}:${e.paid_by_user_id}`;
    paidByTripAndUser.set(key, (paidByTripAndUser.get(key) ?? 0) + e.amount);
  }

  const medianPaidByUser: Record<number, number> = {};
  for (const user of users) {
    const perTrip = countedTrips.map((t) =>
      round2(paidByTripAndUser.get(`${t.id}:${user.id}`) ?? 0)
    );
    medianPaidByUser[user.id] = median(perTrip);
  }

  return {
    tripCount: countedTrips.length,
    medianPaidByUser,
    tripsTogetherCount: countedTrips.length, // F5 collapses into F3 — see PRD rationale
  };
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
