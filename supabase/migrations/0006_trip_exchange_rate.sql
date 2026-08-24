-- Exchange rate moves from per-expense (locked in at entry time) to
-- per-trip (set once, applied dynamically to every AUD expense in the
-- trip) — one rate per trip instead of re-entering it on every expense.
alter table trips
  add column exchange_rate_to_sgd numeric(12, 6) not null default 1 check (exchange_rate_to_sgd > 0);

alter table expenses drop column exchange_rate_to_sgd;
