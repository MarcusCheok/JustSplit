import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrip, getTripParticipants } from "@/lib/data";
import { addExpenseAction } from "@/lib/actions";
import { ExpenseForm } from "@/components/ExpenseForm";

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const trip = await getTrip(id);
  if (!trip) notFound();
  const participants = await getTripParticipants(id);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/trips/${id}`} className="text-sm text-ink/50">
        ← Back
      </Link>
      <div>
        <h1 className="text-xl font-bold">Add expense</h1>
        <p className="text-sm text-ink/50">to {trip.name}</p>
      </div>
      <ExpenseForm action={addExpenseAction} tripId={id} participants={participants} />
    </div>
  );
}
