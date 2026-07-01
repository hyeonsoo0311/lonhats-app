create index if not exists food_reports_reviewed_by_idx
  on public.food_reports (reviewed_by);

create index if not exists food_submissions_approved_food_item_id_idx
  on public.food_submissions (approved_food_item_id);

create index if not exists food_submissions_reviewed_by_idx
  on public.food_submissions (reviewed_by);
