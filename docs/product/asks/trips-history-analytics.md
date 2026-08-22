# Ask: Trips history & analytics

Raw ask from the product owner (his own words, admittedly generic — needs fleshing out):

> It needs to have a separate page for "Trips". So, beyond just capturing these expenses and
> settling them, I want it to have some tagged profile thing. So for anyone using it, they
> can always see all the past trips they have used JustSplit for - and then there can be some
> snapshot / analytics view like here are how many trips you've been on so far, who have you
> taken the most trips with, how much you typically spend on trips, a history page where they
> can see all the trips, click into them and see the expenses and all that

## Existing product context (this is an iteration, not greenfield)

JustSplit is a private, two-person (Marcus + partner) expense-splitting web app. See the
repo's root `PRD.md` for the original spec. Current state relevant to this ask:

- **Users**: exactly two fixed people, no real auth (name-picker + shared passcode).
- **Trips**: already exist as a concept (`trips` table: id, name, status open/closed,
  created_at, closed_at). Currently only reachable via a flat list at `/trips` — no
  dedicated history/analytics view.
- **Expenses**: belong to a trip (`expenses` table, with category, payer, splits).
- **Settlements**: manual payments between the two users, scoped to a trip.
- Stack: Next.js (App Router) + Supabase Postgres (server-only access via service-role key,
  no client-side Supabase calls) + Tailwind, deployed on Railway.
- Since there are only ever two users, "who have you taken the most trips with" will likely
  only ever have one possible answer today — the PM should flag this as worth confirming
  scope on, not silently build elaborate logic for a comparison that can't vary yet.

## Note for the team

The ask above is intentionally rough — treat the MECE breakdown, stakeholder framing, and
open-questions list as doing real work here, not a formality. Don't invent scope the ask
didn't state (e.g. don't assume export/sharing features, filters, or date-range pickers unless
they're a natural reading of "history page where they can see all the trips").
