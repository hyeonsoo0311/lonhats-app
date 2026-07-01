create or replace function app_private.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
  if new.role is distinct from old.role
    and auth.uid() is not null
    and not app_private.is_admin()
  then
    raise exception 'profile role cannot be changed by the current user';
  end if;

  return new;
end;
$$;
