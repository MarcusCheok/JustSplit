import "server-only";
import { supabase } from "./supabase";
import { toSgd } from "./currency";
import type { Currency, Expense, Settlement, Trip, User } from "./types";

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase.from("users").select("*").order("id");
  if (error) throw error;
  return data as User[];
}

export async function createUser(name: string, emoji: string): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .insert({ name, emoji, color: "gray" })
    .select("*")
    .single();
  if (error) throw error;
  return data as User;
}

export async function getTripParticipants(tripId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from("trip_participants")
    .select("users(*)")
    .eq("trip_id", tripId);
  if (error) throw error;
  return ((data ?? []) as unknown as { users: User }[])
    .map((row) => row.users)
    .sort((a, b) => a.id - b.id);
}

export async function getAllTripParticipants(): Promise<
  { trip_id: string; user_id: number }[]
> {
  const { data, error } = await supabase
    .from("trip_participants")
    .select("trip_id, user_id");
  if (error) throw error;
  return data as { trip_id: string; user_id: number }[];
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

export async function createTrip(
  name: string,
  participantIds: number[],
  country: string | null = null
): Promise<Trip> {
  const { data, error } = await supabase
    .from("trips")
    .insert({ name, country })
    .select("*")
    .single();
  if (error) throw error;
  const trip = data as Trip;

  const { error: participantsError } = await supabase
    .from("trip_participants")
    .insert(participantIds.map((userId) => ({ trip_id: trip.id, user_id: userId })));
  if (participantsError) throw participantsError;

  return trip;
}

export async function updateTripCountry(
  id: string,
  country: string | null
): Promise<void> {
  const { error } = await supabase.from("trips").update({ country }).eq("id", id);
  if (error) throw error;
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

export async function getAllExpenseSplitTotals(): Promise<
  { trip_id: string; user_id: number; amount: number }[]
> {
  const { data, error } = await supabase
    .from("expense_splits")
    .select("user_id, amount, expenses(trip_id, currency, exchange_rate_to_sgd)");
  if (error) throw error;
  return (
    (data ?? []) as unknown as {
      user_id: number;
      amount: number;
      expenses: {
        trip_id: string;
        currency: Currency;
        exchange_rate_to_sgd: number;
      } | null;
    }[]
  )
    .filter((row) => row.expenses)
    .map((row) => ({
      trip_id: row.expenses!.trip_id,
      user_id: row.user_id,
      // Normalized to SGD, the tabulation currency — analytics.ts consumes
      // these as plain comparable numbers, unaware of per-expense currency.
      amount: toSgd(row.amount, row.expenses!.currency, row.expenses!.exchange_rate_to_sgd),
    }));
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
  currency: Currency;
  exchangeRateToSgd: number;
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
      currency: input.currency,
      exchange_rate_to_sgd: input.exchangeRateToSgd,
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
    currency: Currency;
    exchangeRateToSgd: number;
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
      currency: input.currency,
      exchange_rate_to_sgd: input.exchangeRateToSgd,
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
