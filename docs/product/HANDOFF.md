# Trips History & Analytics — Handoff

_Last updated by: qa-engineer · round 1_

## Where things stand

QA report at `docs/product/QA_REPORT.md` — **ship, no blocking bugs found**.

Added a test runner to the repo (none existed): Vitest (`npm test`), config at
`vitest.config.mts`. 10 unit tests at `src/lib/analytics.test.ts` cover
`computeTripsSnapshot` (zero/one/odd/even trip counts, zero-expense trip as a real `$0`
datapoint, General exclusion, only-General empty-state trigger, both-users-zero, rounding,
independent per-user medians) — all pass. Manually verified the live app (real Supabase data,
real passcode) via `curl` with a cookie jar: golden-path numbers match an independent
hand-tally, two live edge cases exercised via a temporary throwaway trip (created/deleted via
direct Supabase calls, cleaned up immediately, real "Melbourne" trip data confirmed untouched
before/after). All UX_SPEC accessibility notes confirmed (explicit Open/Closed badges,
full-sentence aria-labels, real names not "You", no "median" in copy, "pays" not
"spends/owes"). Regression-checked `/trips`, `/trips/[id]` + sub-routes, and close/reopen —
all unaffected. `tsc --noEmit`, `eslint` (feature files), and `next build` all clean.

One non-blocking finding, not a regression introduced by this build: `layout.tsx`'s
`getUsers()` call is unguarded, so a full Supabase outage would bypass this feature's own
per-section friendly-error UI. Pre-existing, app-wide behavior — logged as a follow-up, not a
fix-loop item for this PRD.

## Next step

Done — feature ships as built. No fix-loop round needed. If the team wants the layout-level
error-guarding gap addressed, that's a separate, low-priority follow-up ticket outside this
PRD's scope (not a re-entry into this fix loop).

## Blockers / open questions

None blocking. Non-blocking follow-up: guard `src/app/(app)/layout.tsx`'s `getUsers()` call
(and by extension every page under `(app)`, not just `/trips/history`) against a full Supabase
outage, so the app's existing pages get a friendly error state instead of falling through to
Next's default error boundary. Not introduced by this feature; surfaced by it.
