import Link from "next/link";
import { notFound } from "next/navigation";
import { getExpense, getTrip } from "@/lib/data";
import { updateExpenseAction, deleteExpenseAction } from "@/lib/actions";
import { ExpenseForm } from "@/components/ExpenseForm";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string; expenseId: string }>;
}) {
  const { id, expenseId } = await params;
  const expense = await getExpense(expenseId);
  if (!expense) notFound();
  const trip = await getTrip(expense.trip_id);
  if (!trip) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/trips/${id}`} className="text-sm text-ink/50">
        ← Back
      </Link>
      <div>
        <h1 className="text-xl font-bold">Edit expense</h1>
        <p className="text-sm text-ink/50">in {trip.name}</p>
      </div>
      <ExpenseForm
        action={updateExpenseAction}
        tripId={expense.trip_id}
        expense={expense}
      />
      <form action={deleteExpenseAction}>
        <input type="hidden" name="tripId" value={expense.trip_id} />
        <input type="hidden" name="expenseId" value={expense.id} />
        <button className="w-full rounded-2xl bg-white px-4 py-2 text-sm text-rose-500 ring-1 ring-black/10">
          Delete expense
        </button>
      </form>
    </div>
  );
}
