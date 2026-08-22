# Trips History & Analytics — QA Report

## Coverage Summary

**Tested:**
- **Unit tests** for the pure logic in `src/lib/analytics.ts` (`computeTripsSnapshot`), added
  at `src/lib/analytics.test.ts` using Vitest (the project had no test runner installed —
  Vitest was added as a devDependency, `npm test` runs `vitest run`, config at
  `vitest.config.mts` resolves the existing `@/*` path alias). 10 tests, all passing: zero
  trips, one trip, odd trip count median, even trip count median (average of two middle
  values), a zero-expense trip counted as a real `$0` data point (not skipped), "General"
  exclusion from count/median even when it has a huge stray expense, tripCount collapsing to
  0 when only "General" exists (the empty-state trigger), both-users-zero across all counted
  trips, floating-point rounding, and independent per-user medians on the same trip set.
- **Manual/browser-driven verification** against the real running app (real Supabase data,
  real `APP_PASSCODE` login via `curl` with a cookie jar — chosen over a visual browser so
  rendered `aria-label` attributes, exact copy, and dollar figures could be asserted precisely
  against the raw RSC payload rather than eyeballed): golden-path numbers against a real
  Supabase data hand-tally, live edge cases via temporary throwaway trips/expenses (created
  and fully deleted afterward via direct Supabase calls, same pattern the engineer used),
  accessibility notes from UX_SPEC's Interaction Notes, and a regression pass across
  `/trips`, `/trips/[id]` + its sub-routes, and close/reopen.
- `tsc --noEmit`, `eslint` (full repo, plus explicitly re-scoped to only this feature's
  touched/new files), and `next build` all re-run and confirmed clean/successful.

**Not tested, with reason:**
- **Full Supabase-outage error state** (UX_SPEC's "Error" row for both the Snapshot block and
  Trip list). Simulating this against the only available environment (the real production
  Supabase project) would have required breaking real credentials or RLS/table access, which
  risks the live data this task was explicitly told to protect. Verified structurally by
  reading the code instead (see Bugs Found — this surfaced a real gap, not just an untested
  path).
- **Route-level loading skeleton (`loading.tsx`) actually painting in a browser.** The query
  is fast enough against the current tiny dataset (2 expenses) that the skeleton is very
  unlikely to be visibly observed even in a real browser; verified by reading the file against
  the UX_SPEC's Loading row instead (skeleton shape matches: pulsing pastel blocks for the
  Snapshot tiles, skeleton rows matching `TripCard`'s shape for the list).
- **"Nothing logged yet" both-zero caption rendering live in the browser.** Triggering this
  requires every counted trip to have exactly `$0` logged for both users; the only real trip
  ("Melbourne") has real expenses, and zeroing them out was out of scope (would touch real
  data). Covered by a dedicated unit test (`computeTripsSnapshot` both-zero case) plus a direct
  read of the `bothZero` branch in `page.tsx`, which is straightforward, unconditional logic.
- **Zero-trips-at-all empty state on `/trips/history` and `/trips`.** Triggering this on the
  live app requires deleting the real "Melbourne" trip, which was explicitly out of scope.
  Verified by reading the `noTripsAtAll` branch in both `trips/page.tsx` and
  `trips/history/page.tsx` — both are simple, unconditional checks on `trips.length === 0`.
- **True visual/CSS review** (color contrast, exact pixel spacing, whether the lavender pill
  "reads as a different kind of thing" from trip cards as UX_SPEC intends). No screenshot tool
  was used in this pass; verification was via rendered markup/class names, not a rendered
  screenshot. Recommend a quick manual eyeball in an actual browser before shipping if that
  visual distinction is a coordination point.

## Results

