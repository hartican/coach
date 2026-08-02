# Do Less AI Notes

Do Less is a low-admin movement PWA moving through the canonical multi-profile
phases. Keep the current implementation simple: plain `coach.html`, static
assets, `localStorage`, and no client build step. Phase 3 adds only the guarded
pre-auth provisioning backend; workout-state sync remains deferred to Phase 4.

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
- Database migration: `supabase/migrations/`.
- Shared session-generation seam: `do-less-session-engine.js`.
- Local profile-instance and namespaced-storage seam: `do-less-profile-store.js`.
- Regression tests: `tests/*.test.js` using Node's built-in test runner.
- Overriding canonical spec: `planning-coach/PIPELINE-do-less-archetype-assignment-spec.md`.
- Detailed canonical architecture: `planning-coach/PIPELINE-do-less-multi-profile-architecture.md`.
- Do Less marketing copy SSOT: `context/marketing-site-hero-copy.md`.
- PWA files: `manifest.json`, `sw.js`, `version.json`, `assets/icon-180.png`.
- Static hosting: Vercel or equivalent. Keep rewrites in `vercel.json` from `/`,
  `/app.html`, and `/home-workout-planner.html` to `/coach.html`, plus `/setup`
  to `/setup.html`.

## Rules

- Every deploy-facing change must bump `version.json` and `CACHE_NAME` in
  `sw.js` together using the same UTC timestamp.
- Use `context/marketing-site-hero-copy.md` as the single source of truth for
  all Do Less marketing materials. Update it first when the positioning changes, then
  keep app copy aligned without replacing clear operational labels.
- Do not broaden Phase 3 provisioning into workout-state sync or adaptation.
  The server dependency in `package.json` exists only for the Vercel function;
  do not introduce a client build step unless a later phase requires it.
- Phase 2 keeps app data local to the browser. The live app uses the
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
- Required server environment: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
  `SUPABASE_PUBLISHABLE_KEY`, `DO_LESS_SETUP_ACCESS_CODE`, `DO_LESS_SITE_URL`.
- The magic-link redirect must be configured in Supabase. Phase 4 owns auth-aware
  app state, cloud workout sync, adaptation events, and profile updates.
- Internal archetype IDs must never appear in normal user-facing copy.
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
- Local-only ownership: export backup, import backup, and reset Do Less data.
- Guarded family account provisioning without changing local workout ownership.
- Do Less quality priorities: visible check-in impact, plain-language session
  rationale, safe home-training prescriptions, and fallback sessions counting
  fully toward streaks.
