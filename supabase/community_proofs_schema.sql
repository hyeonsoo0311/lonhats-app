-- lonhats community proof metadata for small certifications.

alter table public.community_posts
  add column if not exists post_type text not null default 'discussion'
    check (post_type in ('discussion', 'proof')),
  add column if not exists stack text
    check (stack is null or stack in ('move', 'meal', 'recovery', 'mind')),
  add column if not exists proof_kind text
    check (proof_kind is null or proof_kind in ('daily_better', 'challenge_day', 'weekly_share')),
  add column if not exists source_life_entry_id uuid references public.life_entries(id) on delete set null,
  add column if not exists challenge_day integer
    check (challenge_day is null or (challenge_day >= 1 and challenge_day <= 30));

create index if not exists community_posts_post_type_idx
  on public.community_posts (post_type);

create index if not exists community_posts_proof_stack_idx
  on public.community_posts (proof_kind, stack);

create index if not exists community_posts_source_life_entry_id_idx
  on public.community_posts (source_life_entry_id);
