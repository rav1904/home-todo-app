-- =============================================================================
-- categories: Personal (per-user) + global top-level grants
-- Run in Supabase SQL editor BEFORE app deploy that depends on scope/user_id.
--
-- PREFLIGHT (run manually, do not skip):
--   select id, name, parent_id, active,
--          (select count(*) from public.tasks t where t.category_id = c.id) as task_count,
--          (select count(*) from public.categories s where s.parent_id = c.id) as child_count,
--          (select count(*) from public.label_categories lc where lc.category_id = c.id) as link_count
--   from public.categories c
--   where lower(c.name) = 'personal';
--
-- If a row exists, rename it away from Personal BEFORE this script, e.g.:
--   update public.categories
--   set name = 'Personal (legacy)', updated_at = now()
--   where lower(name) = 'personal';
-- Or delete if unused. Do not convert a shared row into multi-user Personal.
--
-- Optional: list unique indexes before apply:
--   select indexname, indexdef from pg_indexes where tablename = 'categories';
-- Replace the admin email below if ADMIN_EMAIL differs.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0) Admin helper
-- -----------------------------------------------------------------------------
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'email') = 'nirav@slbenfica.co.uk',
    false
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

-- -----------------------------------------------------------------------------
-- 1) categories: columns
-- -----------------------------------------------------------------------------
alter table public.categories
  add column if not exists scope text,
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Existing rows become global
update public.categories
set scope = 'global',
    user_id = null
where scope is null;

alter table public.categories
  alter column scope set default 'global',
  alter column scope set not null;

-- Fail loudly if a global still named Personal slipped through
do $$
begin
  if exists (
    select 1
    from public.categories
    where lower(name) = 'personal'
      and coalesce(scope, 'global') = 'global'
  ) then
    raise exception
      'Preflight required: rename/delete global category named Personal before migration';
  end if;
end;
$$;

alter table public.categories
  drop constraint if exists categories_scope_check;

alter table public.categories
  add constraint categories_scope_check
  check (scope in ('global', 'personal'));

alter table public.categories
  drop constraint if exists categories_scope_user_check;

alter table public.categories
  add constraint categories_scope_user_check
  check (
    (scope = 'global' and user_id is null)
    or (
      scope = 'personal'
      and user_id is not null
      and parent_id is null
      and name = 'Personal'
    )
  );

alter table public.categories
  drop constraint if exists categories_global_name_not_personal_check;

alter table public.categories
  add constraint categories_global_name_not_personal_check
  check (scope = 'personal' or lower(name) <> 'personal');

-- Prevent nesting under Personal / personal children
create or replace function public.categories_enforce_personal_invariants()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent_scope text;
begin
  if new.scope = 'personal' then
    if new.parent_id is not null then
      raise exception 'Personal categories cannot have a parent';
    end if;
    if new.name is distinct from 'Personal' then
      raise exception 'Personal category name must be Personal';
    end if;
    if new.user_id is null then
      raise exception 'Personal categories require user_id';
    end if;
  end if;

  if new.parent_id is not null then
    select scope into v_parent_scope
    from public.categories
    where id = new.parent_id;

    if v_parent_scope is null then
      raise exception 'Parent category not found';
    end if;

    if v_parent_scope = 'personal' then
      raise exception 'Cannot nest under a Personal category';
    end if;

    if new.scope = 'personal' then
      raise exception 'Personal categories cannot be nested';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists categories_enforce_personal_invariants_trg on public.categories;
create trigger categories_enforce_personal_invariants_trg
  before insert or update on public.categories
  for each row
  execute function public.categories_enforce_personal_invariants();

-- -----------------------------------------------------------------------------
-- 2) Unique indexes: drop old name uniqueness, recreate scoped
-- -----------------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select i.relname as index_name
    from pg_class t
    join pg_index ix on t.oid = ix.indrelid
    join pg_class i on i.oid = ix.indexrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'categories'
      and ix.indisunique
      and not ix.indisprimary
  loop
    -- Drop non-primary unique indexes on categories (name uniqueness from SQL editor).
    -- Recreated below with scope filters. Review DROP list in notices if unsure.
    raise notice 'Dropping unique index public.%', r.index_name;
    execute format('drop index if exists public.%I', r.index_name);
  end loop;
end;
$$;

create unique index if not exists categories_global_main_name_uidx
  on public.categories (lower(name))
  where scope = 'global' and parent_id is null;

create unique index if not exists categories_global_sub_name_uidx
  on public.categories (parent_id, lower(name))
  where scope = 'global' and parent_id is not null;

create unique index if not exists categories_personal_user_uidx
  on public.categories (user_id)
  where scope = 'personal';

