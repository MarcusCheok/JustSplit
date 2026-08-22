import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrip, getTripExpenses, getTripSettlements, getUsers } from "@/lib/data";
import { computeBalance } from "@/lib/balance";
import { addSettlementAction } from "@/lib/actions";
import { SettleForm } from "@/components/SettleForm";

export default async function SettlePage({
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

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/trips/${id}`} className="text-sm text-ink/50">
        ← Back
      </Link>
      <h1 className="text-xl font-bold">Settle up</h1>
      <SettleForm action={addSettlementAction.bind(null, id)} users={users} balance={balance} />
    </div>
  );
}
