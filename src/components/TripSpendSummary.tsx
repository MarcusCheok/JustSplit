"use client";

import { useCurrentUser } from "./CurrentUserProvider";
import { computeTripSpend } from "@/lib/tripSpend";
import type { Expense, User } from "@/lib/types";

/**
 * An ongoing spend counter for the trip: total across everyone, plus just
 * the current device user's own share. Personalized to whoever's currently
 * using the device, same client-side pattern as TopCompanionCard.
 */
export function TripSpendSummary({
  expenses,
  exchangeRateToSgd,
}: {
  expenses: Expense[];
  exchangeRateToSgd: number;
}) {
  const { currentUser } = useCurrentUser();
  const me = currentUser as User;
  const { totalSgd, yourSgd } = computeTripSpend(me.id, expenses, exchangeRateToSgd);

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-black/5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">
          Total Trip Spend
        </span>
        <span className="text-lg font-bold">S${totalSgd.toFixed(2)}</span>
      </div>
      <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-mint p-3 text-center shadow-sm ring-1 ring-black/5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">
          Your Spend
        </span>
        <span className="text-lg font-bold">S${yourSgd.toFixed(2)}</span>
      </div>
    </div>
  );
}
