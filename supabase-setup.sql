-- Run this in Supabase Dashboard → SQL Editor.
-- Each signed-in user can read/write only their own workflow record.
create table if not exists public.workflow_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workflow_progress enable row level security;

drop policy if exists "Users can read their own workflow progress" on public.workflow_progress;
create policy "Users can read their own workflow progress"
on public.workflow_progress for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own workflow progress" on public.workflow_progress;
create policy "Users can insert their own workflow progress"
on public.workflow_progress for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own workflow progress" on public.workflow_progress;
create policy "Users can update their own workflow progress"
on public.workflow_progress for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Enable Realtime for the table (if not already enabled):
alter publication supabase_realtime add table public.workflow_progress;
