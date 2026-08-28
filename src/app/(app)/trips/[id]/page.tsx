import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTrip,
  getTripExpenses,
  getTripSettlements,
  getTripParticipants,
} from "@/lib/data";
import { computeGroupBalance } from "@/lib/balance";
import { toSgd } from "@/lib/currency";
import { groupExpensesByDay } from "@/lib/expenseDays";
import { categoryEmoji, CURRENCY_SYMBOL } from "@/lib/types";
import {
  closeTripAction,
  reopenTripAction,
  updateTripCountryAction,
  updateTripExchangeRateAction,
} from "@/lib/actions";
import { BalanceSummary } from "@/components/BalanceSummary";
import { TripSpendSummary } from "@/components/TripSpendSummary";
import { COUNTRIES } from "@/lib/countries";

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
  const balance = computeGroupBalance(
    participants,
    expenses,
    settlements,
    trip.exchange_rate_to_sgd
  );
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
        <form action={updateTripCountryAction} className="mt-1 flex items-center gap-1.5">
          <input type="hidden" name="tripId" value={id} />
          <span className="text-xs text-ink/40">🌍</span>
          <input
            name="country"
            list="country-options"
            defaultValue={trip.country ?? ""}
            placeholder="Add country"
            className="rounded-lg bg-white px-2 py-1 text-xs text-ink/70 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
          />
          <datalist id="country-options">
            {COUNTRIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button
            type="submit"
            className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-ink/50 shadow-sm ring-1 ring-black/5 transition active:scale-[0.97]"
          >
            Save
          </button>
        </form>
        <form
          action={updateTripExchangeRateAction}
          className="mt-1 flex items-center gap-1.5"
        >
          <input type="hidden" name="tripId" value={id} />
          <span className="text-xs text-ink/40">💱</span>
          <select
            name="rateDirection"
            defaultValue={trip.exchange_rate_to_sgd !== 1 ? "audToSgd" : "sgdToAud"}
            className="rounded-lg bg-white px-1 py-1 text-xs text-ink/70 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
          >
            <option value="sgdToAud">1 SGD=?AUD</option>
            <option value="audToSgd">1 AUD=?SGD</option>
          </select>
          <input
            name="rateValue"
            type="number"
            step="0.0001"
            min="0.0001"
            defaultValue={
              trip.exchange_rate_to_sgd !== 1 ? trip.exchange_rate_to_sgd : ""
            }
            placeholder="rate"
            className="w-20 rounded-lg bg-white px-2 py-1 text-xs text-ink/70 shadow-sm ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-blush-dark"
          />
          <button
            type="submit"
            className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-ink/50 shadow-sm ring-1 ring-black/5 transition active:scale-[0.97]"
          >
            Save
          </button>
        </form>
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

      <TripSpendSummary expenses={expenses} exchangeRateToSgd={trip.exchange_rate_to_sgd} />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
          Expenses
        </h2>
        {expenses.length === 0 && (
          <p className="text-sm text-ink/50">No expenses logged yet.</p>
        )}
        {groupExpensesByDay(expenses, trip.exchange_rate_to_sgd).map((day) => (
          <div key={day.date} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-ink/50">
                {formatDayHeader(day.date)}
              </span>
              <span className="text-xs text-ink/40">S${day.totalSgd.toFixed(2)}</span>
            </div>
            {day.expenses.map((expense) => {
              const payer = userById(expense.paid_by_user_id);
              return (
                <Link
                  key={expense.id}
                  href={`/trips/${id}/expenses/${expense.id}/edit`}
                  prefetch={false}
                  className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 transition active:scale-[0.97]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream text-lg">
                      {categoryEmoji(expense.category)}
                    </span>
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium">{expense.description}</span>
                      <span className="text-xs text-ink/50">
                        {payer?.emoji} {payer?.name}
                        {expense.category ? ` · ${expense.category}` : ""}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">
                        {CURRENCY_SYMBOL[expense.currency]}
                        {expense.amount.toFixed(2)}
                      </span>
                      {expense.currency !== "SGD" && (
                        <span className="text-xs text-ink/40">
                          ≈ S$
                          {toSgd(
                            expense.amount,
                            expense.currency,
                            trip.exchange_rate_to_sgd
                          ).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 pl-12">
                    {participants.map((p) => {
                      const involved = expense.splits.some(
                        (s) => s.user_id === p.id
                      );
                      return (
                        <span
                          key={p.id}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            involved
                              ? "bg-mint text-ink/70"
                              : "bg-black/5 text-ink/25"
                          }`}
                        >
                          {p.emoji} {p.name}
                        </span>
                      );
                    })}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
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
                <span className="font-semibold">S${s.amount.toFixed(2)}</span>
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

function formatDayHeader(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-SG", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
