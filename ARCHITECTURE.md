# FORMA Architecture

Architecture pattern: **Feature Slice with domain and repository boundaries**.

## Design goals

- Keep `app/` focused on routing, metadata and global composition.
- Organize product code by feature instead of technical file type.
- Keep training rules deterministic and testable without React or Supabase.
- Keep database access behind a repository boundary.
- Prevent UI components from knowing environment variables or table details.
- Preserve the celestial control-console visual language while allowing each feature to evolve independently.

## Directory model

```text
app/                         Next/Vinext route and global styles
features/
  auth/                      Authentication UI
  fitness/
    FitnessApp.tsx           Client application composition
    components/              Fitness-specific interactive UI
    data/                    Supabase repository
    domain/                  Pure readiness and training rules
infrastructure/
  supabase/                  Supabase client configuration
shared/
  pwa/                       Cross-feature PWA behavior
supabase/migrations/         Versioned database contract
tests/                       Rendering and domain regression tests
```

## Dependency direction

```text
app → features → domain
              → data → infrastructure
app → shared
```

Domain code must not import React, browser APIs or Supabase. Data code may import infrastructure and domain types, but must not render UI. Feature components may call repositories but never reference environment variables directly.

## Runtime boundaries

- `app/page.tsx` is a stable route entry and renders `FitnessApp`.
- `FitnessApp` owns client orchestration and view state.
- `fitnessRepository` is the only module that knows table names and write payloads.
- `calculateReadiness` remains a pure function so its recommendations can be tested and later moved to an Edge Function without rewriting the UI.
- RLS is the final authorization layer; client checks improve UX but are never treated as security.

## Data ownership

- Supabase Auth owns identity and sessions.
- `profiles` owns long-lived user settings.
- `daily_checkins` owns readiness inputs and generated recommendation snapshots.
- `workout_sessions` and `exercise_logs` own completed training history.
- `body_logs` and `extra_activities` own daily tracking.
- Public exercise/template tables are read-only to authenticated users.

## Quality gates

Every change must pass:

1. TypeScript with `--noEmit`.
2. ESLint.
3. Production Vinext build.
4. Server-render regression tests.
5. Supabase security advisors after database changes.

## Evolution path

When the fitness client grows beyond one composition file, split the four tabs into `training`, `plan`, `progress` and `profile` subfeatures. Shared state should then move to a small reducer or dedicated controller hook; do not introduce a global state dependency before cross-route state actually requires it.
