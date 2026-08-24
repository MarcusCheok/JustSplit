-- Trips can now record which country they were to, powering the "Countries
-- Visited" stats page. Nullable and unenforced (free text, matched against a
-- client-side autocomplete list) — existing trips start with no country set
-- and can be backfilled from the trip detail page.
alter table trips add column country text;
