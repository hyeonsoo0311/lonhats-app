-- lonhats service schema: auth profiles, logs, community, admin operations, food DB.

create schema if not exists app_private;

alter table public.profiles
  add column if not exists username text unique,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists role text not null default 'member'
    check (role in ('member', 'admin')),
  add column if not exists updated_at timestamptz not null default now();

create or replace function app_private.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on schema app_private from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_admin() to authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    case when lower(new.email) = 'hyeeonsoo@gmail.com' then 'admin' else 'member' end
  )
  on conflict (id) do update
    set display_name = coalesce(public.profiles.display_name, excluded.display_name),
        role = case
          when lower(new.email) = 'hyeeonsoo@gmail.com' then 'admin'
          else public.profiles.role
        end,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

insert into public.profiles (id, display_name, role)
select
  id,
  coalesce(raw_user_meta_data ->> 'display_name', split_part(email, '@', 1)),
  case when lower(email) = 'hyeeonsoo@gmail.com' then 'admin' else 'member' end
from auth.users
on conflict (id) do update
  set role = excluded.role,
      updated_at = now();

drop policy if exists "profiles_admin_select_all" on public.profiles;
create policy "profiles_admin_select_all" on public.profiles
  for select using (app_private.is_admin());

drop policy if exists "profiles_admin_update_all" on public.profiles;
create policy "profiles_admin_update_all" on public.profiles
  for update using (app_private.is_admin())
  with check (app_private.is_admin());

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

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trained_on date not null default current_date,
  exercise_name text not null,
  minutes integer check (minutes is null or minutes >= 0),
  set_count integer check (set_count is null or set_count >= 0),
  reps integer check (reps is null or reps >= 0),
  load_kg numeric check (load_kg is null or load_kg >= 0),
  perceived_difficulty integer check (perceived_difficulty is null or perceived_difficulty between 1 and 10),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workout_logs enable row level security;

drop policy if exists "workout_logs_owner_all" on public.workout_logs;
create policy "workout_logs_owner_all" on public.workout_logs
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "workout_logs_admin_select_all" on public.workout_logs;
create policy "workout_logs_admin_select_all" on public.workout_logs
  for select using (app_private.is_admin());

create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand_name text,
  serving_gram numeric not null default 100,
  calories_per_serving integer not null default 0,
  protein_gram numeric not null default 0,
  carbs_gram numeric not null default 0,
  fat_gram numeric not null default 0,
  source text not null default 'seed',
  source_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists food_items_source_name_source_id_key
  on public.food_items (source, name, coalesce(source_id, ''));

alter table public.food_items enable row level security;

