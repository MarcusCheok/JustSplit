import Link from "next/link";
import { getTrips, getTripExpenses, getTripSettlements, getUsers } from "@/lib/data";
import { computeBalance } from "@/lib/balance";
import { createTripAction } from "@/lib/actions";
import { BalanceText } from "@/components/BalanceText";

export default async function TripsPage() {
  const [trips, users] = await Promise.all([getTrips(), getUsers()]);

  const summaries = await Promise.all(
    trips.map(async (trip) => {
      const [expenses, settlements] = await Promise.all([
        getTripExpenses(trip.id),
        getTripSettlements(trip.id),
      ]);
      return { trip, balance: computeBalance(users, expenses, settlements) };
    })
  );

  const open = summaries.filter((s) => s.trip.status === "open");
  const closed = summaries.filter((s) => s.trip.status === "closed");
  const noTripsAtAll = trips.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {noTripsAtAll ? (
        <div className="flex flex-col items-center gap-1 py-6 text-center">
          <span className="text-3xl">✨</span>
          <p className="font-semibold">Start your first JustSplit</p>
          <p className="text-sm text-ink/50">
            Add a trip below to start logging expenses together.
          </p>
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
            Open
          </h2>
          {open.length === 0 && (
            <p className="text-sm text-ink/50">No open trips yet.</p>
          )}
          {open.map(({ trip, balance }) => (
            <TripCard key={trip.id} tripId={trip.id} name={trip.name}>
              <BalanceText users={users} balance={balance} />
            </TripCard>
          ))}
        </section>
      )}

      <form
        action={createTripAction}
        className="flex gap-2 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5"
      >
        <input
          name="name"
          placeholder="New trip name"
          required
          className="flex-1 rounded-xl bg-cream px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blush-dark"
        />
        <button
          type="submit"
          className="rounded-xl bg-mint-dark px-4 py-2 text-sm font-semibold text-white"
        >
          + Add
        </button>
      </form>

      {closed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
            Closed
          </h2>
          {closed.map(({ trip, balance }) => (
            <TripCard key={trip.id} tripId={trip.id} name={trip.name} dimmed>
              <BalanceText users={users} balance={balance} />
            </TripCard>
          ))}
        </section>
      )}
    </div>
  );
}

function TripCard({
  tripId,
  name,
  dimmed,
  children,
}: {
  tripId: string;
  name: string;
  dimmed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/trips/${tripId}`}
      prefetch={false}
      className={`flex flex-col gap-1 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 transition hover:shadow-md ${
        dimmed ? "bg-white/60 text-ink/60" : "bg-white"
      }`}
    >
      <span className="font-semibold">{name}</span>
      <span className="text-sm text-ink/60">{children}</span>
    </Link>
  );
}