create index if not exists categories_scope_idx
  on public.categories (scope);

create index if not exists categories_user_id_idx
  on public.categories (user_id)
  where user_id is not null;

-- -----------------------------------------------------------------------------
-- 3) Personal provisioning (internal + user-safe)
-- -----------------------------------------------------------------------------
create or replace function public.ensure_personal_category_for_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;

  select id
  into v_id
  from public.categories
  where scope = 'personal'
    and user_id = p_user_id
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.categories (
    parent_id,
    name,
    colour,
    icon_name,
    sort_order,
    active,
    scope,
    user_id
  )
  values (
    null,
    'Personal',
    '#57534e',  -- Stone preset
    'Home',
    0,
    true,
    'personal',
    p_user_id
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    select id
    into v_id
    from public.categories
    where scope = 'personal'
      and user_id = p_user_id
    limit 1;
    return v_id;
end;
$$;

revoke all on function public.ensure_personal_category_for_user(uuid) from public;
revoke all on function public.ensure_personal_category_for_user(uuid) from anon;
revoke all on function public.ensure_personal_category_for_user(uuid) from authenticated;

create or replace function public.ensure_my_personal_category()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  return public.ensure_personal_category_for_user(v_uid);
end;
$$;

revoke all on function public.ensure_my_personal_category() from public;
grant execute on function public.ensure_my_personal_category() to authenticated;

-- New auth users get Personal automatically
create or replace function public.auth_users_ensure_personal_category()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_personal_category_for_user(new.id);
  return new;
end;
$$;

drop trigger if exists auth_users_ensure_personal_category_trg on auth.users;
create trigger auth_users_ensure_personal_category_trg
  after insert on auth.users
  for each row
  execute function public.auth_users_ensure_personal_category();

-- Backfill existing users (including admin)
do $$
declare
  r record;
begin
  for r in select id from auth.users
  loop
    perform public.ensure_personal_category_for_user(r.id);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4) user_category_access (global top-level grants only)
-- -----------------------------------------------------------------------------
create table if not exists public.user_category_access (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

create index if not exists user_category_access_category_id_idx
  on public.user_category_access (category_id);

create or replace function public.user_category_access_require_global_top_level()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_scope text;
  v_parent_id uuid;
begin
  select scope, parent_id
  into v_scope, v_parent_id
  from public.categories
  where id = new.category_id;

  if v_scope is null then
    raise exception 'Category not found';
  end if;

  if v_scope is distinct from 'global' or v_parent_id is not null then
    raise exception 'Only global top-level categories can be granted';
  end if;

  return new;
end;
$$;

drop trigger if exists user_category_access_require_global_top_level_trg
  on public.user_category_access;
create trigger user_category_access_require_global_top_level_trg
  before insert or update of category_id
  on public.user_category_access
  for each row
  execute function public.user_category_access_require_global_top_level();

alter table public.user_category_access enable row level security;

drop policy if exists "Users can view own category grants"
  on public.user_category_access;
drop policy if exists "Admin can view all category grants"
  on public.user_category_access;
drop policy if exists "Admin can insert category grants"
  on public.user_category_access;
drop policy if exists "Admin can delete category grants"
  on public.user_category_access;

create policy "Users can view own category grants"
  on public.user_category_access
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_app_admin());

create policy "Admin can insert category grants"
  on public.user_category_access
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy "Admin can delete category grants"
  on public.user_category_access
  for delete
  to authenticated
  using (public.is_app_admin());

