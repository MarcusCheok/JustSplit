export type User = {
  id: number;
  name: string;
  emoji: string;
  color: string;
};

export type TripStatus = "open" | "closed";

export type Trip = {
  id: string;
  name: string;
  status: TripStatus;
  created_at: string;
  closed_at: string | null;
};

export type ExpenseSplit = {
  user_id: number;
  amount: number;
};

export type Expense = {
  id: string;
  trip_id: string;
  description: string;
  amount: number;
  category: string | null;
  paid_by_user_id: number;
  expense_date: string;
  created_at: string;
  splits: ExpenseSplit[];
};

export type Settlement = {
  id: string;
  trip_id: string;
  from_user_id: number;
  to_user_id: number;
  amount: number;
  note: string | null;
  settled_at: string;
};

export const CATEGORIES = [
  "Food",
  "Transport",
  "Accommodation",
  "Shopping",
  "Fun",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type SplitMode = "equal" | "full1" | "full2" | "exact" | "percent";
