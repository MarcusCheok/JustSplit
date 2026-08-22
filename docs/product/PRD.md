# Trips History & Analytics — Technical Requirements

## Tech Stack

No new stack additions. This is an additive, read-only feature built entirely inside the
existing JustSplit codebase:

- **Next.js 16 App Router**, React 19 Server Components — new page is a plain `async`
  Server Component, same pattern as `src/app/(app)/trips/page.tsx` and
  `src/app/(app)/trips/[id]/page.tsx`.
- **Supabase** (Postgres) via the existing server-only client (`src/lib/supabase.ts`,
  service-role key, RLS deny-all). No new environment variables, no client-side Supabase
  usage.
- **Tailwind v4**, matching existing utility-class conventions (`bg-white`, `rounded-2xl`,
  `ring-1 ring-black/5`, `text-ink/50`, etc. — see `TripCard` in `trips/page.tsx`).
- No new npm dependencies. No new tables, columns, views, or RPC functions — every stat is
  computable from `trips` + `expenses` rows already returned by Supabase's JS client, using
  the same "fetch raw rows, aggregate in TypeScript" pattern already used by
  `src/lib/balance.ts` and `src/lib/breakdown.ts`. Dataset size (a private two-person app —
  tens of trips, low hundreds of expenses at most) makes in-memory aggregation the right
  call; a SQL view or RPC would be premature complexity for this scale.

## Data Model

**No schema changes.** Everything needed already exists in `trips`, `expenses`, and their
columns (`trip_id`, `paid_by_user_id`, `amount`). `expense_splits` and `settlements` are not
needed for the snapshot stats (see interpretation notes below) but remain available for trip
detail (F2, unchanged).

### New data-access function — `src/lib/data.ts`

Add one lean query alongside the existing `get*` functions, following the same
`server-only` + throw-on-error style:

```ts
export async function getAllExpensePaidTotals(): Promise<
  { trip_id: string; paid_by_user_id: number; amount: number }[]
> {
  const { data, error } = await supabase
    .from("expenses")
    .select("trip_id, paid_by_user_id, amount");
  if (error) throw error;
  return data as { trip_id: string; paid_by_user_id: number; amount: number }[];
}
```

