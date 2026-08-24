import type { Currency } from "./types";

/**
 * Converts an amount in `currency` to SGD using the rate locked in at the
 * time the expense was entered. SGD is the tabulation currency for now — all
 * balances, settlements, and stats are computed in SGD, only the raw
 * per-expense amount can be AUD.
 */
export function toSgd(
  amount: number,
  currency: Currency,
  exchangeRateToSgd: number
): number {
  const sgd = currency === "SGD" ? amount : amount * exchangeRateToSgd;
  return Math.round(sgd * 100) / 100;
}
