-- Let members improve the food catalog while keeping publication under admin review.

alter table public.food_items
  add column if not exists contributor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists contributor_display_name text,
  add column if not exists approved_at timestamptz;

create table if not exists public.food_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contributor_display_name text not null default 'Lonhats 사용자',
  name text not null,
  brand_name text,
  serving_gram numeric not null check (serving_gram > 0),
  calories_per_serving integer not null check (calories_per_serving > 0),
  protein_gram numeric not null default 0 check (protein_gram >= 0),
  carbs_gram numeric not null default 0 check (carbs_gram >= 0),
  fat_gram numeric not null default 0 check (fat_gram >= 0),
  reference_note text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_food_item_id uuid references public.food_items(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reporter_display_name text not null default 'Lonhats 사용자',
  food_name text not null,
  food_source text not null,
  food_source_id text,
  reason text not null,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.food_submissions enable row level security;
alter table public.food_reports enable row level security;

drop policy if exists "food_submissions_owner_insert" on public.food_submissions;
create policy "food_submissions_owner_insert" on public.food_submissions
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "food_submissions_owner_select" on public.food_submissions;
create policy "food_submissions_owner_select" on public.food_submissions
  for select using ((select auth.uid()) = user_id);

drop policy if exists "food_submissions_admin_all" on public.food_submissions;
create policy "food_submissions_admin_all" on public.food_submissions
  for all using (app_private.is_admin())
  with check (app_private.is_admin());

drop policy if exists "food_reports_owner_insert" on public.food_reports;
create policy "food_reports_owner_insert" on public.food_reports
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "food_reports_owner_select" on public.food_reports;
create policy "food_reports_owner_select" on public.food_reports
  for select using ((select auth.uid()) = user_id);

drop policy if exists "food_reports_admin_all" on public.food_reports;
create policy "food_reports_admin_all" on public.food_reports
  for all using (app_private.is_admin())
  with check (app_private.is_admin());

create or replace function app_private.food_actor_display_name(p_user_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(nullif(username, ''), nullif(display_name, ''), 'Lonhats 사용자')
  from public.profiles
  where id = p_user_id;
$$;

create or replace function app_private.fill_food_submission_identity()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  new.contributor_display_name :=
    coalesce(app_private.food_actor_display_name(new.user_id), 'Lonhats 사용자');
  new.status := 'pending';
  new.review_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.approved_food_item_id := null;
  return new;
end;
$$;

create or replace function app_private.fill_food_report_identity()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  new.reporter_display_name :=
    coalesce(app_private.food_actor_display_name(new.user_id), 'Lonhats 사용자');
  new.status := 'open';
  new.resolution_note := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end;
$$;

create or replace function app_private.publish_approved_food_submission()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_food_id uuid;
begin
  if new.status = 'approved' and old.status is distinct from new.status then
    insert into public.food_items (
      name,
      brand_name,
      serving_gram,
      calories_per_serving,
      protein_gram,
      carbs_gram,
      fat_gram,
      source,
      source_id,
      contributor_user_id,
      contributor_display_name,
      approved_at
    )
    values (
      new.name,
      new.brand_name,
      new.serving_gram,
      new.calories_per_serving,
      new.protein_gram,
      new.carbs_gram,
      new.fat_gram,
      'community-approved',
      new.id::text,
      new.user_id,
      new.contributor_display_name,
      now()
    )
    returning id into v_food_id;

    new.approved_food_item_id := v_food_id;
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  elsif new.status = 'rejected' and old.status is distinct from new.status then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists food_submissions_fill_identity on public.food_submissions;
create trigger food_submissions_fill_identity
  before insert on public.food_submissions
  for each row execute function app_private.fill_food_submission_identity();

drop trigger if exists food_reports_fill_identity on public.food_reports;
create trigger food_reports_fill_identity
  before insert on public.food_reports
  for each row execute function app_private.fill_food_report_identity();

drop trigger if exists food_submissions_publish_approved on public.food_submissions;
create trigger food_submissions_publish_approved
  before update of status on public.food_submissions
  for each row execute function app_private.publish_approved_food_submission();

create index if not exists food_submissions_user_status_idx
  on public.food_submissions (user_id, status, created_at desc);

create index if not exists food_submissions_status_idx
  on public.food_submissions (status, created_at);

create index if not exists food_reports_user_status_idx
  on public.food_reports (user_id, status, created_at desc);

create index if not exists food_reports_status_idx
  on public.food_reports (status, created_at);

create index if not exists food_items_contributor_user_id_idx
  on public.food_items (contributor_user_id);

revoke all on function app_private.food_actor_display_name(uuid) from public, anon, authenticated;
revoke all on function app_private.fill_food_submission_identity() from public, anon, authenticated;
revoke all on function app_private.fill_food_report_identity() from public, anon, authenticated;
revoke all on function app_private.publish_approved_food_submission() from public, anon, authenticated;

grant select, insert on table public.food_submissions to authenticated;
grant select, insert on table public.food_reports to authenticated;
grant update, delete on table public.food_submissions to authenticated;
grant update, delete on table public.food_reports to authenticated;
