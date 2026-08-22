import type { User } from "@/lib/types";

export function BalanceText({
  users,
  balance,
}: {
  users: [User, User];
  balance: { net: number; owedByUserId: number | null; owedToUserId: number | null };
}) {
  if (balance.net === 0) return <>All settled up 🎉</>;

  const ower = users.find((u) => u.id === balance.owedByUserId);
  const owed = users.find((u) => u.id === balance.owedToUserId);

  return (
    <>
      {ower?.emoji} {ower?.name} owes {owed?.emoji} {owed?.name}{" "}
      <span className="font-semibold text-ink">
        ${Math.abs(balance.net).toFixed(2)}
      </span>
    </>
  );
}
