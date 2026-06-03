-- lonhats personal routine criteria for life temperature and humidity.

create table if not exists public.life_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  stack text check (stack is null or stack in ('move', 'meal', 'recovery', 'mind')),
  cadence text not null default 'weekly' check (cadence in ('daily', 'weekly', 'monthly')),
  target_count integer not null default 1 check (target_count between 1 and 31),
  temperature_weight integer not null default 1 check (temperature_weight between 0 and 5),
  humidity_weight integer not null default 1 check (humidity_weight between 0 and 5),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.life_routines enable row level security;

drop policy if exists "life_routines_owner_all" on public.life_routines;
create policy "life_routines_owner_all" on public.life_routines
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "life_routines_admin_select_all" on public.life_routines;
create policy "life_routines_admin_select_all" on public.life_routines
  for select to authenticated
  using (app_private.is_admin());

create index if not exists life_routines_user_active_idx
  on public.life_routines (user_id, is_active, created_at);

grant select, insert, update, delete on table public.life_routines to authenticated;

create table if not exists public.life_routine_checkins (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.life_routines(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_on date not null default current_date,
  completed boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  unique (routine_id, checked_on)
);

alter table public.life_routine_checkins enable row level security;

drop policy if exists "life_routine_checkins_owner_all" on public.life_routine_checkins;
create policy "life_routine_checkins_owner_all" on public.life_routine_checkins
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.life_routines
      where life_routines.id = life_routine_checkins.routine_id
        and life_routines.user_id = (select auth.uid())
    )
  );

drop policy if exists "life_routine_checkins_admin_select_all" on public.life_routine_checkins;
create policy "life_routine_checkins_admin_select_all" on public.life_routine_checkins
  for select to authenticated
  using (app_private.is_admin());

create index if not exists life_routine_checkins_user_date_idx
  on public.life_routine_checkins (user_id, checked_on desc);

create index if not exists life_routine_checkins_routine_date_idx
  on public.life_routine_checkins (routine_id, checked_on desc);

grant select, insert, update, delete on table public.life_routine_checkins to authenticated;
