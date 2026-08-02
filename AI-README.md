# Do Less AI Notes

Do Less is a low-admin movement PWA moving through the canonical multi-profile
phases. Keep the current implementation simple: plain `coach.html`, static
assets, `localStorage`, and no client build step. Phases 4 and 5 add
profile-scoped Supabase sync, offline reconciliation, deterministic adaptation,
profile-aware check-ins, and guarded admin corrections without making cloud
access mandatory for local use.

## Project Shape

- Main app: `coach.html`.
- State/profile migration seam: `coach-state-core.js`.
- Exercise prescription/logging seam: `coach-prescription-core.js`.
- Archetype definition/resolver seam: `do-less-archetype-core.js`.
- Deterministic matcher seam: `do-less-archetype-matcher.js`.
- Provisioning orchestration seam: `do-less-provisioning-core.js`.
- Server-only Supabase adapter: `do-less-supabase-provisioning.js`.
- Guided intake: `setup.html` and `do-less-setup.js`.
- Vercel provisioning function: `api/provision-account.js`.
- Browser-safe Supabase config function: `api/supabase-config.js`.
- Database migration: `supabase/migrations/`.
- Shared session-generation seam: `do-less-session-engine.js`.
- Shared tagged movement inventory and safety filters: `do-less-exercise-catalog.js`.
- Complete/partial/skipped/aborted outcome classifier: `do-less-session-outcome-core.js`.
- Local profile-instance and namespaced-storage seam: `do-less-profile-store.js`.
- Adaptation policy seam: `do-less-adaptation-core.js`.
- Offline queue and reconciliation seam: `do-less-sync-core.js`.
- Authenticated Supabase history adapter: `do-less-supabase-sync.js`.
- Browser auth/reconnect orchestration: `do-less-cloud.js`.
- Profile-aware question/copy policy: `do-less-checkin-core.js`.
- Conservative postpartum and active-ageing planners: `do-less-profile-planners.js`.
- Admin validation and safe response mapping: `do-less-admin-core.js`.
- Server-only admin repository: `do-less-supabase-admin.js`.
- Admin UI: `admin.html` and `do-less-admin.js`.
- Admin Vercel function: `api/manage-profile.js`.
- Shared server request/security guard: `api/_request-guard.js`.
- Regression tests: `tests/*.test.js` using Node's built-in test runner.
- Overriding canonical spec: `planning-coach/PIPELINE-do-less-archetype-assignment-spec.md`.
- Detailed canonical architecture: `planning-coach/PIPELINE-do-less-multi-profile-architecture.md`.
- Do Less marketing copy SSOT: `context/marketing-site-hero-copy.md`.
- PWA files: `manifest.json`, `sw.js`, `version.json`, `assets/icon-180.png`.
- Static hosting: Vercel or equivalent. Keep rewrites in `vercel.json` from `/`,
  `/app.html`, and `/home-workout-planner.html` to `/coach.html`, plus `/setup`
  to `/setup.html` and `/admin` to `/admin.html`.

## Rules

- Every deploy-facing change must bump `version.json` and `CACHE_NAME` in
  `sw.js` together using the same UTC timestamp.
- Use `context/marketing-site-hero-copy.md` as the single source of truth for
  all Do Less marketing materials. Update it first when the positioning changes, then
  keep app copy aligned without replacing clear operational labels.
- Do not introduce a client build step unless a later phase requires it.
- The unauthenticated app remains local to the browser. The live app uses the
  `local-primary` profile instance and `dl:profile:{profileInstanceId}:*` storage
  namespaces. Legacy single-user data migrates idempotently and remains available
  for recovery. Backup/restore still uses JSON export and import from Settings.
- `window.DoLessLocalProfiles.simulateAssignment(...)` remains the local-only
  Phase 2 seam. Phase 3 matching must be deterministic and server-recomputed.
- Provisioning order is strict: validate intake, match, store the user/intake/
  assignment/profile, then request the magic link with `shouldCreateUser:false`.
- The browser submits to `/api/provision-account`; it must never receive a
  Supabase secret/service-role key, profile-instance ID, or internal archetype ID.
- Keep all exposed Supabase tables behind enabled RLS and owner-only policies.
- Authenticated workout writes must derive `user_id` and `profile_instance_id`
  from the verified session/profile adapter, never from untrusted event payloads.
- Keep pending events in the active profile namespace. Reconcile event history by
  stable ID and timestamp, and never merge generated plans across devices.
- Adaptation must be deterministic, produce inspectable rationale/events, update
  only the assigned profile instance, and never mutate archetype definitions.
- Skipped and aborted plans remain durable history. Safe substitutions and
  lightweight exercise preferences must stay profile-scoped and syncable.
- Difficulty choices must respect the assigned archetype and caution level;
  red symptom-gated plans are Easy-only and cannot be swapped.
- Adaptation history from before the current assignment epoch must not progress
  a newly corrected plan.
- Admin review is exact-email and read-only by default. A correction must use the
  atomic database function, require explicit confirmation and an audit reason,
  preserve workout history, and reset only archetype-dependent derived state.
- Stale offline updates must never overwrite a newer remote profile record.
- Required server environment: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
  `SUPABASE_PUBLISHABLE_KEY`, `DO_LESS_SETUP_ACCESS_CODE`,
  `DO_LESS_ADMIN_ACCESS_CODE`, `DO_LESS_SITE_URL`.
- The magic-link redirect must be configured in Supabase. Only the URL and
  publishable key may be returned by `/api/supabase-config`; the secret key stays
  inside server functions.
- Internal archetype IDs must never appear in normal user-facing copy.
- Keep the admin access code separate from the family setup code. Never put
  either secret in URLs, browser storage, or normal workout UI.
- Keep generated prescription values as hard minimums. User-entered rep, time,
  and load adjustments may only increase them, and completed logs must retain
  both generated and completed values.
- Run `node --test tests/*.test.js` after persistence or prescription changes.
- Verify mobile layout around 390px width for user-facing changes.
- Verify service-worker precache paths exist before shipping.
- Report outcomes in plain language.

## Current Direction

- Standalone mobile-first browser app, intended for home-screen use.
- Reliable, shareable static deployment without an install package.
- Local-first ownership with an offline queue; signed-in profiles sync their own
  history and derived state to Supabase.
- Guarded family account provisioning before profile-specific cloud activation.
- Guarded matcher/rationale review and auditable manual correction at `/admin`.
- Do Less quality priorities: visible check-in impact, plain-language session
  rationale, safe home-training prescriptions, and fallback sessions counting
  fully toward streaks.