One query for *all* expenses across all trips, rather than the N+1 per-trip pattern
`TripsPage` uses for balances today — at this data scale both are fine, but since the
snapshot needs every expense anyway (not just one trip's), a single flat fetch is both
simpler and cheaper than looping `getTripExpenses()` per trip.

Trips are fetched via the existing `getTrips()` — no new trips query needed. The
history list re-sorts the same array already fetched for the snapshot computation (see
below) rather than issuing a second query.

### New aggregation module — `src/lib/analytics.ts`

Mirrors `balance.ts` / `breakdown.ts`: a pure function, no I/O, unit-testable in isolation.

```ts
import type { Trip, User } from "./types";

export type TripsSnapshot = {
  tripCount: number;                      // F3 — excludes "General"
  medianPaidByUser: Record<number, number>; // F4 — one value per user id, excludes "General"
  tripsTogetherCount: number;             // F5 — see rationale below
};

export function computeTripsSnapshot(
  users: [User, User],
  trips: Trip[],
  expenseTotals: { trip_id: string; paid_by_user_id: number; amount: number }[]
): TripsSnapshot {
  const countedTrips = trips.filter((t) => t.name !== "General");

  // Sum paid-by-user-per-trip in one pass (Map keyed by `${tripId}:${userId}`),
  // then read one number per user per counted trip (0 if they paid nothing that trip).
  const paidByTripAndUser = new Map<string, number>();
  for (const e of expenseTotals) {
    const key = `${e.trip_id}:${e.paid_by_user_id}`;
    paidByTripAndUser.set(key, (paidByTripAndUser.get(key) ?? 0) + e.amount);
  }

  const medianPaidByUser: Record<number, number> = {};
  for (const user of users) {
    const perTrip = countedTrips.map((t) =>
      round2(paidByTripAndUser.get(`${t.id}:${user.id}`) ?? 0)
    );
    medianPaidByUser[user.id] = median(perTrip);
  }

  return {
    tripCount: countedTrips.length,
    medianPaidByUser,
    tripsTogetherCount: countedTrips.length, // see rationale below
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m =
    sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return round2(m);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

### Interpretation decisions (committed, with rationale)

The BRD resolves *what* each stat means at a product level; two implementation-level
ambiguities remain and are settled here so the build has one unambiguous target:

1. **"Paid share" = amount the person physically paid (`paid_by_user_id`), not their
   split obligation.** The BRD's own vocabulary ("paid share," not "split share" or "owed
   share") and the existing codebase's convention (`balance.ts`: *"Whoever paid is owed the
   other person's share"*) both use "paid" to mean the `paid_by_user_id` side of an expense,
   never the `expense_splits` side. F4 is therefore: for each user, for each counted trip,
   sum `expenses.amount` where `paid_by_user_id = user.id`; take the median of that list
   across trips. This is also what makes the BRD's settlements clarification click
   ("excludes settlements — a settlement is a repayment, not new spend") — it's asking "how
   much do you *front*," not "how much do you ultimately owe."
2. **F5 ("trips together") is mathematically identical to F3 (trip count).** JustSplit has
   no per-trip participant concept — every trip is implicitly shared by both fixed users
   (that's the entire premise of the app, per BRD Non-Goals: "no multi-person/group
   support"). So "You and Partner — N trips together" uses the same `tripCount` as the F3
   card, just with a different label. No separate computation, no risk of the two numbers
   ever disagreeing.
3. **Trips with zero expenses contribute `0` to a user's per-trip list, not `undefined`/
   skipped.** BRD explicitly resolves that open (in-progress, possibly empty) trips count
   toward both history and the stats — a brand-new open trip with nothing logged yet is a
   real `$0` data point for that person's median, not a gap to exclude.
4. **"General" is excluded from stats (F3/F4) by name match (`trips.name === "General"`),
   not by ID or a new flag column.** This mirrors the exact mechanism already in
   `supabase/migrations/0002_remove_default_trip.sql`, which matches the seeded trip the
   same way. Adding an `is_general` boolean would be a schema change the BRD explicitly
   says to avoid unless a genuine gap forces it — this isn't one, since the existing
   precedent already relies on the name string. The fragility this inherits (a user could
   rename "General" to something else, or create a second trip literally named "General")
   is a pre-existing characteristic of the app, not new debt introduced here — flagged
   again under Technical Risks for visibility.
5. **"General" is *not* excluded from the history browsing list (F1)** — only from the
   F3/F4 aggregates. The BRD's Open-Questions resolution says General "remains a normal
   trip for expense-logging purposes" when explaining the F3/F4 exclusion, which reads as
   scoping the exclusion to the two named aggregates only, consistent with `/trips` today
   (which already lists General with no special-casing once it has real expenses). The
   Assumptions section's shorthand ("for history/analytics purposes") is the looser of the
   two phrasings, so the more specific, explicitly-"resolved" text governs. Flagged under
   Technical Risks as a coordination point with the UX spec in case the visual design
   assumed otherwise.

## API / Interaction Design

No new API routes — this is entirely Server Components + existing server-only data
functions, same as every other page in the app. No client-side fetching, no new Server
Actions (nothing here mutates data).

### Route: `/trips/history`

A literal separate page, per the BRD's resolved Open Question 6. Nested under `/trips/`
(rather than a bare top-level `/history`) to keep trip-related routes grouped, since Next.js
App Router resolves static path segments (`history`) before the sibling dynamic segment
(`[id]`) at the same level — verified against the existing route tree
(`src/app/(app)/trips/[id]/page.tsx`, `src/app/(app)/trips/[id]/settle/page.tsx`, etc.),
so `/trips/history` does **not** get swallowed by `/trips/[id]` trying to look up a trip
literally named "history." No route collision risk.

The page lives under the existing `(app)` layout (`src/app/(app)/layout.tsx`), so it
automatically inherits `force-dynamic`, the `Header`, and `CurrentUserProvider` — no new
layout work needed.

```
src/app/(app)/trips/history/page.tsx   (new)
```

**Data flow (Server Component, no client JS required for this page):**

```ts
const [trips, users] = await Promise.all([getTrips(), getUsers()]);
const expenseTotals = await getAllExpensePaidTotals();
const snapshot = computeTripsSnapshot(users, trips, expenseTotals);

const chronological = [...trips].sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);
```

- `chronological` re-sorts the *same already-fetched* `trips` array purely for display
  (newest first, open and closed interleaved) — no second query. This is the one deviation
  from `/trips`'s open/then-closed grouping: the BRD frames this page as retrospective
  ("look back at everything we've done") rather than operational, and explicitly assumes "a
  plain chronological list is assumed sufficient absent further input," so status becomes a
  visual detail (e.g. a dimmed/badge treatment, matching `TripCard`'s existing `dimmed`
  prop) rather than a grouping axis. Exact visual treatment is the UX spec's call; the data
  contract each list item needs is just `{ id, name, status, created_at, closed_at }`,
  already present on `Trip`.
- Each list item links to `/trips/${trip.id}` — reusing the exact existing route (F2 is
  "already built," per BRD; this page just needs to link into it, not touch it).
- Whether list items also show a balance line (like `/trips` does via `computeBalance`) is
  a UX-spec decision, not a data-layer one — if wanted, it's the same per-trip
  `getTripExpenses`/`getTripSettlements`/`computeBalance` call already used in
  `trips/page.tsx`, applied here too. Flagged as a coordination point below rather than
  decided unilaterally, since it changes the query cost of the page (one extra query pair
  per trip) for a purely cosmetic choice.

**Snapshot section** (three data points, `computeTripsSnapshot` output):
- F3: `snapshot.tripCount` — a single number.
- F4: `snapshot.medianPaidByUser[user.id]` for each of the two users — two numbers, each
  labelled with that user's name/emoji (already available via `getUsers()`), per the BRD's
  note that this is "likely two numbers... left to the UX phase how both are presented."
- F5: a single sentence built from `users` + `snapshot.tripsTogetherCount`, e.g. `"${a.emoji}
  ${a.name} and ${b.emoji} ${b.name} — ${n} trips together"` — exact copy is UX's call, data
  is just the one number (identical to F3, per the interpretation above).

