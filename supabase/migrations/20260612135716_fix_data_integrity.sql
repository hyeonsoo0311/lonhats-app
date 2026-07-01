-- Protect authorization data and keep supporting logs linked to their life entry.

create or replace function app_private.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if new.role is distinct from old.role and not app_private.is_admin() then
    raise exception 'profile role cannot be changed by the current user';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function app_private.protect_profile_role();

alter table public.meal_logs
  add column if not exists source_life_entry_id uuid
    references public.life_entries(id) on delete set null;

alter table public.workout_logs
  add column if not exists source_life_entry_id uuid
    references public.life_entries(id) on delete set null;

create index if not exists meal_logs_source_life_entry_id_idx
  on public.meal_logs (source_life_entry_id);

create index if not exists workout_logs_source_life_entry_id_idx
  on public.workout_logs (source_life_entry_id);

create or replace function public.create_meal_with_life_entry(
  p_user_id uuid,
  p_life jsonb,
  p_meal jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_life public.life_entries;
  v_meal public.meal_logs;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not allowed';
  end if;

  insert into public.life_entries (
    user_id,
    stack,
    category,
    title,
    entry_date,
    duration_minutes,
    intensity,
    meaning,
    note,
    score,
    details
  )
  values (
    p_user_id,
    'meal',
    p_life->>'category',
    p_life->>'title',
    coalesce(nullif(p_life->>'entry_date', '')::date, current_date),
    nullif(p_life->>'duration_minutes', '')::integer,
    nullif(p_life->>'intensity', ''),
    nullif(p_life->>'meaning', ''),
    nullif(p_life->>'note', ''),
    nullif(p_life->>'score', '')::integer,
    coalesce(p_life->'details', '{}'::jsonb)
  )
  returning * into v_life;

  insert into public.meal_logs (
    user_id,
    source_life_entry_id,
    eaten_on,
    meal_type,
    raw_text,
    food_name,
    amount_gram,
    calories,
    protein_gram,
    carbs_gram,
    fat_gram,
    source,
    source_id,
    confidence
  )
  values (
    p_user_id,
    v_life.id,
    coalesce(nullif(p_meal->>'eaten_on', '')::date, current_date),
    p_meal->>'meal_type',
    p_meal->>'raw_text',
    p_meal->>'food_name',
    nullif(p_meal->>'amount_gram', '')::numeric,
    coalesce(nullif(p_meal->>'calories', '')::integer, 0),
    coalesce(nullif(p_meal->>'protein_gram', '')::numeric, 0),
    coalesce(nullif(p_meal->>'carbs_gram', '')::numeric, 0),
    coalesce(nullif(p_meal->>'fat_gram', '')::numeric, 0),
    nullif(p_meal->>'source', ''),
    nullif(p_meal->>'source_id', ''),
    nullif(p_meal->>'confidence', '')::numeric
  )
  returning * into v_meal;

  return jsonb_build_object('life_entry', to_jsonb(v_life), 'meal_log', to_jsonb(v_meal));
end;
$$;

create or replace function public.create_workout_with_life_entry(
  p_user_id uuid,
  p_life jsonb,
  p_workout jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_life public.life_entries;
  v_workout public.workout_logs;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not allowed';
  end if;

  insert into public.life_entries (
    user_id,
    stack,
    category,
    title,
    entry_date,
    duration_minutes,
    intensity,
    meaning,
    note,
    score,
    details
  )
  values (
    p_user_id,
    'move',
    p_life->>'category',
    p_life->>'title',
    coalesce(nullif(p_life->>'entry_date', '')::date, current_date),
    nullif(p_life->>'duration_minutes', '')::integer,
    nullif(p_life->>'intensity', ''),
    nullif(p_life->>'meaning', ''),
    nullif(p_life->>'note', ''),
    nullif(p_life->>'score', '')::integer,
    coalesce(p_life->'details', '{}'::jsonb)
  )
  returning * into v_life;

  insert into public.workout_logs (
    user_id,
    source_life_entry_id,
    exercise_id,
    exercise_name,
    exercise_category,
    trained_on,
    minutes,
    set_count,
    reps,
    load_kg,
    met_value,
    estimated_calories,
    body_weight_kg,
    memo
  )
  values (
    p_user_id,
    v_life.id,
    nullif(p_workout->>'exercise_id', '')::uuid,
    p_workout->>'exercise_name',
    nullif(p_workout->>'exercise_category', ''),
    coalesce(nullif(p_workout->>'trained_on', '')::date, current_date),
    nullif(p_workout->>'minutes', '')::integer,
    nullif(p_workout->>'set_count', '')::integer,
    nullif(p_workout->>'reps', '')::integer,
    nullif(p_workout->>'load_kg', '')::numeric,
    nullif(p_workout->>'met_value', '')::numeric,
    nullif(p_workout->>'estimated_calories', '')::integer,
    nullif(p_workout->>'body_weight_kg', '')::numeric,
    nullif(p_workout->>'memo', '')
  )
  returning * into v_workout;

  return jsonb_build_object('life_entry', to_jsonb(v_life), 'workout_log', to_jsonb(v_workout));
end;
$$;

revoke all on function public.create_meal_with_life_entry(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.create_workout_with_life_entry(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_meal_with_life_entry(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.create_workout_with_life_entry(uuid, jsonb, jsonb) to authenticated;