create table if not exists public.secure_app_config (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.secure_app_config enable row level security;
revoke all on public.secure_app_config from anon, authenticated;

drop policy if exists "secure_app_config_no_client_access" on public.secure_app_config;
create policy "secure_app_config_no_client_access" on public.secure_app_config
  for all using (false)
  with check (false);

drop policy if exists "food_items_read_authenticated" on public.food_items;
create policy "food_items_read_authenticated" on public.food_items
  for select using ((select auth.uid()) is not null);

drop policy if exists "food_items_admin_all" on public.food_items;
create policy "food_items_admin_all" on public.food_items
  for all using (app_private.is_admin())
  with check (app_private.is_admin());

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_on date not null default current_date,
  meal_type text not null default '식사',
  raw_text text not null,
  food_name text not null,
  amount_gram numeric,
  calories integer not null default 0,
  protein_gram numeric not null default 0,
  carbs_gram numeric not null default 0,
  fat_gram numeric not null default 0,
  source text,
  source_id text,
  confidence numeric check (confidence is null or confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meal_logs enable row level security;

drop policy if exists "meal_logs_owner_all" on public.meal_logs;
create policy "meal_logs_owner_all" on public.meal_logs
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "meal_logs_admin_select_all" on public.meal_logs;
create policy "meal_logs_admin_select_all" on public.meal_logs
  for select using (app_private.is_admin());

create table if not exists public.weekly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  average_calories_in integer not null default 0,
  average_calories_out integer not null default 0,
  average_workout_minutes integer not null default 0,
  recommended_daily_calorie_adjustment integer not null default 0,
  recommended_weekly_workout_minutes integer not null default 0,
  recommendation text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_summaries enable row level security;

drop policy if exists "weekly_summaries_owner_select" on public.weekly_summaries;
create policy "weekly_summaries_owner_select" on public.weekly_summaries
  for select using ((select auth.uid()) = user_id);

drop policy if exists "weekly_summaries_admin_all" on public.weekly_summaries;
create policy "weekly_summaries_admin_all" on public.weekly_summaries
  for all using (app_private.is_admin())
  with check (app_private.is_admin());

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_display_name text,
  channel text not null default 'Better tomorrow',
  title text not null,
  body text not null,
  post_type text not null default 'discussion' check (post_type in ('discussion', 'proof')),
  stack text check (stack is null or stack in ('move', 'meal', 'recovery', 'mind')),
  proof_kind text check (proof_kind is null or proof_kind in ('daily_better', 'challenge_day', 'weekly_share')),
  source_life_entry_id uuid,
  challenge_day integer check (challenge_day is null or (challenge_day >= 1 and challenge_day <= 30)),
  upvote_count integer not null default 0,
  comment_count integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_posts enable row level security;

drop policy if exists "community_posts_read_all" on public.community_posts;
create policy "community_posts_read_all" on public.community_posts
  for select using ((select auth.uid()) is not null and deleted_at is null);

drop policy if exists "community_posts_insert_own" on public.community_posts;
create policy "community_posts_insert_own" on public.community_posts
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "community_posts_update_own_or_admin" on public.community_posts;
create policy "community_posts_update_own_or_admin" on public.community_posts
  for update using ((select auth.uid()) = user_id or app_private.is_admin())
  with check ((select auth.uid()) = user_id or app_private.is_admin());

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_display_name text,
  parent_id uuid references public.community_comments(id) on delete cascade,
  body text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_comments enable row level security;

drop policy if exists "community_comments_read_all" on public.community_comments;
create policy "community_comments_read_all" on public.community_comments
  for select using ((select auth.uid()) is not null and deleted_at is null);

drop policy if exists "community_comments_insert_own" on public.community_comments;
create policy "community_comments_insert_own" on public.community_comments
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "community_comments_update_own_or_admin" on public.community_comments;
create policy "community_comments_update_own_or_admin" on public.community_comments
  for update using ((select auth.uid()) = user_id or app_private.is_admin())
  with check ((select auth.uid()) = user_id or app_private.is_admin());

create table if not exists public.community_votes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  value integer not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.community_votes enable row level security;

drop policy if exists "community_votes_owner_all" on public.community_votes;
create policy "community_votes_owner_all" on public.community_votes
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.community_posts(id) on delete cascade,
  comment_id uuid references public.community_comments(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.community_reports enable row level security;

drop policy if exists "community_reports_insert_own" on public.community_reports;
create policy "community_reports_insert_own" on public.community_reports
  for insert with check ((select auth.uid()) = reporter_id);

drop policy if exists "community_reports_admin_all" on public.community_reports;
create policy "community_reports_admin_all" on public.community_reports
  for all using (app_private.is_admin())
  with check (app_private.is_admin());

create table if not exists public.user_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null default 'general',
  body text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_feedback enable row level security;

drop policy if exists "user_feedback_owner_insert" on public.user_feedback;
create policy "user_feedback_owner_insert" on public.user_feedback
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "user_feedback_owner_select" on public.user_feedback;
create policy "user_feedback_owner_select" on public.user_feedback
  for select using ((select auth.uid()) = user_id);

drop policy if exists "user_feedback_admin_all" on public.user_feedback;
create policy "user_feedback_admin_all" on public.user_feedback
  for all using (app_private.is_admin())
  with check (app_private.is_admin());

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

alter table public.admin_notes enable row level security;

drop policy if exists "admin_notes_admin_all" on public.admin_notes;
create policy "admin_notes_admin_all" on public.admin_notes
  for all using (app_private.is_admin())
  with check (app_private.is_admin());

create table if not exists public.app_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal', 'important')),
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_notices enable row level security;

drop policy if exists "app_notices_read_published" on public.app_notices;
create policy "app_notices_read_published" on public.app_notices
  for select using (is_published = true or app_private.is_admin());

drop policy if exists "app_notices_admin_all" on public.app_notices;
create policy "app_notices_admin_all" on public.app_notices
  for all using (app_private.is_admin())
  with check (app_private.is_admin());

create unique index if not exists journal_entries_user_entry_date_key
  on public.journal_entries (user_id, entry_date);

create index if not exists admin_notes_admin_id_idx on public.admin_notes (admin_id);
create index if not exists admin_notes_target_user_id_idx on public.admin_notes (target_user_id);
create index if not exists app_notices_created_by_idx on public.app_notices (created_by);
create index if not exists community_posts_user_id_idx on public.community_posts (user_id);
create index if not exists community_posts_post_type_idx on public.community_posts (post_type);
create index if not exists community_posts_proof_stack_idx on public.community_posts (proof_kind, stack);
create index if not exists community_posts_source_life_entry_id_idx on public.community_posts (source_life_entry_id);
create index if not exists community_comments_post_id_idx on public.community_comments (post_id);
create index if not exists community_comments_user_id_idx on public.community_comments (user_id);
create index if not exists community_comments_parent_id_idx on public.community_comments (parent_id);
create index if not exists community_reports_reporter_id_idx on public.community_reports (reporter_id);
create index if not exists community_reports_post_id_idx on public.community_reports (post_id);
create index if not exists community_reports_comment_id_idx on public.community_reports (comment_id);
create index if not exists community_votes_post_id_idx on public.community_votes (post_id);
create index if not exists meal_logs_user_id_idx on public.meal_logs (user_id);
create index if not exists meal_logs_user_date_idx on public.meal_logs (user_id, eaten_on);
create index if not exists user_feedback_user_id_idx on public.user_feedback (user_id);
create index if not exists workout_logs_user_id_idx on public.workout_logs (user_id);
create index if not exists workout_logs_user_date_idx on public.workout_logs (user_id, trained_on);
create index if not exists meals_user_id_idx on public.meals (user_id);
create index if not exists meal_items_meal_id_idx on public.meal_items (meal_id);
create index if not exists meal_items_user_id_idx on public.meal_items (user_id);
create index if not exists workout_sessions_user_id_idx on public.workout_sessions (user_id);
create index if not exists workout_sets_session_id_idx on public.workout_sets (session_id);
create index if not exists workout_sets_user_id_idx on public.workout_sets (user_id);

create or replace function app_private.refresh_community_post_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_posts
  set upvote_count = coalesce((
        select sum(value)::integer
        from public.community_votes
        where post_id = coalesce(new.post_id, old.post_id)
      ), 0),
      comment_count = coalesce((
        select count(*)::integer
        from public.community_comments
        where post_id = coalesce(new.post_id, old.post_id)
          and deleted_at is null
      ), 0),
      updated_at = now()
  where id = coalesce(new.post_id, old.post_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists community_votes_refresh_counts on public.community_votes;
create trigger community_votes_refresh_counts
  after insert or update or delete on public.community_votes
  for each row execute function app_private.refresh_community_post_counts();

drop trigger if exists community_comments_refresh_counts on public.community_comments;
create trigger community_comments_refresh_counts
  after insert or update or delete on public.community_comments
  for each row execute function app_private.refresh_community_post_counts();

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.food_items to authenticated;
grant select on public.app_notices to authenticated;

insert into public.food_items
  (name, serving_gram, calories_per_serving, protein_gram, carbs_gram, fat_gram, source, source_id)
values
  ('닭가슴살', 100, 165, 31, 0, 3.6, 'seed', 'chicken-breast'),
  ('현미밥', 210, 320, 6, 68, 2.5, 'seed', 'brown-rice-bowl'),
  ('흰쌀밥', 210, 315, 5.6, 70, 0.7, 'seed', 'white-rice-bowl'),
  ('삶은 달걀', 50, 78, 6.3, 0.6, 5.3, 'seed', 'boiled-egg'),
  ('고구마', 100, 128, 1.4, 30, 0.2, 'seed', 'sweet-potato'),
  ('바나나', 100, 89, 1.1, 23, 0.3, 'seed', 'banana'),
  ('그릭요거트', 100, 95, 9, 4, 5, 'seed', 'greek-yogurt'),
  ('두부', 100, 76, 8, 1.9, 4.8, 'seed', 'tofu'),
  ('연어', 100, 208, 20, 0, 13, 'seed', 'salmon'),
  ('아보카도', 100, 160, 2, 8.5, 14.7, 'seed', 'avocado')
on conflict do nothing;

insert into public.app_notices (title, body, priority, is_published, published_at)
values (
  'lonhats MVP가 계정 저장을 시작했습니다.',
  '운동, 식단, 기록, 커뮤니티 데이터가 Supabase에 저장됩니다.',
  'important',
  true,
  now()
)
on conflict do nothing;
