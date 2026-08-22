import type { User } from "@/lib/types";
import type { CategoryRow } from "@/lib/breakdown";

export function CategoryBreakdownTable({
  users,
  rows,
  totals,
}: {
  users: [User, User];
  rows: CategoryRow[];
  totals: Record<number, number>;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink/50">No expenses logged yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-ink/50">
            <th className="p-3 font-medium">Category</th>
            {users.map((u) => (
              <th key={u.id} className="p-3 text-right font-medium">
                {u.emoji} {u.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black/5 font-semibold">
            <td className="p-3">Total</td>
            {users.map((u) => (
              <td key={u.id} className="p-3 text-right">
                ${(totals[u.id] ?? 0).toFixed(2)}
              </td>
            ))}
          </tr>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-black/5 last:border-0">
              <td className="p-3 text-ink/70">{row.label}</td>
              {users.map((u) => (
                <td key={u.id} className="p-3 text-right text-ink/70">
                  {row.amounts[u.id] ? `$${row.amounts[u.id].toFixed(2)}` : "–"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
