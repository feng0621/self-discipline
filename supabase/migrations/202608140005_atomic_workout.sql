create or replace function public.complete_workout(
  p_intensity text,
  p_duration_seconds integer,
  p_exercises jsonb,
  p_difficulty text default '正合适',
  p_completed_on date default current_date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session_id uuid;
  v_previous public.user_plan_progress%rowtype;
  v_completed integer;
  v_streak integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.workout_sessions (user_id, intensity, duration_seconds, difficulty)
  values (v_user_id, p_intensity, greatest(0, p_duration_seconds), p_difficulty)
  returning id into v_session_id;

  insert into public.exercise_logs (session_id, exercise_name, sets_completed, dose)
  select v_session_id, item.name, item.sets, item.dose
  from jsonb_to_recordset(coalesce(p_exercises, '[]'::jsonb))
    as item(name text, sets integer, dose text);

  select * into v_previous
  from public.user_plan_progress
  where user_id = v_user_id
  for update;

  v_completed := coalesce(v_previous.completed_sessions, 0) + 1;
  v_streak := case
    when v_previous.last_trained_on = p_completed_on then greatest(v_previous.streak_days, 1)
    when v_previous.last_trained_on = p_completed_on - 1 then greatest(v_previous.streak_days, 0) + 1
    else 1
  end;

  insert into public.user_plan_progress (
    user_id, current_week, completed_sessions, streak_days, last_trained_on, updated_at
  ) values (
    v_user_id,
    least(12, greatest(coalesce(v_previous.current_week, 1), ceil(v_completed / 3.0)::integer)),
    v_completed,
    v_streak,
    p_completed_on,
    now()
  )
  on conflict (user_id) do update set
    current_week = excluded.current_week,
    completed_sessions = excluded.completed_sessions,
    streak_days = excluded.streak_days,
    last_trained_on = excluded.last_trained_on,
    updated_at = excluded.updated_at;

  return v_session_id;
end;
$$;

revoke all on function public.complete_workout(text, integer, jsonb, text, date) from public, anon;
grant execute on function public.complete_workout(text, integer, jsonb, text, date) to authenticated;
