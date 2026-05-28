-- Better Today initial Supabase schema draft.
-- Run this only after creating a Supabase project and reviewing policies.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  display_name text,
  goal_mode text not null default 'maintain' check (goal_mode in ('cut', 'maintain', 'gain')),
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  daily_calorie_target integer
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);

create policy "profiles_insert_own" on public.profiles
  for insert with check ((select auth.uid()) = id);

create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id);

create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  target text not null,
  purpose text not null,
  cue text not null,
  level text not null default 'beginner'
);

alter table public.exercise_library enable row level security;

create policy "exercise_library_read_all" on public.exercise_library
  for select using (true);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trained_on date not null default current_date,
  memo text,
  perceived_difficulty integer check (perceived_difficulty between 1 and 10),
  created_at timestamptz not null default now()
);

alter table public.workout_sessions enable row level security;

create policy "workout_sessions_owner_all" on public.workout_sessions
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  set_count integer,
  reps integer,
  load_kg numeric,
  minutes integer,
  created_at timestamptz not null default now()
);

alter table public.workout_sets enable row level security;

create policy "workout_sets_owner_all" on public.workout_sets
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  label text,
  created_at timestamptz not null default now()
);

alter table public.meals enable row level security;

create policy "meals_owner_all" on public.meals
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount_text text,
  calories integer not null default 0,
  protein_gram numeric not null default 0,
  carbs_gram numeric not null default 0,
  fat_gram numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.meal_items enable row level security;

create policy "meal_items_owner_all" on public.meal_items
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  mood text,
  small_win text,
  body text,
  created_at timestamptz not null default now()
);

alter table public.journal_entries enable row level security;

create policy "journal_entries_owner_all" on public.journal_entries
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
