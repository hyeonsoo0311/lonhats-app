revoke all on table public.community_user_blocks from anon, authenticated;
revoke all on table public.account_deletion_requests from anon, authenticated;

grant select, insert, delete on table public.community_user_blocks to authenticated;
grant select, insert, update on table public.account_deletion_requests to authenticated;
