-- NEKRIS Database Schema
-- Run this in Supabase SQL Editor after creating your project

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Profiles ───
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  elo integer not null default 800,
  tier text not null default 'Bronze',
  wins integer not null default 0,
  losses integer not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', 'Player')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Daily Seeds ───
create table public.daily_seeds (
  date date primary key default current_date,
  seed integer not null,
  created_at timestamptz not null default now()
);

alter table public.daily_seeds enable row level security;

create policy "Daily seeds are viewable by everyone"
  on public.daily_seeds for select using (true);

-- ─── Daily Runs (leaderboard scores) ───
create table public.daily_runs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null default current_date,
  seed integer not null,
  score integer not null,
  time_left_ms integer not null default 0,
  move_count integer not null default 0,
  moves jsonb not null default '[]',
  verified boolean not null default false,
  created_at timestamptz not null default now(),

  unique(user_id, date)
);

alter table public.daily_runs enable row level security;

create policy "Daily runs are viewable by everyone"
  on public.daily_runs for select using (true);

create policy "Users can insert own daily runs"
  on public.daily_runs for insert with check (auth.uid() = user_id);

-- Index for leaderboard queries
create index idx_daily_runs_date_score on public.daily_runs(date, score desc);

-- ─── Matches (1v1 Quick Race) ───
create table public.matches (
  id uuid primary key default uuid_generate_v4(),
  seed integer not null,
  level_index integer not null default 1,
  player_a uuid not null references public.profiles(id),
  player_b uuid not null references public.profiles(id),
  winner_id uuid references public.profiles(id),
  score_a integer,
  score_b integer,
  elo_change integer default 0,
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.matches enable row level security;

create policy "Matches viewable by participants"
  on public.matches for select
  using (auth.uid() = player_a or auth.uid() = player_b);

create policy "Matches viewable for leaderboard"
  on public.matches for select using (status = 'completed');

-- Index for match history
create index idx_matches_players on public.matches(player_a, player_b);
create index idx_matches_status on public.matches(status);

-- ─── Updated_at trigger ───
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();
