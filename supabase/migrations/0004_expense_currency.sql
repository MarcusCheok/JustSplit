-- Expenses can now be entered in AUD as well as SGD. The rate used is locked
-- in per-expense at entry time (not a global/live rate), so past tabulations
-- never silently shift if someone edits a shared rate later. Final
-- balances/settlements/stats stay SGD-only for now — only the raw expense
-- amount can be AUD.
alter table expenses
  add column currency text not null default 'SGD' check (currency in ('SGD', 'AUD')),
  add column exchange_rate_to_sgd numeric(12, 6) not null default 1 check (exchange_rate_to_sgd > 0);