**Empty state:** if `snapshot.tripCount === 0` (no trips besides General exist yet), the
stats section should not render "median $0.00 / $0.00" as if it were a real answer — that's
a lie, not a stat. Show a short empty-state message instead (copy is UX's call), and the
chronological list falls back to whatever `/trips` itself shows when trip-less (today: a
"Start your first JustSplit" prompt) or an equivalent history-flavored empty message.

### Navigation entry point

Per the Success Metric "no more than 1–2 taps from the app's home screen" (home `/`
redirects to `/trips`), the most direct technical placement is a link added to
`src/components/Header.tsx`, since it renders on every page in the app — one tap from
anywhere, zero extra plumbing. Exact copy/icon/visual placement is the UX spec's call;
the engineering task is just adding one `<Link href="/trips/history">` there (or wherever
the UX spec's IA lands it — worth reconciling route/placement between both specs before
build starts, see Technical Risks).

## Infrastructure & Hosting

No changes. Same Next.js app, same Supabase Postgres instance, same Railway deployment,
same environment variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). This feature adds
one route and two files of pure computation — nothing here touches build config, deploy
config, or database connection setup.

## Build Sequence

- [ ] **Phase 1 — Data & aggregation layer**
  - [ ] Add `getAllExpensePaidTotals()` to `src/lib/data.ts`.
  - [ ] Add `src/lib/analytics.ts` with `computeTripsSnapshot()` (+ `median`/`round2`
        helpers), per the spec above.
  - [ ] Sanity-check `computeTripsSnapshot()` against a hand-tallied example (0 trips, 1
        trip, even and odd trip counts, a trip with zero expenses) before wiring it to the
        UI — this is the part most likely to have an off-by-one in the median logic.
