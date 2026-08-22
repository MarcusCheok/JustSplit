import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTrip,
  getTripExpenses,
  getTripSettlements,
  getUsers,
} from "@/lib/data";
import { computeBalance } from "@/lib/balance";
import { closeTripAction, reopenTripAction } from "@/lib/actions";
import { BalanceText } from "@/components/BalanceText";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();

  const [users, expenses, settlements] = await Promise.all([
    getUsers(),
    getTripExpenses(id),
    getTripSettlements(id),
  ]);
  const balance = computeBalance(users, expenses, settlements);
  const userById = (userId: number) => users.find((u) => u.id === userId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/trips" className="text-sm text-ink/50">
          ← Trips
        </Link>
        <h1 className="text-xl font-bold">{trip.name}</h1>
      </div>

      <div className="rounded-2xl bg-lavender p-4 text-center font-medium">
        <BalanceText users={users} balance={balance} />
      </div>

      {trip.status === "open" ? (
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/trips/${id}/expenses/new`}
            className="rounded-2xl bg-mint-dark px-4 py-3 text-center font-semibold text-white"
          >
            + Add expense
          </Link>
          <Link
            href={`/trips/${id}/settle`}
            className="rounded-2xl bg-blush-dark px-4 py-3 text-center font-semibold text-white"
          >
            Settle up
          </Link>
        </div>
      ) : (
        <form action={reopenTripAction.bind(null, id)}>
          <button className="w-full rounded-2xl bg-white px-4 py-2 text-sm ring-1 ring-black/10">
            Reopen trip
          </button>
        </form>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
          Expenses
        </h2>
        {expenses.length === 0 && (
          <p className="text-sm text-ink/50">No expenses logged yet.</p>
        )}
        {expenses.map((expense) => {
          const payer = userById(expense.paid_by_user_id);
          return (
            <Link
              key={expense.id}
              href={`/trips/${id}/expenses/${expense.id}/edit`}
              className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex flex-col">
                <span className="font-medium">{expense.description}</span>
                <span className="text-xs text-ink/50">
                  {payer?.emoji} {payer?.name} · {expense.expense_date}
                  {expense.category ? ` · ${expense.category}` : ""}
                </span>
              </div>
              <span className="font-semibold">
                ${expense.amount.toFixed(2)}
              </span>
            </Link>
          );
        })}
      </section>

      {settlements.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
            Payments
          </h2>
          {settlements.map((s) => {
            const from = userById(s.from_user_id);
            const to = userById(s.to_user_id);
            return (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-2xl bg-white/60 p-3 text-sm"
              >
                <span>
                  {from?.emoji} {from?.name} → {to?.emoji} {to?.name}
                  {s.note ? ` · ${s.note}` : ""}
                </span>
                <span className="font-semibold">${s.amount.toFixed(2)}</span>
              </div>
            );
          })}
        </section>
      )}

      {trip.status === "open" && (
        <form action={closeTripAction.bind(null, id)} className="mt-2">
          <button className="w-full rounded-2xl bg-white px-4 py-2 text-sm text-ink/60 ring-1 ring-black/10">
            Close trip
          </button>
        </form>
      )}
    </div>
  );
}
