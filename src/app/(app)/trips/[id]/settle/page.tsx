import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTrip,
  getTripExpenses,
  getTripSettlements,
  getTripParticipants,
} from "@/lib/data";
import { computeGroupBalance } from "@/lib/balance";
import { computeCategoryBreakdown } from "@/lib/breakdown";
import { addSettlementAction } from "@/lib/actions";
import { SettleForm } from "@/components/SettleForm";
import { BalanceSummary } from "@/components/BalanceSummary";
import { CategoryBreakdownTable } from "@/components/CategoryBreakdownTable";

export default async function SettlePage({
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
  const { rows, totals } = computeCategoryBreakdown(participants, expenses);

  return (
    <div className="flex flex-col gap-5">
      <Link href={`/trips/${id}`} className="text-sm text-ink/50">
        ← Back
      </Link>
      <div>
        <h1 className="text-xl font-bold">Settle up</h1>
        <p className="text-sm text-ink/50">{trip.name}</p>
      </div>

      <div className="rounded-2xl bg-lavender p-4 text-center font-medium">
        <BalanceSummary participants={participants} balance={balance} />
      </div>

      <SettleForm
        action={addSettlementAction}
        tripId={id}
        participants={participants}
        balance={balance}
      />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
          Who paid what
        </h2>
        <CategoryBreakdownTable users={participants} rows={rows} totals={totals} />
      </section>
    </div>
  );
}
