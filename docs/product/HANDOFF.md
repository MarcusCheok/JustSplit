# Trips History & Analytics — Handoff

_Last updated by: software-engineer · build mode (standalone follow-up, two independent fixes)_

## Where things stand

Two product-owner-requested fixes shipped this round, both independent of each other and of the
prior personalization follow-up (see CONTEXT.md log through the previous round).

**Fix 1 — "Typical spend per trip" now uses real cost share, not who paid at checkout.**
`getAllExpensePaidTotals()` in `src/lib/data.ts` is gone, replaced by
`getAllExpenseSplitTotals()`, which queries `expense_splits` (embedding `expenses(trip_id)`) and
returns each user's actual split `amount` per trip. `computeTripsSnapshot()` in
`src/lib/analytics.ts` now groups by `user_id` and its output field is `medianSpendByUser` (was
`medianPaidByUser`) — same median/rounding logic, different (correct) input. `src/lib/balance.ts`
and `src/lib/breakdown.ts` are untouched; they still correctly use `paid_by_user_id` for
settle-up math, a separate and still-valid concept. Copy on `/trips/history` now says "You
typically spend $X" with caption "Based on your share of each trip's costs, not who paid at
checkout." All 10 `analytics.test.ts` tests updated (mechanical field rename only, same numeric
expectations) and passing. Verified against the real "Melbourne" trip (Flights $1350 paid by
Baegirl split 675/675, Airbnb $699.30 paid by Marcus split 349.65/349.65): both users' true share
is $1024.65 each — confirmed live via Playwright for both identities, replacing the old
paid-based $699.30 / $1350.00 figures.

**Fix 2 — press/tap feedback app-wide, plus three low-contrast buttons.** Added
`transition active:scale-[0.97]` (one consistent value, inline Tailwind utilities, no shared CSS
class, matching this codebase's convention) to every button and clickable card: all primary
submit buttons, `ExpenseForm`'s split-mode chips, the paid-by/who-paid radio pills, the identity
picker and Header identity-switch pill, `/trips` and `/trips/history` trip cards, the history
entry-point pill, expense-row cards, and the login submit button. Fixed the three buttons that
read as disabled (plain `bg-white` + faint ring, no shadow): "Close trip" now uses full-strength
`text-ink` + `shadow-sm`; "Reopen trip" got a `bg-mint`/`ring-mint-dark/40` positive-action tint +
`shadow-sm`; "Delete expense" kept its rose/destructive signal but added `shadow-sm` and a
`ring-rose-200` tint instead of plain black/10.

Verified: `tsc --noEmit`, `next build`, `vitest run` (10/10 pass), and `eslint` clean on every
changed file (one pre-existing, untouched `react-hooks/set-state-in-effect` finding in
`CurrentUserProvider.tsx` surfaces only on a full `eslint src` run — unrelated to this round,
not fixed as it's out of scope for either requested fix). Ran the real dev server against real
Supabase data: confirmed the corrected spend figures for both identities via the Header switch
pill, confirmed via a held mousedown that `active:scale-[0.97]` genuinely animates the "+ Add
expense" button's computed `scale` from 1 to 0.97, and screenshotted the trip-detail (open and
closed states) and expense-edit pages to confirm Close/Reopen/Delete no longer read as disabled.
Exercised the real Close/Reopen toggle live via the UI to verify the button swap, then reopened
it; a final read-only Supabase query confirmed the real trip/expenses/splits are byte-identical
to their pre-verification state (1 open trip, 2 expenses, 4 splits).

## Next step

Ready for a human/product-owner look, or a QA re-pass if the team wants one for these two scoped
fixes. Nothing else pending from this round.

## Blockers / open questions

None from this round. Carried-over, still-non-blocking items, not touched by this round:
- `src/app/(app)/layout.tsx`'s `getUsers()` call is unguarded, so a full Supabase outage would
  skip past any per-section friendly-error UI straight to Next's default error boundary —
  app-wide, pre-existing, not introduced by this or any prior round.
- `src/components/CurrentUserProvider.tsx`'s hydration `useEffect` calls `setCurrentUserState`
  synchronously in the effect body, which a full `eslint src` run flags as
  `react-hooks/set-state-in-effect`. Pre-existing (present before this round's edits, which only
  touched an unrelated className in the same file), functionally harmless (single mount-time
  sync, not a render loop), not fixed since it's unrelated to either of this round's requested
  fixes.
