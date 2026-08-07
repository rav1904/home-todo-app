-- Run in Supabase SQL editor.
-- Admin phase: link global labels to categories/subcategories.
-- Task label pickers are unchanged in this phase.
-- Replace the admin email below if ADMIN_EMAIL differs.

BEGIN;

create table if not exists public.label_categories (
  label_id uuid not null references public.labels (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (label_id, category_id)
);

create index if not exists label_categories_category_id_idx
  on public.label_categories (category_id);

-- Only global labels may be linked.
create or replace function public.label_categories_require_global_label()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.labels
    where labels.id = new.label_id
      and labels.scope = 'global'
  ) then
    raise exception 'Only global labels can be linked to categories';
  end if;

  return new;
end;
$$;

drop trigger if exists label_categories_require_global_label_trg
  on public.label_categories;

create trigger label_categories_require_global_label_trg
  before insert or update of label_id
  on public.label_categories
  for each row
  execute function public.label_categories_require_global_label();

alter table public.label_categories enable row level security;

drop policy if exists "Authenticated users can view label category links"
  on public.label_categories;
drop policy if exists "Admin can insert label category links"
  on public.label_categories;
drop policy if exists "Admin can delete label category links"
  on public.label_categories;

create policy "Authenticated users can view label category links"
  on public.label_categories
  for select
  to authenticated
  using (true);

create policy "Admin can insert label category links"
  on public.label_categories
  for insert
  to authenticated
  with check (
    (auth.jwt() ->> 'email') = 'nirav@slbenfica.co.uk'
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
  using (
    (auth.jwt() ->> 'email') = 'nirav@slbenfica.co.uk'
  );

COMMIT;
