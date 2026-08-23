import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTrip,
  getTripExpenses,
  getTripSettlements,
  getTripParticipants,
} from "@/lib/data";
import { computeGroupBalance } from "@/lib/balance";
import { categoryEmoji } from "@/lib/types";
import { closeTripAction, reopenTripAction } from "@/lib/actions";
import { BalanceSummary } from "@/components/BalanceSummary";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();

  const [participants, expenses, settlements] = await Promise.all([
    getTripParticipants(id),
    getTripExpenses(id),
    getTripSettlements(id),
  ]);
  const balance = computeGroupBalance(participants, expenses, settlements);
  const userById = (userId: number) => participants.find((u) => u.id === userId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/trips" className="text-sm text-ink/50">
          ← Trips
        </Link>
        <h1 className="text-xl font-bold">{trip.name}</h1>
        <p className="text-xs text-ink/40">
          {participants.map((p) => `${p.emoji} ${p.name}`).join(" · ")}
        </p>
      </div>

      <div className="rounded-2xl bg-lavender p-4 text-center font-medium">
        <BalanceSummary participants={participants} balance={balance} />
      </div>

      {trip.status === "open" ? (
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/trips/${id}/expenses/new`}
            prefetch={false}
            className="rounded-2xl bg-mint-dark px-4 py-3 text-center font-semibold text-white transition active:scale-[0.97]"
          >
            + Add expense
          </Link>
          <Link
            href={`/trips/${id}/settle`}
            prefetch={false}
            className="rounded-2xl bg-blush-dark px-4 py-3 text-center font-semibold text-white transition active:scale-[0.97]"
          >
            Settle up
          </Link>
        </div>
      ) : (
        <form action={reopenTripAction}>
          <input type="hidden" name="tripId" value={id} />
          <button className="w-full rounded-2xl bg-mint px-4 py-2 text-sm font-medium text-ink shadow-sm ring-1 ring-mint-dark/40 transition active:scale-[0.97]">
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
              prefetch={false}
              className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition active:scale-[0.97]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream text-lg">
                {categoryEmoji(expense.category)}
              </span>
              <div className="flex flex-1 flex-col">
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
        <form action={closeTripAction} className="mt-2">
          <input type="hidden" name="tripId" value={id} />
          <button className="w-full rounded-2xl bg-white px-4 py-2 text-sm text-ink shadow-sm ring-1 ring-black/10 transition active:scale-[0.97]">
            Close trip
          </button>
        </form>
      )}
    </div>
  );
}
