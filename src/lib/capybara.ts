import type { Trip } from "./types";

const BASE_WEIGHT = 30;
const MIN_WEIGHT = 10;
const MAX_WEIGHT = 100;
const GAIN_PER_TRIP = 12;
const MAX_GAIN = 60;
const DECAY_PER_DAY = 0.5;
const MAX_LOSS = 55;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A small just-for-fun pet: gains weight for every trip `meId` has been on,
 * loses it gradually the longer it's been since their last trip ended (no
 * loss while they're currently on an open trip — the capybara doesn't diet
 * mid-vacation). Deterministic and stateless, like the rest of this app's
 * stats — recomputed from trip history each time rather than stored.
 */
export function computeCapybaraWeight(
  meId: number,
  trips: Trip[],
  participantRows: { trip_id: string; user_id: number }[],
  today: Date = new Date()
): number {
  const myTripIds = new Set(
    participantRows.filter((r) => r.user_id === meId).map((r) => r.trip_id)
  );
  const myTrips = trips.filter((t) => t.name !== "General" && myTripIds.has(t.id));

  if (myTrips.length === 0) return BASE_WEIGHT;

  const gained = Math.min(myTrips.length * GAIN_PER_TRIP, MAX_GAIN);
  const isCurrentlyTraveling = myTrips.some((t) => t.status === "open");

  if (isCurrentlyTraveling) {
    return clamp(BASE_WEIGHT + gained, MIN_WEIGHT, MAX_WEIGHT);
  }

  const closedTimes = myTrips
    .filter((t) => t.closed_at)
    .map((t) => new Date(t.closed_at!).getTime());
  if (closedTimes.length === 0) {
    return clamp(BASE_WEIGHT + gained, MIN_WEIGHT, MAX_WEIGHT);
  }

  const daysSince = Math.max(0, (today.getTime() - Math.max(...closedTimes)) / MS_PER_DAY);
  const lost = Math.min(daysSince * DECAY_PER_DAY, MAX_LOSS);

  return clamp(Math.round(BASE_WEIGHT + gained - lost), MIN_WEIGHT, MAX_WEIGHT);
}

export type CapybaraStage = {
  label: string;
  scale: number;
  messages: string[];
};

/** Maps a 0-100 weight to a playful stage — display copy, not a game mechanic. */
export function capybaraStage(weight: number): CapybaraStage {
  if (weight >= 85) {
    return {
      label: "Round & content",
      scale: 1.45,
      messages: [
        "So many trips. So little regret.",
        "I have transcended into a perfect sphere.",
        "Peak capybara. Nowhere to go but... more trips.",
      ],
    };
  }
  if (weight >= 65) {
    return {
      label: "Cozy capybara",
      scale: 1.2,
      messages: [
        "Comfortably padded from all that travel.",
        "Ask me about my last trip. Please.",
        "I could stand to gain a little more, honestly.",
      ],
    };
  }
  if (weight >= 40) {
    return {
      label: "Steady traveler",
      scale: 1,
      messages: [
        "Cruising at a healthy travel weight.",
        "Not fat, not skinny. Just capybara.",
        "Been a minute since the last trip, huh?",
      ],
    };
  }
  return {
    label: "Ready for a trip",
    scale: 0.85,
    messages: [
      "It's been a while... I'm getting restless.",
      "Feed me a trip. Any trip.",
      "Lean season. Time to plan something.",
    ],
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
