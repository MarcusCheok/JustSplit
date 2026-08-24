import { describe, it, expect } from "vitest";
import {
  computeTripsSnapshot,
  computeTopCompanion,
  computeCountriesVisited,
} from "./analytics";
import type { Trip, User } from "./types";

const marcus: User = { id: 1, name: "Marcus", emoji: "🧑", color: "blue" };
const partner: User = { id: 2, name: "Partner", emoji: "🧑‍🦰", color: "pink" };
const friend: User = { id: 3, name: "Friend", emoji: "🧑‍🎤", color: "peach" };
const users: User[] = [marcus, partner];

function trip(
  id: string,
  name = "Trip",
  status: Trip["status"] = "open",
  country: string | null = null
): Trip {
  return {
    id,
    name,
    status,
    country,
    created_at: "2024-01-01T00:00:00.000Z",
    closed_at: status === "closed" ? "2024-01-02T00:00:00.000Z" : null,
  };
}

/** participant rows putting both Marcus and Partner on every given trip id. */
function bothOn(tripIds: string[]) {
  return tripIds.flatMap((tripId) => [
    { trip_id: tripId, user_id: marcus.id },
    { trip_id: tripId, user_id: partner.id },
  ]);
}

describe("computeTripsSnapshot", () => {
  it("returns all zeros for zero trips", () => {
    const snapshot = computeTripsSnapshot(users, [], [], []);
    expect(snapshot.tripCount).toBe(0);
    expect(snapshot.medianSpendByUser[marcus.id]).toBe(0);
    expect(snapshot.medianSpendByUser[partner.id]).toBe(0);
  });

  it("computes median as the single value for one trip", () => {
    const trips = [trip("t1")];
    const expenseTotals = [
      { trip_id: "t1", user_id: marcus.id, amount: 100 },
      { trip_id: "t1", user_id: partner.id, amount: 50 },
    ];
    const snapshot = computeTripsSnapshot(users, trips, bothOn(["t1"]), expenseTotals);
    expect(snapshot.tripCount).toBe(1);
    expect(snapshot.medianSpendByUser[marcus.id]).toBe(100);
    expect(snapshot.medianSpendByUser[partner.id]).toBe(50);
  });

  it("computes median as the middle value for an odd trip count", () => {
    const trips = [trip("t1"), trip("t2"), trip("t3")];
    // Marcus paid 10, 20, 30 across the three trips -> median 20.
    const expenseTotals = [
      { trip_id: "t1", user_id: marcus.id, amount: 30 },
      { trip_id: "t2", user_id: marcus.id, amount: 10 },
      { trip_id: "t3", user_id: marcus.id, amount: 20 },
    ];
    const participantRows = bothOn(["t1", "t2", "t3"]);
    const snapshot = computeTripsSnapshot(users, trips, participantRows, expenseTotals);
    expect(snapshot.tripCount).toBe(3);
    expect(snapshot.medianSpendByUser[marcus.id]).toBe(20);
  });

  it("computes median as the average of the two middle values for an even trip count", () => {
    const trips = [trip("t1"), trip("t2"), trip("t3"), trip("t4")];
    // Marcus paid 10, 20, 30, 40 -> sorted [10,20,30,40] -> median (20+30)/2 = 25.
    const expenseTotals = [
      { trip_id: "t1", user_id: marcus.id, amount: 40 },
      { trip_id: "t2", user_id: marcus.id, amount: 10 },
      { trip_id: "t3", user_id: marcus.id, amount: 30 },
      { trip_id: "t4", user_id: marcus.id, amount: 20 },
    ];
    const participantRows = bothOn(["t1", "t2", "t3", "t4"]);
    const snapshot = computeTripsSnapshot(users, trips, participantRows, expenseTotals);
    expect(snapshot.tripCount).toBe(4);
    expect(snapshot.medianSpendByUser[marcus.id]).toBe(25);
  });

  it("treats a trip with zero logged expenses as a real $0 data point, not a skip", () => {
    // Three trips; Marcus is on all three but only paid on two. The third
    // (zero-expense) trip must count as a 0 in the median list, not be
    // excluded from it.
    const trips = [trip("t1"), trip("t2"), trip("t3")];
    const expenseTotals = [
      { trip_id: "t1", user_id: marcus.id, amount: 100 },
      { trip_id: "t2", user_id: marcus.id, amount: 200 },
      // t3: no expenses at all for Marcus (or anyone).
    ];
    const participantRows = bothOn(["t1", "t2", "t3"]);
    const snapshot = computeTripsSnapshot(users, trips, participantRows, expenseTotals);
    // Sorted per-trip values for Marcus: [0, 100, 200] -> median 100.
    expect(snapshot.medianSpendByUser[marcus.id]).toBe(100);
    // Confirm this differs from what it would be if the zero-expense trip were
    // skipped entirely (median of [100, 200] would be 150).
    expect(snapshot.medianSpendByUser[marcus.id]).not.toBe(150);
  });

  it("excludes trips a user didn't participate in from their own median", () => {
    const trips = [trip("t1"), trip("t2"), trip("t3")];
    // Marcus is on all three trips; Partner only joined t1 and t2.
    const participantRows = [
      ...bothOn(["t1", "t2"]),
      { trip_id: "t3", user_id: marcus.id },
    ];
    const expenseTotals = [
      { trip_id: "t1", user_id: marcus.id, amount: 100 },
      { trip_id: "t2", user_id: marcus.id, amount: 100 },
      { trip_id: "t3", user_id: marcus.id, amount: 900 },
      { trip_id: "t1", user_id: partner.id, amount: 10 },
      { trip_id: "t2", user_id: partner.id, amount: 20 },
    ];
    const snapshot = computeTripsSnapshot(users, trips, participantRows, expenseTotals);
    // tripCount stays global (all 3 counted trips), but Partner's median only
    // draws from the 2 trips they were actually on: [10, 20] -> 15.
    expect(snapshot.tripCount).toBe(3);
    expect(snapshot.medianSpendByUser[partner.id]).toBe(15);
  });

  it("excludes a trip named General from tripCount and medians", () => {
    const trips = [trip("g1", "General"), trip("t1"), trip("t2")];
    const expenseTotals = [
      // Huge amount on General — must not leak into the median or count.
      { trip_id: "g1", user_id: marcus.id, amount: 999999 },
      { trip_id: "t1", user_id: marcus.id, amount: 100 },
      { trip_id: "t2", user_id: marcus.id, amount: 300 },
    ];
    const participantRows = bothOn(["g1", "t1", "t2"]);
    const snapshot = computeTripsSnapshot(users, trips, participantRows, expenseTotals);
    expect(snapshot.tripCount).toBe(2);
    // Median of [100, 300] = 200, not influenced by the 999999 on General.
    expect(snapshot.medianSpendByUser[marcus.id]).toBe(200);
  });

  it("returns tripCount 0 (empty-state trigger) when only a General trip exists", () => {
    const trips = [trip("g1", "General")];
    const expenseTotals = [{ trip_id: "g1", user_id: marcus.id, amount: 50 }];
    const participantRows = bothOn(["g1"]);
    const snapshot = computeTripsSnapshot(users, trips, participantRows, expenseTotals);
    expect(snapshot.tripCount).toBe(0);
    expect(snapshot.medianSpendByUser[marcus.id]).toBe(0);
    expect(snapshot.medianSpendByUser[partner.id]).toBe(0);
  });

  it("returns 0 for both users when no expenses have been logged on any counted trip", () => {
    const trips = [trip("t1"), trip("t2")];
    const participantRows = bothOn(["t1", "t2"]);
    const snapshot = computeTripsSnapshot(users, trips, participantRows, []);
    expect(snapshot.tripCount).toBe(2);
    expect(snapshot.medianSpendByUser[marcus.id]).toBe(0);
    expect(snapshot.medianSpendByUser[partner.id]).toBe(0);
  });

  it("rounds to 2 decimal places and does not let floating point drift leak through", () => {
    const trips = [trip("t1"), trip("t2"), trip("t3")];
    const expenseTotals = [
      { trip_id: "t1", user_id: marcus.id, amount: 0.1 },
      { trip_id: "t1", user_id: marcus.id, amount: 0.2 },
      { trip_id: "t2", user_id: marcus.id, amount: 10.005 },
      { trip_id: "t3", user_id: marcus.id, amount: 5 },
    ];
    const participantRows = bothOn(["t1", "t2", "t3"]);
    const snapshot = computeTripsSnapshot(users, trips, participantRows, expenseTotals);
    // t1 sums to 0.1 + 0.2 = 0.3 (would be 0.30000000000000004 unrounded).
    // Per-trip values: [0.3, 10.005 -> rounds to 10, 5] sorted -> [0.3, 5, 10] -> median 5.
    expect(snapshot.medianSpendByUser[marcus.id]).toBe(5);
  });

  it("computes independent medians per user on the same trip set", () => {
    const trips = [trip("t1"), trip("t2")];
    const expenseTotals = [
      { trip_id: "t1", user_id: marcus.id, amount: 400 },
      { trip_id: "t2", user_id: marcus.id, amount: 600 },
      { trip_id: "t1", user_id: partner.id, amount: 10 },
      { trip_id: "t2", user_id: partner.id, amount: 90 },
    ];
    const participantRows = bothOn(["t1", "t2"]);
    const snapshot = computeTripsSnapshot(users, trips, participantRows, expenseTotals);
    // Marcus: [400,600] -> 500. Partner: [10,90] -> 50.
    expect(snapshot.medianSpendByUser[marcus.id]).toBe(500);
    expect(snapshot.medianSpendByUser[partner.id]).toBe(50);
  });
});

