-- Two fixed users, no auth. Rename via UPDATE later if needed.
create table if not exists users (
  id smallint primary key,
  name text not null,
  emoji text not null,
  color text not null
);

insert into users (id, name, emoji, color) values
  (1, 'Marcus', '🐻', 'sky'),
  (2, 'Partner', '🐰', 'pink')
on conflict (id) do nothing;

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

insert into trips (name)
  select 'General'
  where not exists (select 1 from trips where name = 'General');

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  category text,
  paid_by_user_id smallint not null references users(id),
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists expenses_trip_id_idx on expenses(trip_id);

create table if not exists expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  user_id smallint not null references users(id),
  amount numeric(10, 2) not null,
  unique (expense_id, user_id)
);

create index if not exists expense_splits_expense_id_idx on expense_splits(expense_id);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  from_user_id smallint not null references users(id),
  to_user_id smallint not null references users(id),
  amount numeric(10, 2) not null check (amount > 0),
  note text,
  settled_at timestamptz not null default now()
);

create index if not exists settlements_trip_id_idx on settlements(trip_id);

-- Only the server (service-role key) ever talks to this database, so RLS is
-- enabled with no policies: deny-all for the anon/authenticated roles.
alter table users enable row level security;
alter table trips enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table settlements enable row level security;
