# Trips History & Analytics — Context

## Summary

JustSplit is a private, two-person (Marcus + partner) expense-splitting web app (Next.js +
Supabase, deployed on Railway). Expenses are grouped into "trips," which today are only
reachable via a flat operational list at `/trips` (open trips, then closed trips, with a
create-trip form) leading into a per-trip detail view (`/trips/[id]`) with expenses,
settlements, and balance. This project adds a retrospective "trip history" experience and a
small set of aggregate "snapshot" stats (trip count, typical spend, and a flagged/at-risk
travel-companion stat) on top of that existing data — read-only reporting, no new mutation
flows, no changes to the core add-expense/settle/close-trip loop.

## Log

- **PM phase** — BRD drafted at `docs/product/BRD.md`. Key scoping decisions: split the ask
  into "history browsing" (largely already exists via `/trips` + `/trips/[id]`, needs
  reframing more than rebuilding) vs. "snapshot analytics" (genuinely new: trip count, typical
  spend). Flagged the "most trips with" stat as P2/at-risk since it's mathematically fixed
  with only two users and no per-trip participant concept in the schema. Deliberately did not
  invent scope for export, sharing, filters, or date pickers, per the ask's own explicit
  instruction. Left open whether the "General" catch-all trip counts toward the stats, what
  "typical spend" precisely means (per-person vs. combined, mean vs. median), whether open
  trips count toward history/stats, and whether a literally separate page/route is required —
  all logged as open questions for the next phase.
- **PM checkpoint (orchestrator)** — all 6 open questions resolved with the product owner:
  separate page (F1/F2 IA); General trip excluded from F3 (trip count) and F4 (typical spend);
  F4 redefined as median of each person's own paid share per trip, expenses only, not the
  combined trip total; F5 (travel companion) kept as a non-comparison flavor line and promoted
  P2→P1; open trips count toward both history and stats. BRD.md updated in place to reflect
  these. Proceeding to Phase 2 (parallel UX + Engineer design).
- **Design phase (orchestrator, consolidating ux-designer + software-engineer)** — both
  agents independently converged on the same answers to the two coordination points either
  flagged: General excluded from stats only (not the history list), and F5 reuses F3's count
  exactly. UX_SPEC.md decided the nav entry point is a pill on `/trips` (not a Header link, as
  PRD.md had tentatively proposed) — PRD.md updated with a Reconciliation section marking this
  resolved and superseding its own Header suggestion. New route: `/trips/history`. Two build
  requirements folded into PRD's Build Sequence: per-row balance line (reusing `BalanceText`)
  and explicit Open/Closed text badges (status can't be conveyed by grouping once open+closed
  are merged into one chronological list), plus a `loading.tsx` for this route specifically
  since it's the heaviest query in the app. No open questions remain — proceeding to Phase 3
  (build) pending human checkpoint.
