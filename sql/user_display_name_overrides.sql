-- Run in Supabase SQL editor.
-- Admin-controlled display name override for platform users.
-- Safe to re-run: IF NOT EXISTS / DROP CONSTRAINT IF EXISTS / CREATE OR REPLACE.
--
-- Stores a nullable override on app_allowed_users.
-- Effective name (app + get_task_creator_profiles):
--   1. display_name_override (if present)
--   2. Google/Auth full_name / name
--   3. email prefix
--   4. email
--
-- No task assignee/owner changes. No new RLS policies:
--   Admin already has UPDATE on app_allowed_users.
--   Users already SELECT their own row (header/home greeting).
--   Shared-task creator names stay behind get_task_creator_profiles
--   (no blanket allowlist read for other users).

BEGIN;

alter table public.app_allowed_users
  add column if not exists display_name_override text;

comment on column public.app_allowed_users.display_name_override is
  'Admin-only display name override. Null = use Google/Auth name or email fallback. Max 40 chars.';

alter table public.app_allowed_users
  drop constraint if exists app_allowed_users_display_name_override_check;

alter table public.app_allowed_users
  add constraint app_allowed_users_display_name_override_check
  check (
    display_name_override is null
    or (
      char_length(display_name_override) between 1 and 40
      and display_name_override = btrim(display_name_override)
      and display_name_override !~ '[[:cntrl:]]'
    )
  );

-- Admin-only write path with trim / length / control-character validation.
-- Blank or null clears the override.
create or replace function public.admin_set_display_name_override(
  p_email text,
  p_display_name_override text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text;
  v_updated integer;
begin
  if not public.is_app_admin() then
    raise exception 'not_admin';
  end if;

  if v_email = '' then
    raise exception 'invalid_email';
  end if;

  v_name := nullif(btrim(coalesce(p_display_name_override, '')), '');

  if v_name is not null then
    if char_length(v_name) > 40 then
      raise exception 'display_name_too_long';
    end if;

    if v_name ~ '[[:cntrl:]]' then
      raise exception 'invalid_display_name';
    end if;
  end if;

  update public.app_allowed_users
  set
    display_name_override = v_name,
    updated_at = now()
  where email = v_email;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'not_found';
  end if;
end;
$$;

revoke all on function public.admin_set_display_name_override(text, text) from public;
grant execute on function public.admin_set_display_name_override(text, text) to authenticated;

-- Creator badges on shared tasks: include override without exposing allowlist rows.
create or replace function public.get_task_creator_profiles(p_user_ids uuid[])
returns table (
  id uuid,
  email text,
  display_name text,
  avatar_url text
)
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or not public.is_app_allowed() then
    return;
  end if;

  if p_user_ids is null or cardinality(p_user_ids) = 0 then
    return;
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(
      nullif(trim(a.display_name_override), ''),
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      nullif(trim(u.email), ''),
      'User'
    )::text as display_name,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'picture'), '')
    )::text as avatar_url
  from auth.users u
  left join public.app_allowed_users a
    on a.email = lower(coalesce(u.email, ''))
  where u.id = any (p_user_ids);
end;
$$;

revoke all on function public.get_task_creator_profiles(uuid[]) from public;
grant execute on function public.get_task_creator_profiles(uuid[]) to authenticated;

COMMIT;