- [ ] **Phase 2 — History page**
  - [ ] Create `src/app/(app)/trips/history/page.tsx`: fetch trips/users/expense totals,
        compute snapshot, render the F3/F4/F5 snapshot section per the finalized UX spec
        (F3+F5 combined into one line; F4 as two named figures; copy per UX_SPEC's
        Interaction Notes — "pays" not "spends," real names not "You," no the word "median").
  - [ ] Render the chronological trip list (F1): newest first, explicit "Open"/"Closed" text
        badge per row (not color/dimming alone), balance line via existing
        `BalanceText`/`computeBalance`, linking each item to `/trips/[id]` (F2, unchanged).
  - [ ] Wire the empty state for zero non-General trips (Snapshot block and trip list can
        legitimately show different states — see Reconciliation section — don't "fix" that).
  - [ ] Add `src/app/(app)/trips/history/loading.tsx` — this route's query is the heaviest in
        the app; a skeleton is worth the extra file here specifically.
- [ ] **Phase 3 — Navigation**
  - [ ] Add the `🕰️ Trip History & Stats` entry-point pill to `/trips/page.tsx`, above the
        "Open" section — per UX_SPEC's IA decision, **not** a Header link.
  - [ ] Confirm reachability in ≤1–2 taps from `/trips` per the Success Metrics.
- [ ] **Phase 4 — Verification against BRD Success Metrics**
  - [ ] Manually tally `trips`/`expenses` for the real data and compare against rendered
        F3/F4/F5 numbers.
  - [ ] Add a trip, log an expense, close/reopen a trip — confirm the snapshot updates
        immediately (no caching issue — page is `force-dynamic` via the shared layout, same
        as every other page).
  - [ ] Regression-check `/trips`, `/trips/[id]`, add/edit expense, settle-up, and
        close/reopen — confirm none of them changed behavior (this feature must be purely
        additive per the BRD's Non-Goals).

## Technical Risks & Mitigations

- **"Paid share" interpretation risk.** The BRD's language supports the `paid_by_user_id`
  reading used here, but if QA or the product owner actually meant "each person's split
  obligation" instead, F4's numbers will look wrong against a manual tally. Mitigation:
  this is called out explicitly (see Data Model §"Interpretation decisions") so it's a
  5-minute fix (swap the source field) rather than a rediscovery if it comes back from QA.
- **General-trip exclusion scope (browsing vs. stats).** Committed to: excluded from F3/F4
  only, shown normally in the F1 history list. If the UX spec's IA assumed General is
  hidden everywhere on this page, the visual design and this data contract will disagree.
  Mitigation: flagged here explicitly for reconciliation between this PRD and UX_SPEC.md
  before build starts.
- **Name-based "General" matching is inherited fragility, not new.** A trip renamed away
  from "General," or a second trip later created and literally named "General," would
  silently mis-categorize for F3/F4. This already exists as a latent risk in migration
  `0002_remove_default_trip.sql`; this feature doesn't introduce it, just depends on the
  same assumption. Not worth a schema change for a private two-person app where this is
  very unlikely to occur by accident — noted for awareness, not blocking.
- **Route/nav placement coordination with UX_SPEC.** This document proposes
  `/trips/history` and a Header-based entry point as the technically simplest choices, but
  the UX spec is being produced in parallel and may land on a different route name or
  entry-point location (e.g. a card on `/trips` itself instead of a Header link). Neither
  choice has meaningful engineering cost — flagged so the orchestrator reconciles the two
  specs' IA before build, rather than the engineer silently picking one during
  implementation.
- **Zero-expense / zero-trip edge cases.** Explicitly handled (median treats a trip with no
  expenses as a real `$0` data point per user; an empty state renders when there are zero
  non-General trips at all) rather than left to blow up or silently show `NaN`/`$0.00` as a
  false answer.
- **Performance.** A single flat `getAllExpensePaidTotals()` query plus in-memory
  aggregation is more than sufficient at this app's scale (a private two-person tool, not a
  multi-tenant product) — no pagination, indexing, or caching work is warranted, and adding
  any would be speculative generality the BRD doesn't ask for.

## Reconciliation with UX_SPEC.md (orchestrator, post-design-checkpoint)

Both flagged coordination points resolved — the two specs landed on the same answer
independently:

- **General-trip exclusion scope**: confirmed identical. UX_SPEC's States section explicitly
  documents the same list-shows-it/stats-exclude-it split as this doc's Data Model §5, and
  calls out the resulting "list vs. stats can disagree" edge case as *intentional*, not a bug
  to fix. No change needed.
- **Nav entry point**: UX_SPEC decides a pill/card on `/trips` itself, not the Header link
  this doc proposed as the "technically simplest" default — with good rationale (Header
  renders on task screens too; a single home-screen entry point already satisfies the ≤2-tap
  success metric). **This doc's Header suggestion is superseded — build the `/trips` pill per
  UX_SPEC, not a Header link.**

Two additional build requirements from UX_SPEC not fully spelled out above — both trivial,
noted here so they don't get dropped in build mode:

- **Trip list rows show a balance line**, reusing `BalanceText`/`computeBalance` exactly as
  `/trips` does today (UX_SPEC's Trip List "Success" state). This means one extra
  `getTripExpenses`/`getTripSettlements` pair per trip on this page, same pattern and cost as
  `/trips` already pays today — not a new performance concern at this scale.
- **Each row needs an explicit "Open"/"Closed" text badge** — merging into one chronological
  list loses the section-based status signal `/trips` relies on, so status can't be conveyed
  by dimming/color alone (UX_SPEC Interaction Notes). Small addition to the row markup.
- A route-level loading skeleton is worth building for this one page specifically (heaviest
  query in the app) — see UX_SPEC's Loading state row. Reasonable as a `loading.tsx` for the
  new route, following Next.js App Router convention.