- **Build phase (software-engineer)** — implemented per PRD.md + UX_SPEC.md, using the PRD's
  Reconciliation section as authoritative (pill on `/trips`, not a Header link). Added
  `getAllExpensePaidTotals()` to `src/lib/data.ts`; added `src/lib/analytics.ts` with
  `computeTripsSnapshot()` (median/round2 helpers), sanity-checked against hand-tallied cases
  (0/1/2/3 trips, a zero-expense trip, General exclusion) before wiring to the UI — all
  matched expectations. Added `src/app/(app)/trips/history/page.tsx` (Server Component,
  Snapshot block + chronological trip list) and `loading.tsx` (pulsing skeleton, per UX_SPEC's
  call-out that this is the heaviest query in the app). Added the `🕰️ Trip History & Stats`
  pill to `/trips/page.tsx`, rendered unconditionally above the Open section (including on the
  "no trips yet" empty state, per UX_SPEC). Snapshot section and trip-list section each fetch
  and fail independently (separate try/catch, per UX_SPEC's Error state row) so an aggregation
  failure doesn't block the list from rendering. Combined F3+F5 line and F4 figures use real
  names for both users (not "You"/"them") — UX_SPEC's own accessibility rationale for avoiding
  "You" (no real auth, either person can switch identity via the Header pill) applies equally
  to this Server Component context, where there's no client-side "current user" to render
  relative to anyway; this also matches the existing `BalanceText` convention and the PRD's own
  example template literal. "Median" never appears in copy; "pays" used, not "spends"/"owes".
  Both-zero median case renders "Nothing logged yet" instead of two `$0.00` lines, per
  UX_SPEC's Partial state row. Verified: `tsc --noEmit` clean, `eslint` clean on
  new/changed files, `next build` succeeds with `/trips/history` correctly resolved as its own
  route (not swallowed by `/trips/[id]`). Ran the dev server, logged in with the real passcode,
  and exercised the golden path end-to-end against the live Supabase data (one real trip,
  "Melbourne"): confirmed the pill appears on `/trips`, `/trips/history` renders the snapshot
  (Marcus $699.30 / Baegirl $1350.00 typical spend, "1 trip together") matching an independent
  hand-tally of the raw `expenses` rows, the trip row shows the correct Open badge and balance
  line, and `/trips/[id]` still returns 200 and renders expenses/add-expense/settle-up links
  unchanged. Also spot-checked the near-empty/median edge case by creating a temporary
  zero-expense throwaway trip (`ZZ_Throwaway_QA_Test`) via direct Supabase insert, confirming
  the snapshot correctly recomputed medians to include the $0 data point (349.65 / 675.00,
  matching hand-calculation) and pluralized "2 trips together," then deleted the throwaway trip
  immediately after, restoring the real data to its original single-trip state (verified via a
  final read-only query and a final page fetch showing "1 trip together" again). Real Melbourne
  trip data was never modified.
- **QA phase, round 1 (qa-engineer) — 2026-08-22** — no test runner existed in the repo; added
  Vitest (`npm test`, `vitest.config.mts` resolving the existing `@/*` alias) and wrote 10 unit
  tests for `computeTripsSnapshot` at `src/lib/analytics.test.ts` (zero/one/odd/even trip
  counts, zero-expense trip as a real `$0` datapoint, General exclusion even against a huge
  stray expense, only-General → tripCount 0, both-users-zero, floating-point rounding,
  independent per-user medians) — all pass. Manually verified the live app via `curl` +
  cookie-jar login (real passcode, real Supabase data) rather than a visual browser, so exact
  `aria-label` text and dollar figures could be asserted against the rendered RSC payload:
  golden-path numbers matched an independent hand-tally ($699.30/$1350.00, "1 trip together");
  live-exercised two edge cases via a temporary throwaway trip (created/deleted via direct
  Supabase calls, same pattern as the build phase) — an even trip count with a new $0-expense
  trip (recomputed correctly to $349.65/$675.00, "2 trips together"), and a second trip
  literally named "General" carrying a $999,999 expense (shown in the list, fully excluded
  from stats, exactly per the PRD's flagged-as-fragile name-match exclusion). Confirmed
  explicit Open/Closed text badges, full-sentence aria-labels, real names (never "You"), no
  "median" in copy, "pays" not "spends/owes". Regression-checked `/trips`,
  `/trips/[id]` + `/expenses/new` + `/settle` (all 200, unaffected), and close/reopen (status
  reflected correctly on both `/trips` and `/trips/history`). Confirmed the real "Melbourne"
  trip and its 2 real expenses were byte-identical before and after all edge-case testing.
  `tsc --noEmit`, `eslint` (feature files clean), and `next build` all clean —
  `/trips/history` resolves as its own dynamic route, no collision with `/trips/[id]`. One
  finding, not a regression from this build: `src/app/(app)/layout.tsx`'s `getUsers()` call is
  unguarded, so a full Supabase outage (not just a partial one) would skip past this feature's
  own per-section friendly-error UI straight to Next's default error boundary — pre-existing,
  app-wide, not introduced by this feature; logged as a non-blocking follow-up. Full report at
  `docs/product/QA_REPORT.md`. Recommendation: ship.
- **Follow-up build (software-engineer), standalone — 2026-08-22** — product owner requested
  the shipped Snapshot section be personalized to whoever's currently using the device, instead
  of showing both people's numbers side by side. Scope, confirmed directly with the product
  owner as settled (not re-opened for design): (1) "Typical spend per trip" shows only the
  current user's own median (e.g. "You typically pay $340 per trip"), not both users' rows; (2)
  the trips-together line becomes "You've been on N trip(s) with &lt;other person&gt;" instead
  of "&lt;A&gt; and &lt;B&gt; — N trips together"; (3) `computeTripsSnapshot()` in
  `src/lib/analytics.ts` is completely unchanged — still computes both users' medians and the
  same trip count; this is purely a presentation change over already-computed data.
  Architecturally, this page is a Server Component with no server-side "current user" (no real
  auth — see PRD.md §Data Model); "current user" only exists client-side via
  `CurrentUserProvider`/`useCurrentUser()` (localStorage-backed), the same pattern already used
  by `Header.tsx` and `ExpenseForm.tsx`. Extracted the snapshot's presentation into a new small
  Client Component, `src/components/TripsSnapshotSummary.tsx`, which takes the already-computed
  `tripCount` and `medianPaidByUser` as props (no new data fetching, no client-side Supabase
  calls) and uses `useCurrentUser()` purely to decide labeling — picks the current user's own
  median to display and the *other* user's name/emoji for the "with &lt;other person&gt;" line.
  `src/app/(app)/trips/history/page.tsx`'s `SnapshotSection` (still a Server Component, still
  doing the same data fetch + try/catch error handling + the `tripCount === 0` empty state,
  none of which changed) now just renders `<TripsSnapshotSummary users={users}
  tripCount={snapshot.tripsTogetherCount} medianPaidByUser={snapshot.medianPaidByUser} />`
  instead of the old inline both-users JSX; the old per-user `.map()` loop and the "&lt;A&gt;
  and &lt;B&gt; — N trips together" combined string are gone from the codebase (grepped to
  confirm nothing dangling). `currentUser` is typed `User | null` by the provider but is
  narrowed with a non-null assertion in the new component, per the documented guarantee that
  every `(app)` page is wrapped in `CurrentUserProvider`, which itself gates all children
  (including this component) behind a mandatory "who's this" picker until a user is selected —
  so `currentUser` is always non-null by the time this component actually renders. Root cause
  worth noting for future manual QA on this app: `CurrentUserProvider` returns `null` during SSR
  (its `hydrated` state starts `false` and only flips in a `useEffect`, which doesn't run
  server-side), so a plain `curl` fetch of any `(app)` page renders blank for the entire
  subtree — the previous build/QA rounds' curl-based verification only worked because the old
  Snapshot markup was fully computed server-side as literal strings that got serialized into the
  child props passed across the client-component boundary regardless of what the boundary
  itself rendered; a genuinely client-rendered value like the new personalized copy has no such
  fallback and needs real JS execution to observe. Verified this build instead with a headless
  Playwright browser (installed standalone into the scratchpad, not added to this repo's
  `package.json`/lockfile): logged in with the real passcode against the live dev server and
  real Supabase data (the same single real "Melbourne" trip used in prior verification rounds,
  not modified), selected Marcus via the identity picker, and confirmed `/trips/history` renders
  "🧳 You've been on 1 trip with 🐰 Baegirl" and "🐻 You typically pay $699.30" — then switched
  identity via the Header pill and confirmed it re-renders as "You've been on 1 trip with
  Marcus" / "You typically pay $1350.00" for Baegirl, matching the exact figures independently
  hand-tallied in the original build/QA rounds, just now attributed to whichever person is
  "you." Confirmed via `body.innerText()` that neither of the old combined phrasings ("and
  Baegirl —" / "and Marcus —") remains anywhere on the page. `tsc --noEmit`, `eslint` (changed
  files), `next build`, and the existing 10 `analytics.test.ts` unit tests all pass unchanged —
  confirming `computeTripsSnapshot()` itself was untouched. Known, explicitly accepted tradeoff
  (not solved, not gold-plated around, per direct product-owner instruction): this reintroduces
  "You" framing that the original UX_SPEC deliberately avoided given there's no real auth — if
  the device gets picked up by the other person before they re-select their name via the Header
  pill, they'll see the wrong person's stats labeled as their own. Product owner has explicitly
  accepted this for this private two-person app; no new auth, warning banner, or defensive
  handling was added.
