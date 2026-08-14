create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  height_cm numeric(5,1),
  current_weight_kg numeric(5,1),
  goal text default '减脂 · 腹肌显形',
  equipment text[] default array['徒手','弹力带'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null default current_date,
  weight_kg numeric(5,1),
  waist_cm numeric(5,1),
  sleep_hours numeric(3,1),
  water_cups integer check (water_cups between 0 and 30),
  created_at timestamptz not null default now(),
  unique(user_id, logged_on)
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intensity text not null check (intensity in ('入门','进阶','强化')),
  duration_seconds integer not null default 0,
  difficulty text check (difficulty in ('太轻松','正合适','太难')),
  completed_at timestamptz not null default now()
);

create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null,
  sets_completed integer not null default 0,
  dose text,
  created_at timestamptz not null default now()
);

create table if not exists public.extra_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_name text not null,
  amount text not null,
  effort text not null check (effort in ('轻松','适中','吃力')),
  completed_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.body_logs enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.extra_activities enable row level security;

create policy "profiles_owner_all" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "body_logs_owner_all" on public.body_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_owner_all" on public.workout_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercise_logs_owner_all" on public.exercise_logs for all using (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())) with check (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid()));
create policy "extra_activities_owner_all" on public.extra_activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists body_logs_user_date_idx on public.body_logs(user_id, logged_on desc);
create index if not exists workout_sessions_user_date_idx on public.workout_sessions(user_id, completed_at desc);
create index if not exists extra_activities_user_date_idx on public.extra_activities(user_id, completed_at desc);
