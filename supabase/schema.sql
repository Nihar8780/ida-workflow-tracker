-- Run this once in Supabase -> SQL Editor -> New query.
-- One row per user per reel. stages_done = how many of the 5 stages are finished (0-5).

create table if not exists public.reel_progress (
  user_id     uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  reel_id     text        not null,
  stages_done smallint    not null default 0 check (stages_done between 0 and 5),
  updated_at  timestamptz not null default now(),
  primary key (user_id, reel_id)
);

alter table public.reel_progress enable row level security;

-- Every user can only see and change their own rows.
drop policy if exists "read own progress"   on public.reel_progress;
drop policy if exists "insert own progress" on public.reel_progress;
drop policy if exists "update own progress" on public.reel_progress;
drop policy if exists "delete own progress" on public.reel_progress;

create policy "read own progress"   on public.reel_progress for select using (auth.uid() = user_id);
create policy "insert own progress" on public.reel_progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on public.reel_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own progress" on public.reel_progress for delete using (auth.uid() = user_id);
