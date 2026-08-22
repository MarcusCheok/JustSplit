"use client";

import { useCurrentUser } from "@/components/CurrentUserProvider";
import type { User } from "@/lib/types";

/**
 * Personalizes the already-computed /trips/history snapshot numbers to
 * whichever person is currently using the device (via CurrentUserProvider /
 * localStorage — there's no server-side "current user" concept, see PRD §2).
 * No data fetching here: tripCount and medianSpendByUser are passed in as
 * server-computed props from computeTripsSnapshot(), unchanged.
 */
export function TripsSnapshotSummary({
  tripCount,
  medianSpendByUser,
}: {
  tripCount: number;
  medianSpendByUser: Record<number, number>;
}) {
  // Every (app) page is wrapped in CurrentUserProvider, which renders the
  // "who's this" picker instead of children until a user is selected — by
  // the time this component mounts, currentUser is guaranteed non-null.
  const { currentUser } = useCurrentUser();
  const me = currentUser as User;
  const mySpend = medianSpendByUser[me.id] ?? 0;

  return (
    <>
      <p
        className="text-center font-medium"
        aria-label={`You've logged ${tripCount} trip${tripCount === 1 ? "" : "s"}`}
      >
        🧳 You&apos;ve logged {tripCount} trip{tripCount === 1 ? "" : "s"}
      </p>

      <div className="flex flex-col gap-1.5 rounded-xl bg-white/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
          Typical spend per trip
        </p>
        {mySpend === 0 ? (
          <p className="text-sm text-ink/60">Nothing logged yet.</p>
        ) : (
          <p
            className="text-sm"
            aria-label={`You typically spend $${mySpend.toFixed(2)} per trip`}
          >
            {me.emoji} You typically spend{" "}
            <span className="font-semibold">${mySpend.toFixed(2)}</span>
          </p>
        )}
        <p className="text-xs text-ink/40">
          Based on your share of each trip&apos;s costs, not who paid at checkout.
        </p>
      </div>
    </>
  );
}
