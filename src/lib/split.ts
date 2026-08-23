/**
 * Split `amount` evenly across `participantIds`, keeping the split's total
 * exactly equal to `amount` in cents (no floating-point drift). Any leftover
 * cent from integer division is handed to the lowest-id participants first,
 * so the same inputs always produce the same split.
 */
export function splitEqually(
  amount: number,
  participantIds: number[]
): Record<number, number> {
  const ids = [...participantIds].sort((a, b) => a - b);
  const n = ids.length;
  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;

  const result: Record<number, number> = {};
  ids.forEach((id, i) => {
    const cents = base + (i < remainder ? 1 : 0);
    result[id] = cents / 100;
  });
  return result;
}
