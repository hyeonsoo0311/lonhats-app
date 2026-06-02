-- lonhats life stack schema: Move, Meal, Recovery, Mind records.

create table if not exists public.life_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stack text not null check (stack in ('move', 'meal', 'recovery', 'mind')),
  category text not null,
  title text not null,
  entry_date date not null default current_date,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  intensity text check (intensity is null or intensity in ('light', 'moderate', 'hard', 'limit')),
  meaning text,
  note text,
  score integer check (score is null or score between 0 and 100),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.life_entries enable row level security;

drop policy if exists "life_entries_owner_all" on public.life_entries;
create policy "life_entries_owner_all" on public.life_entries
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "life_entries_admin_select_all" on public.life_entries;
create policy "life_entries_admin_select_all" on public.life_entries
  for select using (app_private.is_admin());

create index if not exists life_entries_user_date_idx
  on public.life_entries (user_id, entry_date desc, created_at desc);

create index if not exists life_entries_user_stack_date_idx
  on public.life_entries (user_id, stack, entry_date desc);

create index if not exists life_entries_stack_idx
  on public.life_entries (stack);

grant select, insert, update, delete on table public.life_entries to authenticated;
