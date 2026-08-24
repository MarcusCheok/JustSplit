"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "./data";
import { splitEqually } from "./split";
import { CURRENCIES, type Currency } from "./types";

function parseCurrency(formData: FormData): {
  currency: Currency;
  exchangeRateToSgd: number;
} {
  const currency = String(formData.get("currency") ?? "SGD");
  if (!CURRENCIES.includes(currency as Currency)) {
    throw new Error("Unknown currency");
  }
  if (currency === "SGD") return { currency: "SGD", exchangeRateToSgd: 1 };

  const exchangeRateToSgd = Number(formData.get("exchangeRate"));
  if (!exchangeRateToSgd || exchangeRateToSgd <= 0) {
    throw new Error("Enter a valid AUD → SGD exchange rate");
  }
  return { currency: "AUD", exchangeRateToSgd };
}

export async function createTripAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Trip name is required");

  const meId = Number(formData.get("currentUserId"));
  const existingIds = formData.getAll("participantIds").map(Number);
  const newNames = formData.getAll("newPersonName").map(String);
  const newEmojis = formData.getAll("newPersonEmoji").map(String);

  const createdIds: number[] = [];
  for (let i = 0; i < newNames.length; i++) {
    const personName = newNames[i].trim();
    if (!personName) continue;
    const user = await db.createUser(personName, newEmojis[i] || "🙂");
    createdIds.push(user.id);
  }

  const participantIds = Array.from(
    new Set([meId, ...existingIds, ...createdIds])
  ).filter((id) => Number.isFinite(id) && id > 0);
  if (participantIds.length < 2) {
    throw new Error("Add at least one travel companion");
  }

  const trip = await db.createTrip(name, participantIds);
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

function parseSplits(
  formData: FormData,
  amount: number,
  participantIds: number[]
) {
  const mode = String(formData.get("splitMode"));

  if (mode === "equal") {
    const shares = splitEqually(amount, participantIds);
    return participantIds.map((userId) => ({ userId, amount: shares[userId] }));
  }

  if (mode === "full") {
    const payerId = Number(formData.get("fullPayerId"));
    if (!participantIds.includes(payerId)) {
      throw new Error("Payer must be a trip participant");
    }
    return [{ userId: payerId, amount }];
  }

  if (mode === "exact") {
    const entries = participantIds.map((userId) => ({
      userId,
      amount: Number(formData.get(`exact_${userId}`)) || 0,
    }));
    const sum = entries.reduce((total, e) => total + e.amount, 0);
    if (Math.round(sum * 100) !== Math.round(amount * 100)) {
      throw new Error("Exact split amounts must add up to the total");
    }
    return entries;
  }

  if (mode === "percent") {
    const percents = participantIds.map((userId) => ({
      userId,
      pct: Number(formData.get(`percent_${userId}`)) || 0,
    }));
    const pctSum = percents.reduce((total, p) => total + p.pct, 0);
    if (Math.round(pctSum) !== 100) {
      throw new Error("Percentages must add up to 100");
    }
    const totalCents = Math.round(amount * 100);
    let running = 0;
    return percents.map((p, i) => {
      if (i === percents.length - 1) {
        return { userId: p.userId, amount: (totalCents - running) / 100 };
      }
      const cents = Math.round((totalCents * p.pct) / 100);
      running += cents;
      return { userId: p.userId, amount: cents / 100 };
    });
  }

  throw new Error("Unknown split mode");
}

export async function addExpenseAction(formData: FormData) {
  const tripId = String(formData.get("tripId"));
  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) throw new Error("Amount must be greater than 0");

  const participants = await db.getTripParticipants(tripId);
  const { currency, exchangeRateToSgd } = parseCurrency(formData);

  await db.addExpense({
    tripId,
    description: String(formData.get("description") ?? "").trim(),
    amount,
    currency,
    exchangeRateToSgd,
    category: (formData.get("category") as string) || null,
    paidByUserId: Number(formData.get("paidBy")),
    expenseDate: String(formData.get("date")),
    splits: parseSplits(formData, amount, participants.map((p) => p.id)),
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

  const participants = await db.getTripParticipants(tripId);
  const { currency, exchangeRateToSgd } = parseCurrency(formData);

  await db.updateExpense(expenseId, {
    description: String(formData.get("description") ?? "").trim(),
    amount,
    currency,
    exchangeRateToSgd,
    category: (formData.get("category") as string) || null,
    paidByUserId: Number(formData.get("paidBy")),
    expenseDate: String(formData.get("date")),
    splits: parseSplits(formData, amount, participants.map((p) => p.id)),
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

  const fromUserId = Number(formData.get("fromUserId"));
  const toUserId = Number(formData.get("toUserId"));
  if (fromUserId === toUserId) {
    throw new Error("Payer and recipient must be different people");
  }

  await db.addSettlement({
    tripId,
    fromUserId,
    toUserId,
    amount,
    note: (formData.get("note") as string) || null,
  });

  revalidatePath(`/trips/${tripId}`);
  revalidatePath("/trips");
  redirect(`/trips/${tripId}`);
}
