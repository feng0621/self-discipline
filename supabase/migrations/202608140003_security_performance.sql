revoke all on function public.handle_new_user() from public, anon, authenticated;

create index if not exists exercise_logs_session_idx on public.exercise_logs(session_id);
create index if not exists user_achievements_achievement_idx on public.user_achievements(achievement_id);
create index if not exists template_exercises_exercise_idx on public.workout_template_exercises(exercise_id);

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "body_logs_owner_all" on public.body_logs;
create policy "body_logs_owner_all" on public.body_logs for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "sessions_owner_all" on public.workout_sessions;
create policy "sessions_owner_all" on public.workout_sessions for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "exercise_logs_owner_all" on public.exercise_logs;
create policy "exercise_logs_owner_all" on public.exercise_logs for all
using (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid())))
with check (exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = (select auth.uid())));

drop policy if exists "extra_activities_owner_all" on public.extra_activities;
create policy "extra_activities_owner_all" on public.extra_activities for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "daily_checkins_owner_all" on public.daily_checkins;
create policy "daily_checkins_owner_all" on public.daily_checkins for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "plan_progress_owner_all" on public.user_plan_progress;
create policy "plan_progress_owner_all" on public.user_plan_progress for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "user_achievements_owner_read" on public.user_achievements;
create policy "user_achievements_owner_read" on public.user_achievements for select using ((select auth.uid()) = user_id);

drop policy if exists "notification_preferences_owner_all" on public.notification_preferences;
create policy "notification_preferences_owner_all" on public.notification_preferences for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