-- -----------------------------------------------------------------------------
-- 5) user_can_use_category
-- -----------------------------------------------------------------------------
create or replace function public.user_can_use_category(p_category_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_scope text;
  v_owner uuid;
  v_parent_id uuid;
  v_active boolean;
begin
  if p_category_id is null or v_uid is null then
    return false;
  end if;

  select scope, user_id, parent_id, active
  into v_scope, v_owner, v_parent_id, v_active
  from public.categories
  where id = p_category_id;

  if v_scope is null then
    return false;
  end if;

  if v_scope = 'personal' then
    return v_owner = v_uid;
  end if;

  -- global
  if public.is_app_admin() then
    return true;
  end if;

  if not v_active then
    return false;
  end if;

  if v_parent_id is null then
    return exists (
      select 1
      from public.user_category_access g
      where g.user_id = v_uid
        and g.category_id = p_category_id
    );
  end if;

  return exists (
    select 1
    from public.user_category_access g
    where g.user_id = v_uid
      and g.category_id = v_parent_id
  );
end;
$$;

revoke all on function public.user_can_use_category(uuid) from public;
grant execute on function public.user_can_use_category(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6) categories RLS (replace)
-- -----------------------------------------------------------------------------
alter table public.categories enable row level security;

do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
  loop
    execute format(
      'drop policy if exists %I on public.categories',
      r.policyname
    );
  end loop;
end;
$$;

create policy "Users can view own personal categories"
  on public.categories
  for select
  to authenticated
  using (scope = 'personal' and user_id = auth.uid());

create policy "Users can view granted active global categories"
  on public.categories
  for select
  to authenticated
  using (
    scope = 'global'
    and active = true
    and not public.is_app_admin()
    and (
      (
        parent_id is null
        and exists (
          select 1
          from public.user_category_access g
          where g.user_id = auth.uid()
            and g.category_id = categories.id
        )
      )
      or (
        parent_id is not null
        and exists (
          select 1
          from public.user_category_access g
          where g.user_id = auth.uid()
            and g.category_id = categories.parent_id
        )
      )
    )
  );

create policy "Admin can view all global categories"
  on public.categories
  for select
  to authenticated
  using (scope = 'global' and public.is_app_admin());

create policy "Admin can insert global categories"
  on public.categories
  for insert
  to authenticated
  with check (public.is_app_admin() and scope = 'global' and user_id is null);

create policy "Admin can update global categories"
  on public.categories
  for update
  to authenticated
  using (public.is_app_admin() and scope = 'global')
  with check (public.is_app_admin() and scope = 'global' and user_id is null);

create policy "Admin can delete global categories"
  on public.categories
  for delete
  to authenticated
  using (public.is_app_admin() and scope = 'global');

-- -----------------------------------------------------------------------------
-- 7) Task category assignment trigger (strict spawn rules)
-- -----------------------------------------------------------------------------
create or replace function public.tasks_enforce_category_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent public.tasks%rowtype;
begin
  if new.category_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.category_id is not distinct from old.category_id then
    return new;
  end if;

  if tg_op = 'INSERT' and new.spawned_from_task_id is not null then
    select *
    into v_parent
    from public.tasks
    where id = new.spawned_from_task_id;

    if not found then
      raise exception 'spawned_from_task_id parent not found';
    end if;

    if v_parent.user_id is distinct from new.user_id then
      raise exception 'spawned task user_id must match parent user_id';
    end if;

    if new.category_id is distinct from v_parent.category_id then
      raise exception 'spawned task category_id must match parent category_id';
    end if;

    return new;
  end if;

  if not public.user_can_use_category(new.category_id) then
    raise exception 'Not allowed to assign this category';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_enforce_category_access_trg on public.tasks;
create trigger tasks_enforce_category_access_trg
  before insert or update of category_id, spawned_from_task_id, user_id
  on public.tasks
  for each row
  execute function public.tasks_enforce_category_access();

-- -----------------------------------------------------------------------------
-- 8) label_categories: no Personal links + tighter SELECT
-- -----------------------------------------------------------------------------
create or replace function public.label_categories_require_global_category()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_scope text;
begin
  select scope into v_scope
  from public.categories
  where id = new.category_id;

  if v_scope is distinct from 'global' then
    raise exception 'Only global categories can be linked to labels';
  end if;

  return new;
end;
$$;

drop trigger if exists label_categories_require_global_category_trg
  on public.label_categories;
create trigger label_categories_require_global_category_trg
  before insert or update of category_id
  on public.label_categories
  for each row
  execute function public.label_categories_require_global_category();

-- Remove any accidental links to non-global categories (none expected)
delete from public.label_categories lc
using public.categories c
where lc.category_id = c.id
  and c.scope is distinct from 'global';

drop policy if exists "Authenticated users can view label category links"
  on public.label_categories;
drop policy if exists "Users can view label links for usable categories"
  on public.label_categories;

create policy "Users can view label links for usable categories"
  on public.label_categories
  for select
  to authenticated
  using (
    public.is_app_admin()
    or public.user_can_use_category(category_id)
  );

-- Admin insert/delete policies from sql/label_categories.sql remain;
-- recreate if missing:
drop policy if exists "Admin can insert label category links"
  on public.label_categories;
drop policy if exists "Admin can delete label category links"
  on public.label_categories;

create policy "Admin can insert label category links"
  on public.label_categories
  for insert
  to authenticated
  with check (
    public.is_app_admin()
    and exists (
      select 1
      from public.labels
      where labels.id = label_categories.label_id
        and labels.scope = 'global'
    )
  );

create policy "Admin can delete label category links"
  on public.label_categories
  for delete
  to authenticated
  using (public.is_app_admin());

COMMIT;
