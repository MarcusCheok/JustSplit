# JustSplit — Product Requirements Document

## 1. Why

Splitwise works, but it's ad-laden and cluttered for a two-person use case. JustSplit is a
private, minimal expense-splitting app for exactly two people (Marcus + girlfriend). No ads,
no accounts to manage, no features neither of us needs. Gamification is an explicit
non-goal for v1 — get the core split/tabulate loop right first.

## 2. Users

Exactly two fixed people. No sign-up, no passwords, no Supabase Auth. On first open, you pick
"Marcus" or "Girlfriend" from two big buttons; that choice is remembered on the device
(localStorage) and used to attribute expenses. Since the app lives on a public Railway URL,
a single shared passcode gate protects the whole app from randoms stumbling onto it — this is
access control, not identity.

## 3. Core concept: Trips

Expenses are grouped into **Trips** (a trip can be a literal trip, or just "General" for
everyday shared expenses — a default open-ended trip). A trip is:
- Open (actively collecting expenses) or Closed (archived, read-only, balance locked in history)
- Named, with a running list of expenses and a live balance

At any time, and always when a trip is closed, JustSplit tabulates: total spent, spent by each
person, and the net result — "Marcus owes Girlfriend $42.50" (or vice versa, or "all settled").

## 4. Core features (v1)

1. **Pick your name** on device (one-time, persisted).
2. **Trips list** — open trips first, closed trips below. Create a new trip (name only,
   defaults to open). "General" trip exists by default for non-trip shared spending.
3. **Add expense** to a trip:
   - Description (required)
   - Amount (required)
   - Category (optional, small fixed list: Food, Transport, Accommodation, Shopping, Fun, Other)
   - Paid by: Marcus / Girlfriend
   - Date (defaults to today)
   - Split: quick-pick chips —
     - 50 / 50 (default)
     - 100% Marcus / 100% Girlfriend (i.e. "logged for tracking, not actually shared")
     - Custom exact amounts (two number fields that must sum to the total)
     - Custom percentage
4. **Edit / delete** an expense.
5. **Trip detail view**: chronological expense list (who paid, amount, category, split summary),
   running balance banner at top ("Marcus owes Girlfriend $X" / "All settled up").
6. **Settle up**: record a manual payment between the two of you (amount, optional note, date).
   This nets against the balance without being a "shared expense" itself.
7. **Close a trip**: locks it as read-only/archived; balance at close time is preserved.
8. **Installable on iPhone**: PWA manifest + icons + Apple meta tags so "Add to Home Screen"
   gives a full-screen, app-like icon and experience. No App Store, no native shortcut.

## 5. Explicit non-goals (v1)

- Gamification (streaks, points, badges) — revisit after core loop is solid.
- More than 2 users / group support.
- Multiple currencies or FX conversion.
- Receipt photo scanning / OCR.
- Native iOS Shortcuts / Siri integration.
- Push notifications.
- Real per-user authentication.

## 6. Data model (Postgres via Supabase)

```
users            id (smallint, fixed: 1=Marcus, 2=Girlfriend), name, emoji, color
trips            id (uuid), name, status ('open'|'closed'), created_at, closed_at
expenses         id (uuid), trip_id, description, amount, category, paid_by_user_id,
                 expense_date, created_at
expense_splits   id (uuid), expense_id, user_id, amount   -- sums to expenses.amount
settlements      id (uuid), trip_id, from_user_id, to_user_id, amount, note, settled_at
```

Balance math (per trip, or overall across open trips): for each user, `paid - owed` from
expense_splits, then net the two settlements in. Positive means the other person owes them.

## 7. Tech stack

- **Frontend/backend**: Next.js (App Router, TypeScript), deployed as a single full-stack app.
- **Database**: Supabase Postgres. Accessed **only from the server** (Route Handlers / Server
  Actions) using the service-role key — the browser never talks to Supabase directly, so RLS
  can stay locked down (deny-all) and there's no auth token to manage client-side.
- **Hosting**: Railway, deployed straight from the `MarcusCheok/JustSplit` GitHub repo
  (push to `main` → auto-deploy).
- **Styling**: Tailwind CSS. Cutesy, gentle palette — soft pink / lavender / mint pastels,
  rounded corners, a friendly rounded font (Nunito or Quicksand via next/font).
- **PWA**: `manifest.json` + apple-touch-icon + `viewport-fit`/theme-color meta tags. No
  service worker complexity needed for v1 (no offline requirement) — just installability.
- **Access control**: single shared passcode (env var), stored as an httpOnly cookie after
  entry, checked in middleware.

## 8. Milestones

1. Scaffold Next.js app, Tailwind theme, PWA shell, passcode gate, name-picker.
2. Supabase project + schema + server-side data client.
3. Trips list + create/close trip.
4. Add/edit/delete expense with split picker.
5. Trip detail view with balance banner + settle-up.
6. Deploy to Railway, verify installable on iPhone.
7. (Later, explicitly deferred) gamification pass.
