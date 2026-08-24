import type { User } from "@/lib/types";
import type { GroupBalance } from "@/lib/balance";

/**
 * Renders a group's simplified debts as "X owes Y $Z" lines. `compact`
 * collapses everything onto a single line (for trip-list cards) — the first
 * transaction plus a "+N more" suffix when there's more than one.
 */
export function BalanceSummary({
  participants,
  balance,
  compact,
}: {
  participants: User[];
  balance: GroupBalance;
  compact?: boolean;
}) {
  if (balance.transactions.length === 0) return <>All settled up 🎉</>;

  const userById = (id: number) => participants.find((p) => p.id === id);

  if (compact) {
    const [first, ...rest] = balance.transactions;
    const from = userById(first.fromUserId);
    const to = userById(first.toUserId);
    return (
      <>
        {from?.emoji} {from?.name} owes {to?.emoji} {to?.name}{" "}
        <span className="font-semibold text-ink">S${first.amount.toFixed(2)}</span>
        {rest.length > 0 ? ` · +${rest.length} more` : ""}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {balance.transactions.map((t, i) => {
        const from = userById(t.fromUserId);
        const to = userById(t.toUserId);
        return (
          <p key={i}>
            {from?.emoji} {from?.name} owes {to?.emoji} {to?.name}{" "}
            <span className="font-semibold text-ink">S${t.amount.toFixed(2)}</span>
          </p>
        );
      })}
    </div>
  );
}
