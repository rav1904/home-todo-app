-- Run in Supabase SQL editor.
-- Subtasks / checklist v1.

BEGIN;

create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_subtasks_title_not_blank check (length(trim(title)) > 0)
);

create index if not exists task_subtasks_task_id_sort_order_idx
  on public.task_subtasks (task_id, sort_order);

create index if not exists task_subtasks_user_id_idx
  on public.task_subtasks (user_id);

alter table public.task_subtasks enable row level security;

drop policy if exists "Users select own task subtasks" on public.task_subtasks;
drop policy if exists "Users insert own task subtasks" on public.task_subtasks;
drop policy if exists "Users update own task subtasks" on public.task_subtasks;
drop policy if exists "Users delete own task subtasks" on public.task_subtasks;

create policy "Users select own task subtasks"
  on public.task_subtasks
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users insert own task subtasks"
  on public.task_subtasks
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tasks
      where tasks.id = task_subtasks.task_id
        and tasks.user_id = auth.uid()
    )
  );

create policy "Users update own task subtasks"
  on public.task_subtasks
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tasks
      where tasks.id = task_subtasks.task_id
        and tasks.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tasks
      where tasks.id = task_subtasks.task_id
        and tasks.user_id = auth.uid()
    )
  );

create policy "Users delete own task subtasks"
  on public.task_subtasks
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.tasks
      where tasks.id = task_subtasks.task_id
        and tasks.user_id = auth.uid()
    )
  );

COMMIT;