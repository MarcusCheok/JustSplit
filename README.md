# JustSplit

A cosy, ad-free Splitwise alternative for two people. See [PRD.md](./PRD.md) for the
full product spec.

## Stack

- Next.js (App Router, TypeScript) — frontend + backend in one app
- Supabase Postgres, accessed only server-side via the service-role key
- Tailwind CSS, pastel theme
- Deployed on Railway, straight from `main`

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the three values below
npm run dev
```

Env vars (`.env.local`):

- `SUPABASE_URL` — from the Supabase project settings (API section)
- `SUPABASE_SERVICE_ROLE_KEY` — same page, the **service_role** secret (never expose
  this to the browser — it's only read in server code)
- `APP_PASSCODE` — any shared passcode you and your partner will use to open the app

## Database

Schema lives in `supabase/migrations/`. Apply it with:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Renaming the two users (default seed is "Marcus" / "Partner") is a one-time SQL edit:

```sql
update users set name = 'Real Name', emoji = '🐰' where id = 2;
```

## Installing on iPhone

Open the deployed URL in Safari → Share → **Add to Home Screen**. It launches full-screen,
no browser chrome, with its own icon.
