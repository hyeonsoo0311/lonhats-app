delete from public.food_items
where source = 'seed';

alter table public.food_items
  alter column source drop default,
  add column if not exists source_reference text;

update public.food_items as food
set source_reference = submission.reference_note
from public.food_submissions as submission
where food.source = 'community-approved'
  and food.source_id = submission.id::text
  and nullif(food.source_reference, '') is null;

alter table public.food_items
  drop constraint if exists food_items_no_unsourced_seed,
  add constraint food_items_no_unsourced_seed
    check (source <> 'seed'),
  drop constraint if exists food_items_source_id_required,
  add constraint food_items_source_id_required
    check (nullif(source_id, '') is not null),
  drop constraint if exists food_items_community_reference_required,
  add constraint food_items_community_reference_required
    check (source <> 'community-approved' or nullif(source_reference, '') is not null);

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
      source_reference,
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
      new.reference_note,
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

revoke all on function app_private.publish_approved_food_submission() from public, anon, authenticated;
