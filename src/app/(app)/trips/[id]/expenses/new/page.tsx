import Link from "next/link";
import { addExpenseAction } from "@/lib/actions";
import { ExpenseForm } from "@/components/ExpenseForm";

export default async function NewExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/trips/${id}`} className="text-sm text-ink/50">
        ← Back
      </Link>
      <h1 className="text-xl font-bold">Add expense</h1>
      <ExpenseForm action={addExpenseAction.bind(null, id)} />
    </div>
  );
}