describe("computeTopCompanion", () => {
  it("returns null when the user has no counted trips", () => {
    expect(computeTopCompanion(marcus.id, users, [], [])).toBeNull();
  });

  it("returns null when the user's only trips have no other participants", () => {
    const trips = [trip("t1")];
    const participantRows = [{ trip_id: "t1", user_id: marcus.id }];
    expect(computeTopCompanion(marcus.id, users, trips, participantRows)).toBeNull();
  });

  it("picks the companion shared on the most trips", () => {
    const trips = [trip("t1"), trip("t2"), trip("t3")];
    const participantRows = [
      ...bothOn(["t1", "t2"]),
      { trip_id: "t3", user_id: marcus.id },
      { trip_id: "t3", user_id: friend.id },
    ];
    const result = computeTopCompanion(
      marcus.id,
      [marcus, partner, friend],
      trips,
      participantRows
    );
    expect(result?.user.id).toBe(partner.id);
    expect(result?.tripCount).toBe(2);
  });

  it("excludes a trip named General from the companion count", () => {
    const trips = [trip("g1", "General"), trip("t1")];
    const participantRows = bothOn(["g1", "t1"]);
    const result = computeTopCompanion(marcus.id, users, trips, participantRows);
    expect(result?.tripCount).toBe(1);
  });

  it("breaks ties by the lower user id, deterministically", () => {
    const trips = [trip("t1"), trip("t2")];
    const participantRows = [
      { trip_id: "t1", user_id: marcus.id },
      { trip_id: "t1", user_id: friend.id }, // id 3
      { trip_id: "t2", user_id: marcus.id },
      { trip_id: "t2", user_id: partner.id }, // id 2, tied at 1 trip each
    ];
    const result = computeTopCompanion(
      marcus.id,
      [marcus, partner, friend],
      trips,
      participantRows
    );
    expect(result?.user.id).toBe(partner.id);
  });
});

