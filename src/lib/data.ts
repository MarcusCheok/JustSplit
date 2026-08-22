import "server-only";
import { supabase } from "./supabase";
import type { Expense, Settlement, Trip, User } from "./types";

export async function getUsers(): Promise<[User, User]> {
  const { data, error } = await supabase.from("users").select("*").order("id");
  if (error) throw error;
  return data as [User, User];
}

export async function getTrips(): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Trip[];
}

export async function getTrip(id: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Trip | null;
}

export async function createTrip(name: string): Promise<Trip> {
  const { data, error } = await supabase
    .from("trips")
    .insert({ name })
    .select("*")
    .single();
  if (error) throw error;
  return data as Trip;
}

export async function closeTrip(id: string): Promise<void> {
  const { error } = await supabase
    .from("trips")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function reopenTrip(id: string): Promise<void> {
  const { error } = await supabase
    .from("trips")
    .update({ status: "open", closed_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function getTripExpenses(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*, expense_splits(user_id, amount)")
    .eq("trip_id", tripId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    splits: row.expense_splits,
  })) as Expense[];
}

export async function getAllExpensePaidTotals(): Promise<
  { trip_id: string; paid_by_user_id: number; amount: number }[]
> {
  const { data, error } = await supabase
    .from("expenses")
    .select("trip_id, paid_by_user_id, amount");
  if (error) throw error;
  return data as { trip_id: string; paid_by_user_id: number; amount: number }[];
}

export async function getTripSettlements(tripId: string): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("trip_id", tripId)
    .order("settled_at", { ascending: false });
  if (error) throw error;
  return data as Settlement[];
}

export async function addExpense(input: {
  tripId: string;
  description: string;
  amount: number;
  category: string | null;
  paidByUserId: number;
  expenseDate: string;
  splits: { userId: number; amount: number }[];
}): Promise<void> {
  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      trip_id: input.tripId,
      description: input.description,
      amount: input.amount,
      category: input.category,
      paid_by_user_id: input.paidByUserId,
      expense_date: input.expenseDate,
    })
    .select("id")
    .single();
  if (error) throw error;

  const { error: splitError } = await supabase.from("expense_splits").insert(
    input.splits.map((s) => ({
      expense_id: expense.id,
      user_id: s.userId,
      amount: s.amount,
    }))
  );
  if (splitError) throw splitError;
}

export async function updateExpense(
  expenseId: string,
  input: {
    description: string;
    amount: number;
    category: string | null;
    paidByUserId: number;
    expenseDate: string;
    splits: { userId: number; amount: number }[];
  }
): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .update({
      description: input.description,
      amount: input.amount,
      category: input.category,
      paid_by_user_id: input.paidByUserId,
      expense_date: input.expenseDate,
    })
    .eq("id", expenseId);
  if (error) throw error;

  const { error: deleteError } = await supabase
    .from("expense_splits")
    .delete()
    .eq("expense_id", expenseId);
  if (deleteError) throw deleteError;

  const { error: splitError } = await supabase.from("expense_splits").insert(
    input.splits.map((s) => ({
      expense_id: expenseId,
      user_id: s.userId,
      amount: s.amount,
    }))
  );
  if (splitError) throw splitError;
}

export async function getExpense(expenseId: string): Promise<Expense | null> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*, expense_splits(user_id, amount)")
    .eq("id", expenseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...data, splits: data.expense_splits } as Expense;
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);
  if (error) throw error;
}

export async function addSettlement(input: {
  tripId: string;
  fromUserId: number;
  toUserId: number;
  amount: number;
  note: string | null;
}): Promise<void> {
  const { error } = await supabase.from("settlements").insert({
    trip_id: input.tripId,
    from_user_id: input.fromUserId,
    to_user_id: input.toUserId,
    amount: input.amount,
    note: input.note,
  });
  if (error) throw error;
}
