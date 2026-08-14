insert into public.workout_template_exercises (template_id, exercise_id, position, sets, dose, rest_seconds)
select wt.id, e.id, seed.position, seed.sets, seed.dose, seed.rest_seconds
from (values
  ('full-body-a-beginner','incline-push-up',1,3,'3 × 8',75),
  ('full-body-a-beginner','chair-squat',2,3,'3 × 10',75),
  ('full-body-a-beginner','band-row',3,3,'3 × 8',75),
  ('full-body-a-beginner','glute-bridge',4,3,'3 × 12',60),
  ('full-body-a-beginner','forearm-plank',5,3,'3 × 20秒',60),
  ('full-body-a-progressive','incline-push-up',1,4,'4 × 12',75),
  ('full-body-a-progressive','chair-squat',2,4,'4 × 15',75),
  ('full-body-a-progressive','band-row',3,4,'4 × 12',60),
  ('full-body-a-progressive','glute-bridge',4,3,'3 × 18',60),
  ('full-body-a-progressive','forearm-plank',5,3,'3 × 30秒',45)
) as seed(template_slug, exercise_slug, position, sets, dose, rest_seconds)
join public.workout_templates wt on wt.slug = seed.template_slug
join public.exercises e on e.slug = seed.exercise_slug
on conflict (template_id, exercise_id) do update set position=excluded.position, sets=excluded.sets, dose=excluded.dose, rest_seconds=excluded.rest_seconds;
