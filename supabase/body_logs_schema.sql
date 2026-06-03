-- lonhats body state records.
-- Body data is private user-owned data and must not be shared automatically.

create table if not exists public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null default current_date,
  height_cm numeric(5, 2) check (height_cm is null or height_cm between 50 and 250),
  weight_kg numeric(5, 2) check (weight_kg is null or weight_kg between 20 and 400),
  birth_date date,
  sex text check (sex is null or sex in ('female', 'male', 'other')),
  skeletal_muscle_kg numeric(5, 2)
    check (skeletal_muscle_kg is null or skeletal_muscle_kg between 0 and 200),
  body_fat_percent numeric(5, 2)
    check (body_fat_percent is null or body_fat_percent between 0 and 80),
  condition text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.body_logs enable row level security;

drop policy if exists "body_logs_owner_all" on public.body_logs;
create policy "body_logs_owner_all" on public.body_logs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "body_logs_admin_select_all" on public.body_logs;
create policy "body_logs_admin_select_all" on public.body_logs
  for select to authenticated
  using (app_private.is_admin());

create index if not exists body_logs_user_date_idx
  on public.body_logs (user_id, measured_on desc, created_at desc);

grant select, insert, update, delete on table public.body_logs to authenticated;
