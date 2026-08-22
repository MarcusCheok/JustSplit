import { describe, it, expect } from "vitest";
import { computeTripsSnapshot } from "./analytics";
import type { Trip, User } from "./types";

const marcus: User = { id: 1, name: "Marcus", emoji: "🧑", color: "blue" };
const partner: User = { id: 2, name: "Partner", emoji: "🧑‍🦰", color: "pink" };
const users: [User, User] = [marcus, partner];

function trip(id: string, name = "Trip", status: Trip["status"] = "open"): Trip {
  return {
    id,
    name,
    status,
    created_at: "2024-01-01T00:00:00.000Z",
    closed_at: status === "closed" ? "2024-01-02T00:00:00.000Z" : null,
  };
}

describe("computeTripsSnapshot", () => {
  it("returns all zeros for zero trips", () => {
    const snapshot = computeTripsSnapshot(users, [], []);
    expect(snapshot.tripCount).toBe(0);
    expect(snapshot.tripsTogetherCount).toBe(0);
    expect(snapshot.medianPaidByUser[marcus.id]).toBe(0);
    expect(snapshot.medianPaidByUser[partner.id]).toBe(0);
  });

  it("computes median as the single value for one trip", () => {
    const trips = [trip("t1")];
    const expenseTotals = [
      { trip_id: "t1", paid_by_user_id: marcus.id, amount: 100 },
      { trip_id: "t1", paid_by_user_id: partner.id, amount: 50 },
    ];
    const snapshot = computeTripsSnapshot(users, trips, expenseTotals);
    expect(snapshot.tripCount).toBe(1);
    expect(snapshot.tripsTogetherCount).toBe(1);
    expect(snapshot.medianPaidByUser[marcus.id]).toBe(100);
    expect(snapshot.medianPaidByUser[partner.id]).toBe(50);
  });

  it("computes median as the middle value for an odd trip count", () => {
    const trips = [trip("t1"), trip("t2"), trip("t3")];
    // Marcus paid 10, 20, 30 across the three trips -> median 20.
    const expenseTotals = [
      { trip_id: "t1", paid_by_user_id: marcus.id, amount: 30 },
      { trip_id: "t2", paid_by_user_id: marcus.id, amount: 10 },
      { trip_id: "t3", paid_by_user_id: marcus.id, amount: 20 },
    ];
    const snapshot = computeTripsSnapshot(users, trips, expenseTotals);
    expect(snapshot.tripCount).toBe(3);
    expect(snapshot.medianPaidByUser[marcus.id]).toBe(20);
  });

  it("computes median as the average of the two middle values for an even trip count", () => {
    const trips = [trip("t1"), trip("t2"), trip("t3"), trip("t4")];
    // Marcus paid 10, 20, 30, 40 -> sorted [10,20,30,40] -> median (20+30)/2 = 25.
    const expenseTotals = [
      { trip_id: "t1", paid_by_user_id: marcus.id, amount: 40 },
      { trip_id: "t2", paid_by_user_id: marcus.id, amount: 10 },
      { trip_id: "t3", paid_by_user_id: marcus.id, amount: 30 },
      { trip_id: "t4", paid_by_user_id: marcus.id, amount: 20 },
    ];
    const snapshot = computeTripsSnapshot(users, trips, expenseTotals);
    expect(snapshot.tripCount).toBe(4);
    expect(snapshot.medianPaidByUser[marcus.id]).toBe(25);
  });

  it("treats a trip with zero logged expenses as a real $0 data point, not a skip", () => {
    // Three trips; Marcus only paid on two of them. The third (zero-expense) trip
    // must count as a 0 in the median list, not be excluded from it.
    const trips = [trip("t1"), trip("t2"), trip("t3")];
    const expenseTotals = [
      { trip_id: "t1", paid_by_user_id: marcus.id, amount: 100 },
      { trip_id: "t2", paid_by_user_id: marcus.id, amount: 200 },
      // t3: no expenses at all for Marcus (or anyone).
    ];
    const snapshot = computeTripsSnapshot(users, trips, expenseTotals);
    // Sorted per-trip values for Marcus: [0, 100, 200] -> median 100.
    expect(snapshot.medianPaidByUser[marcus.id]).toBe(100);
    // Confirm this differs from what it would be if the zero-expense trip were
    // skipped entirely (median of [100, 200] would be 150).
    expect(snapshot.medianPaidByUser[marcus.id]).not.toBe(150);
  });

  it("excludes a trip named General from tripCount, tripsTogetherCount, and medians", () => {
    const trips = [trip("g1", "General"), trip("t1"), trip("t2")];
    const expenseTotals = [
      // Huge amount on General — must not leak into the median or count.
      { trip_id: "g1", paid_by_user_id: marcus.id, amount: 999999 },
      { trip_id: "t1", paid_by_user_id: marcus.id, amount: 100 },
      { trip_id: "t2", paid_by_user_id: marcus.id, amount: 300 },
    ];
    const snapshot = computeTripsSnapshot(users, trips, expenseTotals);
    expect(snapshot.tripCount).toBe(2);
    expect(snapshot.tripsTogetherCount).toBe(2);
    // Median of [100, 300] = 200, not influenced by the 999999 on General.
    expect(snapshot.medianPaidByUser[marcus.id]).toBe(200);
  });

  it("returns tripCount 0 (empty-state trigger) when only a General trip exists", () => {
    const trips = [trip("g1", "General")];
    const expenseTotals = [
      { trip_id: "g1", paid_by_user_id: marcus.id, amount: 50 },
    ];
    const snapshot = computeTripsSnapshot(users, trips, expenseTotals);
    expect(snapshot.tripCount).toBe(0);
    expect(snapshot.tripsTogetherCount).toBe(0);
    expect(snapshot.medianPaidByUser[marcus.id]).toBe(0);
    expect(snapshot.medianPaidByUser[partner.id]).toBe(0);
  });

  it("returns 0 for both users when no expenses have been logged on any counted trip", () => {
    const trips = [trip("t1"), trip("t2")];
    const snapshot = computeTripsSnapshot(users, trips, []);
    expect(snapshot.tripCount).toBe(2);
    expect(snapshot.medianPaidByUser[marcus.id]).toBe(0);
    expect(snapshot.medianPaidByUser[partner.id]).toBe(0);
  });

  it("rounds to 2 decimal places and does not let floating point drift leak through", () => {
    const trips = [trip("t1"), trip("t2"), trip("t3")];
    const expenseTotals = [
      { trip_id: "t1", paid_by_user_id: marcus.id, amount: 0.1 },
      { trip_id: "t1", paid_by_user_id: marcus.id, amount: 0.2 },
      { trip_id: "t2", paid_by_user_id: marcus.id, amount: 10.005 },
      { trip_id: "t3", paid_by_user_id: marcus.id, amount: 5 },
    ];
    const snapshot = computeTripsSnapshot(users, trips, expenseTotals);
    // t1 sums to 0.1 + 0.2 = 0.3 (would be 0.30000000000000004 unrounded).
    // Per-trip values: [0.3, 10.005 -> rounds to 10, 5] sorted -> [0.3, 5, 10] -> median 5.
    expect(snapshot.medianPaidByUser[marcus.id]).toBe(5);
  });

  it("computes independent medians per user on the same trip set", () => {
    const trips = [trip("t1"), trip("t2")];
    const expenseTotals = [
      { trip_id: "t1", paid_by_user_id: marcus.id, amount: 400 },
      { trip_id: "t2", paid_by_user_id: marcus.id, amount: 600 },
      { trip_id: "t1", paid_by_user_id: partner.id, amount: 10 },
      { trip_id: "t2", paid_by_user_id: partner.id, amount: 90 },
    ];
    const snapshot = computeTripsSnapshot(users, trips, expenseTotals);
    // Marcus: [400,600] -> 500. Partner: [10,90] -> 50.
    expect(snapshot.medianPaidByUser[marcus.id]).toBe(500);
    expect(snapshot.medianPaidByUser[partner.id]).toBe(50);
  });
});
