-- Minion Match 신규 사용자 프로필 및 점수 테이블 초안
-- 작성일: 2026-07-12
-- 적용 전제: Supabase Auth가 활성화되어 있어야 한다.
-- 주의: 실제 프로젝트 적용 전 Auth 방식과 공개 리더보드 범위를 확정한다.

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nickname_length
    check (char_length(trim(nickname)) between 2 and 20)
);

create table if not exists public.game_scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  difficulty text not null,
  moves integer not null,
  time_taken integer not null,
  created_at timestamptz not null default now(),
  constraint game_scores_difficulty
    check (difficulty in ('EASY', 'NORMAL')),
  constraint game_scores_moves_range
    check (moves between 6 and 1000),
  constraint game_scores_time_range
    check (time_taken between 1 and 86400)
);

create index if not exists game_scores_ranking_idx
  on public.game_scores (difficulty, moves asc, time_taken asc, created_at asc);

create index if not exists game_scores_user_created_idx
  on public.game_scores (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.game_scores enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Scores are publicly readable" on public.game_scores;
create policy "Scores are publicly readable"
  on public.game_scores
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can insert their own scores" on public.game_scores;
create policy "Users can insert their own scores"
  on public.game_scores
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

commit;

