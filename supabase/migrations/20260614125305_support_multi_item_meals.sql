-- Keep one Meal Stack entry linked to every food item in the same meal.

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
  v_meal_input jsonb;
  v_meal_inputs jsonb;
  v_meals jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not allowed';
  end if;

  v_meal_inputs := case
    when jsonb_typeof(p_meal) = 'array' then p_meal
    else jsonb_build_array(p_meal)
  end;

  if jsonb_array_length(v_meal_inputs) = 0 then
    raise exception 'at least one meal item is required';
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

  for v_meal_input in
    select value from jsonb_array_elements(v_meal_inputs)
  loop
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
      coalesce(nullif(v_meal_input->>'eaten_on', '')::date, current_date),
      v_meal_input->>'meal_type',
      v_meal_input->>'raw_text',
      v_meal_input->>'food_name',
      nullif(v_meal_input->>'amount_gram', '')::numeric,
      coalesce(nullif(v_meal_input->>'calories', '')::integer, 0),
      coalesce(nullif(v_meal_input->>'protein_gram', '')::numeric, 0),
      coalesce(nullif(v_meal_input->>'carbs_gram', '')::numeric, 0),
      coalesce(nullif(v_meal_input->>'fat_gram', '')::numeric, 0),
      nullif(v_meal_input->>'source', ''),
      nullif(v_meal_input->>'source_id', ''),
      nullif(v_meal_input->>'confidence', '')::numeric
    )
    returning * into v_meal;

    v_meals := v_meals || jsonb_build_array(to_jsonb(v_meal));
  end loop;

  return jsonb_build_object(
    'life_entry', to_jsonb(v_life),
    'meal_log', v_meals->0,
    'meal_logs', v_meals
  );
end;
$$;

revoke all on function public.create_meal_with_life_entry(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_meal_with_life_entry(uuid, jsonb, jsonb) to authenticated;
