import Link from "next/link";
import {
  getTrips,
  getTripExpenses,
  getTripSettlements,
  getUsers,
  getTripParticipants,
  getAllTripParticipants,
} from "@/lib/data";
import { computeGroupBalance } from "@/lib/balance";
import { createTripAction } from "@/lib/actions";
import { BalanceSummary } from "@/components/BalanceSummary";
import { TripForm } from "@/components/TripForm";
import { CapybaraPet } from "@/components/CapybaraPet";

export default async function TripsPage() {
  const [trips, users, allParticipantRows] = await Promise.all([
    getTrips(),
    getUsers(),
    getAllTripParticipants(),
  ]);

  const summaries = await Promise.all(
    trips.map(async (trip) => {
      const [participants, expenses, settlements] = await Promise.all([
        getTripParticipants(trip.id),
        getTripExpenses(trip.id),
        getTripSettlements(trip.id),
      ]);
      return {
        trip,
        participants,
        balance: computeGroupBalance(
          participants,
          expenses,
          settlements,
          trip.exchange_rate_to_sgd
        ),
      };
    })
  );

  const open = summaries.filter((s) => s.trip.status === "open");
  const closed = summaries.filter((s) => s.trip.status === "closed");
  const noTripsAtAll = trips.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <CapybaraPet trips={trips} participantRows={allParticipantRows} />

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/trips/history"
          prefetch={false}
          className="flex items-center justify-center gap-2 rounded-2xl bg-lavender p-4 text-center font-medium shadow-sm ring-1 ring-black/5 transition hover:shadow-md active:scale-[0.97]"
        >
          🕰️ Trip History &amp; Stats
        </Link>
        <Link
          href="/trips/countries"
          prefetch={false}
          className="flex items-center justify-center gap-2 rounded-2xl bg-lavender p-4 text-center font-medium shadow-sm ring-1 ring-black/5 transition hover:shadow-md active:scale-[0.97]"
        >
          🌍 Countries Visited
        </Link>
      </div>

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
          {open.map(({ trip, participants, balance }) => (
            <TripCard key={trip.id} tripId={trip.id} name={trip.name}>
              <BalanceSummary participants={participants} balance={balance} compact />
            </TripCard>
          ))}
        </section>
      )}

      <TripForm action={createTripAction} existingUsers={users} />

      {closed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
            Closed
          </h2>
          {closed.map(({ trip, participants, balance }) => (
            <TripCard key={trip.id} tripId={trip.id} name={trip.name} dimmed>
              <BalanceSummary participants={participants} balance={balance} compact />
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
      className={`flex flex-col gap-1 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 transition hover:shadow-md active:scale-[0.97] ${
        dimmed ? "bg-white/60 text-ink/60" : "bg-white"
      }`}
    >
      <span className="font-semibold">{name}</span>
      <span className="text-sm text-ink/60">{children}</span>
    </Link>
  );
}