| # | Test case | Result |
|---|---|---|
| 1 | `computeTripsSnapshot` — zero trips returns all zeros | PASS |
| 2 | `computeTripsSnapshot` — one trip, median = that trip's value | PASS |
| 3 | `computeTripsSnapshot` — odd trip count, median = middle value | PASS |
| 4 | `computeTripsSnapshot` — even trip count, median = avg of two middle values | PASS |
| 5 | `computeTripsSnapshot` — zero-expense trip counted as real `$0`, not skipped | PASS |
| 6 | `computeTripsSnapshot` — "General" excluded from count/median despite huge expense | PASS |
| 7 | `computeTripsSnapshot` — only "General" exists → tripCount 0 (empty-state trigger) | PASS |
| 8 | `computeTripsSnapshot` — both users $0 across all counted trips | PASS |
| 9 | `computeTripsSnapshot` — rounds to 2dp, no floating-point drift | PASS |
| 10 | `computeTripsSnapshot` — independent medians per user, same trip set | PASS |
| 11 | `/trips/history` golden path matches independent hand-tally ($699.30/$1350.00, "1 trip together") | PASS |
| 12 | Live even-trip-count recompute after adding a real zero-expense trip ($349.65/$675.00, "2 trips together") | PASS |
| 13 | Live "General"-named trip: shown in list, excluded from stats, even with a $999,999 stray expense on it | PASS |
| 14 | Each trip row carries an explicit "Open"/"Closed" text badge (not color/opacity alone) | PASS |
| 15 | Snapshot tiles' `aria-label`s are full sentences, not fragments | PASS |
| 16 | Real names used ("Marcus"/"Baegirl"), never "You"/"them" | PASS |
| 17 | Word "median" never appears in rendered copy | PASS |
| 18 | Copy says "pays" (not "spends"/"owes") for typical-spend figures | PASS |
| 19 | `🕰️ Trip History & Stats` pill present on `/trips`, links to `/trips/history` | PASS |
| 20 | Page is force-dynamic — snapshot reflects new/closed/deleted trips immediately, no stale cache | PASS |
| 21 | Regression: `/trips` Open/Closed sections + create-trip form unaffected | PASS |
| 22 | Regression: `/trips/[id]`, `/expenses/new`, `/settle` all return 200 | PASS |
| 23 | Regression: close/reopen status change reflected correctly on both `/trips` and `/trips/history` | PASS |
| 24 | Real "Melbourne" trip + its 2 real expenses verified byte-identical before/after all QA edge-case testing | PASS |
| 25 | `tsc --noEmit`, `eslint` (touched files clean; one pre-existing unrelated error found — see below), `next build` (route resolves distinctly from `/trips/[id]`) | PASS (see note) |
| 26 | Independent failure of Snapshot vs. Trip-list sections on a partial query error (UX_SPEC's Error row) | **NOT VERIFIABLE AS DESIGNED — see Bugs Found** |

## Bugs Found

### 1. Layout-level `getUsers()` is unguarded, so a full Supabase outage skips the friendly per-section error UI this feature built

- **Where:** `src/app/(app)/layout.tsx:9` — `const users = await getUsers();`, called with no
  try/catch, in the shared layout every route (including `/trips/history`) renders inside.
- **Repro (code-level, not exercised against production):** If the Supabase connection is
  down or credentials are invalid, `getUsers()` throws inside the layout, above where
  `trips/history/page.tsx`'s own try/catch (or its `SnapshotSection`/`TripListSection`
  sub-catches) ever get a chance to run. The whole route — in fact every route under `(app)`,
  not just this one — falls through to Next.js's default/global error boundary instead of the
  "Couldn't load your trip stats — try again" / "Couldn't load your trip history — try again"
  messages this feature specifically built per UX_SPEC's Error state rows.
- **Expected (per UX_SPEC):** "A friendly inline message... Does not block the trip list below
  it from rendering if the list query itself succeeded; the two sections should fail
  independently where practical."
- **Actual:** The two sections can only fail independently for a narrower class of errors —
  e.g. the `expenses` table query failing while `trips`/`users` queries succeed (a plausible
  real scenario, like a schema/RLS issue scoped to one table) — not for a full/generic outage,
  which is the more likely real-world "Supabase is down" case the UX_SPEC's Error row appears
  to be describing.
- **Severity:** Degrades, does not block. This is **pre-existing behavior of the app's shared
  layout**, not something this feature's build introduced — `getUsers()` in `layout.tsx` was
  already unguarded before this feature, and every other page (`/trips`, `/trips/[id]`) has
  the exact same exposure. Flagging it here specifically because this feature's UX_SPEC makes
  an explicit, testable claim about independent failure that a full outage would silently
  violate, and because this is the first PRD/UX_SPEC in this codebase to call out error-state
  design explicitly enough to test against. Not a regression, not blocking for this feature's
  ship decision, but worth a follow-up ticket since "graceful error state" was an explicit
  design goal here.

No bugs found in the pure aggregation logic (`computeTripsSnapshot`), the new route's
rendering, the accessibility notes, or the regression surface (`/trips`, `/trips/[id]` and its
sub-routes, close/reopen). All numbers matched hand-tallies exactly, including under two live
edge-case scenarios exercised via throwaway Supabase data (even trip count with a zero-expense
trip; a duplicate trip literally named "General" carrying a $999,999 expense, to specifically
stress-test the name-based exclusion the PRD flagged as fragile — it held up).

## Recommendation

**Ship.** No bugs found in the feature's own logic, rendering, or copy — 25 of 26 planned
checks passed cleanly, and real production data was verified untouched after all edge-case
testing. The one finding (#1) is pre-existing app-wide behavior surfaced by this feature's own
(good) error-handling design, not a defect introduced by this build; it doesn't block or
degrade the golden path and doesn't warrant a fix-loop round for this feature. Recommend
opening it as a separate, low-priority follow-up (guard `layout.tsx`'s `getUsers()` call
app-wide) rather than treating it as in-scope for this PRD.
