import { describe, it, expect } from "vitest";
import { computeCapybaraWeight, capybaraStage } from "./capybara";
import type { Trip } from "./types";

const marcusId = 1;

function trip(
  id: string,
  status: Trip["status"],
  closedAt: string | null,
  name = "Trip"
): Trip {
  return {
    id,
    name,
    status,
    country: null,
    exchange_rate_to_sgd: 1,
    created_at: "2024-01-01T00:00:00.000Z",
    closed_at: closedAt,
  };
}

describe("computeCapybaraWeight", () => {
  it("returns the base weight with no trips at all", () => {
    expect(computeCapybaraWeight(marcusId, [], [])).toBe(30);
  });

  it("ignores trips the user wasn't on", () => {
    const trips = [trip("t1", "closed", "2024-01-05T00:00:00.000Z")];
    const participantRows = [{ trip_id: "t1", user_id: 2 }]; // someone else
    expect(computeCapybaraWeight(marcusId, trips, participantRows)).toBe(30);
  });

  it("excludes a trip named General", () => {
    const trips = [trip("g1", "closed", "2024-01-05T00:00:00.000Z", "General")];
    const participantRows = [{ trip_id: "g1", user_id: marcusId }];
    expect(computeCapybaraWeight(marcusId, trips, participantRows)).toBe(30);
  });

  it("gains weight per trip, capped, and doesn't decay while currently traveling", () => {
    const trips = [
      trip("t1", "closed", "2024-01-05T00:00:00.000Z"),
      trip("t2", "open", null),
    ];
    const participantRows = [
      { trip_id: "t1", user_id: marcusId },
      { trip_id: "t2", user_id: marcusId },
    ];
    const today = new Date("2025-01-01T00:00:00.000Z"); // a year after t1 closed
    // 2 trips * 12 = 24 gain, base 30 -> 54, no decay since t2 is still open.
    expect(computeCapybaraWeight(marcusId, trips, participantRows, today)).toBe(54);
  });

  it("decays weight the longer it's been since the last trip closed", () => {
    const trips = [trip("t1", "closed", "2024-01-01T00:00:00.000Z")];
    const participantRows = [{ trip_id: "t1", user_id: marcusId }];
    // 1 trip -> +12 gain -> 42. 10 days later -> -5 decay -> 37.
    const tenDaysLater = new Date("2024-01-11T00:00:00.000Z");
    expect(computeCapybaraWeight(marcusId, trips, participantRows, tenDaysLater)).toBe(37);
  });

  it("never drops below the minimum weight after a long dry spell", () => {
    const trips = [trip("t1", "closed", "2024-01-01T00:00:00.000Z")];
    const participantRows = [{ trip_id: "t1", user_id: marcusId }];
    const muchLater = new Date("2026-01-01T00:00:00.000Z");
    expect(computeCapybaraWeight(marcusId, trips, participantRows, muchLater)).toBe(10);
  });

  it("caps gained weight after many trips", () => {
    const trips = Array.from({ length: 10 }, (_, i) =>
      trip(`t${i}`, "open", null)
    );
    const participantRows = trips.map((t) => ({ trip_id: t.id, user_id: marcusId }));
    // 10 trips * 12 = 120, capped at 60 gain -> 30 + 60 = 90, still traveling so no decay.
    expect(computeCapybaraWeight(marcusId, trips, participantRows)).toBe(90);
  });
});

describe("capybaraStage", () => {
  it("returns a distinct stage per weight band", () => {
    expect(capybaraStage(10).label).toBe("Ready for a trip");
    expect(capybaraStage(50).label).toBe("Steady traveler");
    expect(capybaraStage(70).label).toBe("Cozy capybara");
    expect(capybaraStage(95).label).toBe("Round & content");
  });

  it("scales up with weight", () => {
    expect(capybaraStage(10).scale).toBeLessThan(capybaraStage(50).scale);
    expect(capybaraStage(50).scale).toBeLessThan(capybaraStage(70).scale);
    expect(capybaraStage(70).scale).toBeLessThan(capybaraStage(95).scale);
  });
});
