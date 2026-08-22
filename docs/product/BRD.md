# Trips History & Analytics — Business Requirements

## Problem Statement

JustSplit already has a `/trips` route, but it's purely operational: a flat list of open
trips (to jump into and keep logging expenses) followed by closed trips (archived), with a
create-trip form in between. It exists to get you *into* a trip to do something, not to look
*back* over your trips as a whole.

The raw ask bundles two distinct needs:
1. **A retrospective view of trip history** — "always see all the past trips" — largely
   already exists today (`/trips` lists both open and closed trips, and `/trips/[id]` already
   shows the full expense/settlement detail for any trip). What's missing is framing this as a
   deliberate "look back at everything we've done" experience rather than an operational
   picklist.
2. **Aggregate analytics about trips as a whole** — trip count, typical spend, travel
   companion — which does not exist in any form today and is the genuinely new capability
   this ask is asking for.

The underlying need is emotional/reflective as much as functional: this is a private,
two-person app for a couple, and part of the value is being able to look back at "everything
we've done together," not just settle up.

## Goals & Non-Goals

**Goals**
- Let either user browse all trips they've used JustSplit for (open and closed) as a
  retrospective, with the ability to click into any trip to see its expenses/settlements —
  reusing existing trip-detail functionality, not rebuilding it.
- Surface a small set of aggregate "snapshot" stats about trips as a whole (count, typical
  spend, and — with a caveat flagged below — travel companion).
- Do this additively: no change to existing trip creation, expense logging, settling, or
  close/reopen flows.

**Non-Goals** (per the ask's own explicit scope note, and nothing in the ask implies these)
- No export or sharing of trip history/analytics.
- No filters, search, or date-range pickers on the history view.
- No new authentication, roles, or per-user permission differences — both users see the same
  thing.
- No multi-person/group support — still exactly two fixed users.
- No new mutation flows — this entire ask is read-only reporting on data that already exists.
- No elaborate "who you traveled with most" comparison logic — see Open Questions; the data
  model has no concept of per-trip participants, so this cannot meaningfully vary today.

## Stakeholders & Personas

There is no role differentiation in this app (see `PRD.md` §2) — both stakeholders have
identical needs and identical access to every screen.

| Persona | Goal | Success looks like |
|---|---|---|
| Marcus | Look back at trips taken together; get a quick pulse on trip spending | Can find "all our trips" and a snapshot of stats within a couple of taps from the home screen |
| Partner | Same as above | Same as above |

(Both are the same persona in practice — "either of the app's two users" — kept as two rows
only to make explicit that nothing here is Marcus-specific.)

## Feature Breakdown (MECE)

Grouped by **capability area** (history browsing vs. aggregate analytics), since that's the
natural split in the ask itself and the two areas have different data shapes (per-trip list
vs. cross-trip aggregation).

### 1. Trip History Browsing
| Feature | Priority | Stakeholder(s) |
|---|---|---|
| F1. A view where a user can see all trips they've used JustSplit for, in one place | P0 | Marcus, Partner |
| F2. Click into any trip from that view to see its expenses, settlements, and balance | P0 (already built — `/trips/[id]`; ensure it stays reachable from wherever F1 lives) | Marcus, Partner |

Note: F1 and F2 together largely describe what `/trips` + `/trips/[id]` already do. The net
*new* work in this category may be closer to "reframe/relabel as history" than "build from
scratch" — that's a call for the UX/Engineering phase once IA is decided (see Open Questions
on whether a literally separate page is required).

### 2. Trips Snapshot / Analytics
| Feature | Priority | Stakeholder(s) |
|---|---|---|
| F3. Total trip count ("how many trips have you been on so far") — excludes the General trip | P0 | Marcus, Partner |
| F4. Typical spend per person per trip (median of each person's own paid share across trips, not the combined trip total) — excludes the General trip | P0 | Marcus, Partner |
| F5. "You and \<other person\> — N trips together" flavor line — not a ranked/comparison stat, just a warm touch consistent with the app's tone | P1 | Marcus, Partner |

**Resolved (was Open Question 4):** F5 is not a "most frequent companion" ranking — with two
fixed users that can't vary — it's a single flavor line stating trips-together count. Promoted
from P2 to P1 since it's now trivial to compute and was explicitly requested.

**Resolved (was Open Question 3):** F4 is per-person, not combined-trip-total: each person's
own paid share per trip, aggregated as a **median** (resists skew from one unusually expensive
trip, e.g. a flight-heavy trip) — not a mean. This likely means two numbers (one per person),
not one shared figure — left to the UX phase how both are presented together.

## Success Metrics

This is a private two-person app, so metrics are simple and mostly checkable directly rather
than instrumented:
- Both users can get from the app's home screen to (a) the trip history and (b) the snapshot
  stats in no more than 1–2 taps.
- Snapshot stats (count, typical spend) are correct and update immediately as trips are
  added/closed and expenses logged — verifiable by comparing against a manual tally of the
  `trips`/`expenses` tables.
- No regression in existing trip list, trip detail, add/edit expense, settle-up, or
  close/reopen behavior.
- Qualitative: both users find the retrospective/snapshot genuinely worth looking at (this is
  the actual bar for a personal app like this — not a growth metric).

## Constraints & Assumptions

**Constraints**
- Exactly two fixed users, no auth beyond the shared passcode — carried over from the base
  product, not something this ask changes.
- No new mutation/write flows — everything here reads existing `trips`, `expenses`,
  `expense_splits`, and `settlements` data.
- Must not regress or restructure existing add/edit expense, settle-up, or close/reopen
  flows.
- Per the ask's own instruction: no export, sharing, filters, or date pickers unless a natural
  reading of "history page" requires them — a plain chronological list is assumed sufficient
  absent further input.

**Assumptions** (flagged explicitly, not silently baked into the feature list)
- All aggregate stats can be computed from data that already exists in the schema (`trips`,
  `expenses`, `expense_splits`, `settlements`) — no new tables/columns are assumed necessary,
  *except* if Open Question 4 below is resolved in a direction that requires tracking
  per-trip participants, which would be a data-model change outside this document's scope to
  decide.
- "Trips" for history/analytics purposes means rows in the `trips` table **excluding** the
  row named "General" — resolved, see Open Questions.

## Open Questions — resolved

All six original open questions have been resolved with the product owner:

1. **"Tagged profile thing"** — informal phrasing, not a literal profile page. No distinct
   "profile" concept is being introduced.
2. **Does "General" count?** No — excluded from trip count and typical-spend stats (F3, F4).
   It remains a normal trip for expense-logging purposes, just excluded from these two
   aggregates.
3. **"Typical spend" definition** — per-person median paid share per trip (not combined trip
   total, not mean). See F4.
4. **Travel companion stat** — kept as a non-comparison flavor line (F5), not dropped.
5. **Do open trips count?** — Yes, open (in-progress) trips count toward history and the
   snapshot stats, not just closed ones. Only General is excluded from F3/F4, per #2.
6. **Separate page or section?** — A literal separate page, per the ask's original wording.
   Route/navigation details are the UX phase's call.

Also clarify: F4's "logged expenses" basis excludes settlements — a settlement is a repayment
between the two people, not new spend, so it shouldn't inflate a "how much do I spend on
trips" figure.
