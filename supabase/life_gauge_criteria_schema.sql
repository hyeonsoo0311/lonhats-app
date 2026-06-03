-- lonhats personal life temperature and humidity criteria.

create table if not exists public.life_gauge_criteria (
  user_id uuid primary key references auth.users(id) on delete cascade,
  target_temperature integer not null default 70
    check (target_temperature between 0 and 100),
  target_humidity integer not null default 70
    check (target_humidity between 0 and 100),
  temperature_min_c numeric(3, 1) not null default 36.0
    check (temperature_min_c between 30.0 and 45.0),
  temperature_max_c numeric(3, 1) not null default 37.3
    check (temperature_max_c between 30.0 and 45.0),
  humidity_min_percent integer not null default 40
    check (humidity_min_percent between 0 and 100),
  humidity_max_percent integer not null default 50
    check (humidity_max_percent between 0 and 100),
  temperature_definition text not null default '',
  temperature_low_note text not null default '',
  temperature_high_note text not null default '',
  humidity_definition text not null default '',
  humidity_low_note text not null default '',
  humidity_high_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.life_gauge_criteria enable row level security;

drop policy if exists "life_gauge_criteria_owner_all" on public.life_gauge_criteria;
create policy "life_gauge_criteria_owner_all" on public.life_gauge_criteria
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "life_gauge_criteria_admin_select_all" on public.life_gauge_criteria;
create policy "life_gauge_criteria_admin_select_all" on public.life_gauge_criteria
  for select using (app_private.is_admin());

grant select, insert, update, delete on table public.life_gauge_criteria to authenticated;
