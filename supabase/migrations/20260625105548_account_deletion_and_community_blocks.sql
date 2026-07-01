create table if not exists public.community_user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  constraint community_user_blocks_not_self check (blocker_id <> blocked_user_id),
  constraint community_user_blocks_unique unique (blocker_id, blocked_user_id)
);

alter table public.community_user_blocks enable row level security;

drop policy if exists "community_user_blocks_owner_select" on public.community_user_blocks;
create policy "community_user_blocks_owner_select" on public.community_user_blocks
  for select using ((select auth.uid()) = blocker_id or app_private.is_admin());

drop policy if exists "community_user_blocks_owner_insert" on public.community_user_blocks;
create policy "community_user_blocks_owner_insert" on public.community_user_blocks
  for insert with check ((select auth.uid()) = blocker_id);

drop policy if exists "community_user_blocks_owner_delete" on public.community_user_blocks;
create policy "community_user_blocks_owner_delete" on public.community_user_blocks
  for delete using ((select auth.uid()) = blocker_id or app_private.is_admin());

grant select, insert, delete on table public.community_user_blocks to authenticated;

create index if not exists community_user_blocks_blocker_id_idx
  on public.community_user_blocks (blocker_id, created_at desc);

create index if not exists community_user_blocks_blocked_user_id_idx
  on public.community_user_blocks (blocked_user_id);

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requester_email text,
  reason text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'completed', 'cancelled')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_deletion_requests enable row level security;

create unique index if not exists account_deletion_requests_active_user_idx
  on public.account_deletion_requests (user_id)
  where status in ('open', 'reviewing');

create index if not exists account_deletion_requests_status_idx
  on public.account_deletion_requests (status, created_at desc);

drop policy if exists "account_deletion_requests_owner_select" on public.account_deletion_requests;
create policy "account_deletion_requests_owner_select" on public.account_deletion_requests
  for select using ((select auth.uid()) = user_id or app_private.is_admin());

drop policy if exists "account_deletion_requests_owner_insert" on public.account_deletion_requests;
create policy "account_deletion_requests_owner_insert" on public.account_deletion_requests
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "account_deletion_requests_admin_update" on public.account_deletion_requests;
create policy "account_deletion_requests_admin_update" on public.account_deletion_requests
  for update using (app_private.is_admin())
  with check (app_private.is_admin());

grant select, insert, update on table public.account_deletion_requests to authenticated;

create or replace function app_private.touch_account_deletion_request_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function app_private.touch_account_deletion_request_updated_at() from public, anon, authenticated;

drop trigger if exists account_deletion_requests_touch_updated_at on public.account_deletion_requests;
create trigger account_deletion_requests_touch_updated_at
  before update on public.account_deletion_requests
  for each row execute function app_private.touch_account_deletion_request_updated_at();