describe("computeCountriesVisited", () => {
  it("returns zero/null when the user has no counted trips", () => {
    const result = computeCountriesVisited(marcus.id, [], []);
    expect(result).toEqual({ totalCountries: 0, topCountry: null });
  });

  it("ignores trips with no country set", () => {
    const trips = [trip("t1", "Trip", "open", null)];
    const participantRows = [{ trip_id: "t1", user_id: marcus.id }];
    const result = computeCountriesVisited(marcus.id, trips, participantRows);
    expect(result).toEqual({ totalCountries: 0, topCountry: null });
  });

  it("counts distinct countries and finds the most-visited one", () => {
    const trips = [
      trip("t1", "Trip", "closed", "Japan"),
      trip("t2", "Trip", "closed", "Japan"),
      trip("t3", "Trip", "closed", "Australia"),
    ];
    const participantRows = [
      { trip_id: "t1", user_id: marcus.id },
      { trip_id: "t2", user_id: marcus.id },
      { trip_id: "t3", user_id: marcus.id },
    ];
    const result = computeCountriesVisited(marcus.id, trips, participantRows);
    expect(result.totalCountries).toBe(2);
    expect(result.topCountry).toEqual({ name: "Japan", count: 2 });
  });

  it("only counts trips the user actually participated in", () => {
    const trips = [
      trip("t1", "Trip", "closed", "Japan"),
      trip("t2", "Trip", "closed", "Australia"),
    ];
    // Marcus only on t1; t2 (Partner's solo trip) shouldn't count for him.
    const participantRows = [
      { trip_id: "t1", user_id: marcus.id },
      { trip_id: "t2", user_id: partner.id },
    ];
    const result = computeCountriesVisited(marcus.id, trips, participantRows);
    expect(result.totalCountries).toBe(1);
    expect(result.topCountry).toEqual({ name: "Japan", count: 1 });
  });

  it("excludes a trip named General", () => {
    const trips = [trip("g1", "General", "open", "Singapore")];
    const participantRows = [{ trip_id: "g1", user_id: marcus.id }];
    const result = computeCountriesVisited(marcus.id, trips, participantRows);
    expect(result).toEqual({ totalCountries: 0, topCountry: null });
  });

  it("breaks a tie between equally-visited countries alphabetically", () => {
    const trips = [
      trip("t1", "Trip", "closed", "Japan"),
      trip("t2", "Trip", "closed", "Australia"),
    ];
    const participantRows = [
      { trip_id: "t1", user_id: marcus.id },
      { trip_id: "t2", user_id: marcus.id },
    ];
    const result = computeCountriesVisited(marcus.id, trips, participantRows);
    expect(result.topCountry).toEqual({ name: "Australia", count: 1 });
  });
});
