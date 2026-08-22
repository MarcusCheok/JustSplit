"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "./data";

export async function createTripAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Trip name is required");
  const trip = await db.createTrip(name);
  revalidatePath("/trips");
  redirect(`/trips/${trip.id}`);
}

export async function closeTripAction(formData: FormData) {
  const tripId = String(formData.get("tripId"));
  await db.closeTrip(tripId);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

export async function reopenTripAction(formData: FormData) {
  const tripId = String(formData.get("tripId"));
  await db.reopenTrip(tripId);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
}

function parseSplits(formData: FormData, amount: number) {
  const mode = String(formData.get("splitMode"));
  if (mode === "equal") {
    const half = Math.round((amount / 2) * 100) / 100;
    const remainder = Math.round((amount - half) * 100) / 100;
    return [
      { userId: 1, amount: half },
      { userId: 2, amount: remainder },
    ];
  }
  if (mode === "full1") return [{ userId: 1, amount }];
  if (mode === "full2") return [{ userId: 2, amount }];
  if (mode === "exact") {
    const u1 = Number(formData.get("exact1"));
    const u2 = Number(formData.get("exact2"));
    if (Math.round((u1 + u2) * 100) !== Math.round(amount * 100)) {
      throw new Error("Exact split amounts must add up to the total");
    }
    return [
      { userId: 1, amount: u1 },
      { userId: 2, amount: u2 },
    ];
  }
  if (mode === "percent") {
    const p1 = Number(formData.get("percent1"));
    const p2 = Number(formData.get("percent2"));
    if (Math.round(p1 + p2) !== 100) {
      throw new Error("Percentages must add up to 100");
    }
    const u1 = Math.round(((amount * p1) / 100) * 100) / 100;
    const u2 = Math.round((amount - u1) * 100) / 100;
    return [
      { userId: 1, amount: u1 },
      { userId: 2, amount: u2 },
    ];
  }
  throw new Error("Unknown split mode");
}

export async function addExpenseAction(formData: FormData) {
  const tripId = String(formData.get("tripId"));
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");

  await db.addExpense({
    tripId,
    description: String(formData.get("description") ?? "").trim(),
    amount,
    category: (formData.get("category") as string) || null,
    paidByUserId: Number(formData.get("paidBy")),
    expenseDate: String(formData.get("date")),
    splits: parseSplits(formData, amount),
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  redirect(`/trips/${tripId}`);
}

export async function updateExpenseAction(formData: FormData) {
  const tripId = String(formData.get("tripId"));
  const expenseId = String(formData.get("expenseId"));
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");

  await db.updateExpense(expenseId, {
    description: String(formData.get("description") ?? "").trim(),
    amount,
    category: (formData.get("category") as string) || null,
    paidByUserId: Number(formData.get("paidBy")),
    expenseDate: String(formData.get("date")),
    splits: parseSplits(formData, amount),
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  redirect(`/trips/${tripId}`);
}

export async function deleteExpenseAction(formData: FormData) {
  const tripId = String(formData.get("tripId"));
  const expenseId = String(formData.get("expenseId"));
  await db.deleteExpense(expenseId);
  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  redirect(`/trips/${tripId}`);
}

export async function addSettlementAction(formData: FormData) {
  const tripId = String(formData.get("tripId"));
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");

  await db.addSettlement({
    tripId,
    fromUserId: Number(formData.get("fromUserId")),
    toUserId: Number(formData.get("toUserId")),
    amount,
    note: (formData.get("note") as string) || null,
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  redirect(`/trips/${tripId}`);
}
