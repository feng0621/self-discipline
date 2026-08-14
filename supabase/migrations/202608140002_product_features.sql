alter table public.profiles
  add column if not exists display_name text,
  add column if not exists timezone text not null default 'Asia/Kuala_Lumpur',
  add column if not exists low_impact_mode boolean not null default true,
  add column if not exists reminder_enabled boolean not null default true;

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  checked_on date not null default current_date,
  sleep_hours numeric(3,1) check (sleep_hours between 0 and 24),
  energy smallint not null default 3 check (energy between 1 and 5),
  soreness smallint not null default 1 check (soreness between 1 and 5),
  mood smallint not null default 3 check (mood between 1 and 5),
  available_minutes integer not null default 30 check (available_minutes between 5 and 180),
  sore_areas text[] not null default '{}',
  readiness_score integer not null check (readiness_score between 0 and 100),
  recommendation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, checked_on)
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_zh text not null,
  name_en text not null,
  target_areas text[] not null default '{}',
  equipment text[] not null default '{}',
  difficulty text not null check (difficulty in ('入门','进阶','强化')),
  low_impact boolean not null default true,
  instructions text not null,
  avoid text,
  video_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  intensity text not null check (intensity in ('入门','进阶','强化')),
  estimated_minutes integer not null,
  low_impact boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_template_exercises (
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position integer not null,
  sets integer not null default 3,
  dose text not null,
  rest_seconds integer not null default 60,
  primary key (template_id, exercise_id),
  unique(template_id, position)
);

create table if not exists public.user_plan_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_week integer not null default 1 check (current_week between 1 and 12),
  completed_sessions integer not null default 0,
  streak_days integer not null default 0,
  last_trained_on date,
  updated_at timestamptz not null default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  icon text not null,
  threshold integer not null default 1
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  training_days smallint[] not null default '{1,3,5}',
  training_time time not null default '19:30',
  advance_minutes integer not null default 30,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists daily_checkins_user_date_idx on public.daily_checkins(user_id, checked_on desc);
create index if not exists exercises_difficulty_idx on public.exercises(difficulty);
create index if not exists workout_templates_intensity_idx on public.workout_templates(intensity);

alter table public.daily_checkins enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.user_plan_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.notification_preferences enable row level security;

create policy "daily_checkins_owner_all" on public.daily_checkins for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "exercises_authenticated_read" on public.exercises for select to authenticated using (true);
create policy "templates_authenticated_read" on public.workout_templates for select to authenticated using (is_public);
create policy "template_exercises_authenticated_read" on public.workout_template_exercises for select to authenticated using (true);
create policy "plan_progress_owner_all" on public.user_plan_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "achievements_authenticated_read" on public.achievements for select to authenticated using (true);
create policy "user_achievements_owner_read" on public.user_achievements for select using (auth.uid() = user_id);
create policy "notification_preferences_owner_all" on public.notification_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.exercises (slug, name_zh, name_en, target_areas, equipment, difficulty, instructions, avoid, video_id)
values
  ('incline-push-up','上斜俯卧撑','INCLINE PUSH-UP','{胸,肩,核心}','{徒手}','入门','胸口靠近支撑面，头、背、髋保持一条直线。','避免耸肩、塌腰或只移动头部','0JUrOH--Kdk'),
  ('chair-squat','椅子深蹲','CHAIR SQUAT','{臀,大腿,核心}','{徒手}','入门','臀部先向后找椅面，膝盖始终朝脚尖方向。','避免快速坐下或膝盖向内扣','QX7HgfPyvDk'),
  ('band-row','弹力带划船','BAND ROW','{背,手臂}','{弹力带}','进阶','胸口保持打开，肘部贴近身体向后拉。','避免耸肩、含胸或身体后仰借力','WkNuYbWZ8g8'),
  ('glute-bridge','臀桥','GLUTE BRIDGE','{臀,腿后侧}','{徒手}','入门','脚跟发力抬髋，在最高点主动收紧臀部。','避免用腰硬顶或过度抬起肋骨','SKOMwg1JLrU'),
  ('forearm-plank','前臂平板支撑','FOREARM PLANK','{腹部,核心}','{徒手}','进阶','收紧腹部与臀部，同时保持均匀呼吸。','避免屏住呼吸、塌腰或臀部过高','Vdcy7VrRluA')
on conflict (slug) do update set instructions = excluded.instructions, avoid = excluded.avoid;

insert into public.workout_templates (slug, name, description, intensity, estimated_minutes)
values
  ('full-body-a-beginner','全身力量 A','低冲击全身力量训练，优先建立稳定动作模式。','入门',30),
  ('full-body-a-progressive','全身力量 A · 进阶','增加单侧控制与训练容量。','进阶',42),
  ('morning-express','8 分钟晨练','无需器械的晨间唤醒训练。','入门',8)
on conflict (slug) do nothing;

insert into public.achievements (code, title, description, icon, threshold)
values
  ('first-session','首次点亮','完成第一次正式训练','✦',1),
  ('streak-7','轨道稳定','连续训练或打卡 7 天','◎',7),
  ('sessions-12','完成一轮','累计完成 12 次训练','◈',12)
on conflict (code) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos','progress-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='progress_photos_owner_select') then
    create policy "progress_photos_owner_select" on storage.objects for select using (bucket_id='progress-photos' and auth.uid()::text=(storage.foldername(name))[1]);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='progress_photos_owner_insert') then
    create policy "progress_photos_owner_insert" on storage.objects for insert with check (bucket_id='progress-photos' and auth.uid()::text=(storage.foldername(name))[1]);
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='progress_photos_owner_delete') then
    create policy "progress_photos_owner_delete" on storage.objects for delete using (bucket_id='progress-photos' and auth.uid()::text=(storage.foldername(name))[1]);
  end if;
end $$;
