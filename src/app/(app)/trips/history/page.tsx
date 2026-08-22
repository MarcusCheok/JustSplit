import Link from "next/link";
import {
  getTrips,
  getUsers,
  getTripExpenses,
  getTripSettlements,
  getAllExpenseSplitTotals,
} from "@/lib/data";
import { computeBalance } from "@/lib/balance";
import { computeTripsSnapshot } from "@/lib/analytics";
import { BalanceText } from "@/components/BalanceText";
import { TripsSnapshotSummary } from "@/components/TripsSnapshotSummary";
import type { Trip, User } from "@/lib/types";

export default async function TripHistoryPage() {
  let trips: Trip[];
  let users: [User, User];
  try {
    [trips, users] = await Promise.all([getTrips(), getUsers()]);
  } catch {
    return (
      <div className="flex flex-col gap-5">
        <BackLink />
        <ErrorCard message="Couldn't load your trip history — try again." />
      </div>
    );
  }

  const noTripsAtAll = trips.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <BackLink />
      <h1 className="text-xl font-bold">🕰️ Trip History &amp; Stats</h1>

      {noTripsAtAll ? (
        <EmptyState />
      ) : (
        <>
          <SnapshotSection trips={trips} users={users} />
          <TripListSection trips={trips} users={users} />
        </>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/trips" className="text-sm text-ink/50">
      ← Trips
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-1 py-6 text-center">
      <span className="text-3xl">✨</span>
      <p className="font-semibold">No trip history yet</p>
      <p className="text-sm text-ink/50">
        Once you&apos;ve added a trip beyond General, we&apos;ll start tracking
        stats here.
      </p>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center text-sm text-ink/60 shadow-sm ring-1 ring-black/5">
      {message}
    </div>
  );
}

async function SnapshotSection({
  trips,
  users,
}: {
  trips: Trip[];
  users: [User, User];
}) {
  let snapshot;
  try {
    const expenseTotals = await getAllExpenseSplitTotals();
    snapshot = computeTripsSnapshot(users, trips, expenseTotals);
  } catch {
    return <ErrorCard message="Couldn't load your trip stats — try again." />;
  }

  if (snapshot.tripCount === 0) {
    return (
      <div className="rounded-2xl bg-lavender p-4 text-center text-sm">
        ✨ No trip history yet — once you&apos;ve added a trip beyond General,
        we&apos;ll start tracking stats here.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-lavender p-4">
      <TripsSnapshotSummary
        users={users}
        tripCount={snapshot.tripsTogetherCount}
        medianSpendByUser={snapshot.medianSpendByUser}
      />
    </div>
  );
}

async function TripListSection({
  trips,
  users,
}: {
  trips: Trip[];
  users: [User, User];
}) {
  let rows;
  try {
    rows = await Promise.all(
      trips.map(async (trip) => {
        const [expenses, settlements] = await Promise.all([
          getTripExpenses(trip.id),
          getTripSettlements(trip.id),
        ]);
        return { trip, balance: computeBalance(users, expenses, settlements) };
      })
    );
  } catch {
    return <ErrorCard message="Couldn't load your trip history — try again." />;
  }

  const chronological = [...rows].sort(
    (x, y) =>
      new Date(y.trip.created_at).getTime() - new Date(x.trip.created_at).getTime()
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
        All trips
      </h2>
      {chronological.map(({ trip, balance }) => (
        <HistoryTripCard key={trip.id} trip={trip} users={users} balance={balance} />
      ))}
    </section>
  );
}

function StatusBadge({ status }: { status: Trip["status"] }) {
  const isOpen = status === "open";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isOpen ? "bg-mint text-ink/70" : "bg-black/5 text-ink/50"
      }`}
    >
      {isOpen ? "Open" : "Closed"}
    </span>
  );
}

function HistoryTripCard({
  trip,
  users,
  balance,
}: {
  trip: Trip;
  users: [User, User];
  balance: { net: number; owedByUserId: number | null; owedToUserId: number | null };
}) {
  return (
    <Link
      href={`/trips/${trip.id}`}
      prefetch={false}
      className={`flex flex-col gap-1 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 transition hover:shadow-md active:scale-[0.97] ${
        trip.status === "closed" ? "bg-white/60 text-ink/60" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{trip.name}</span>
        <StatusBadge status={trip.status} />
      </div>
      <span className="text-sm text-ink/60">
        <BalanceText users={users} balance={balance} />
      </span>
    </Link>
  );
}
