import Link from "next/link";
import { notFound } from "next/navigation";
import { getExpense } from "@/lib/data";
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

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/trips/${id}`} className="text-sm text-ink/50">
        ← Back
      </Link>
      <h1 className="text-xl font-bold">Edit expense</h1>
      <ExpenseForm
        action={updateExpenseAction.bind(null, id, expenseId)}
        expense={expense}
      />
      <form action={deleteExpenseAction.bind(null, id, expenseId)}>
        <button className="w-full rounded-2xl bg-white px-4 py-2 text-sm text-rose-500 ring-1 ring-black/10">
          Delete expense
        </button>
      </form>
    </div>
  );
}
