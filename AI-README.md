# Do Less AI Notes

Do Less is a low-admin movement PWA moving through the canonical multi-profile
phases. Keep the current implementation simple: plain `coach.html`, static
assets, `localStorage`, no build step, no auth, no backend, and no cloud sync
until the relevant later phase is active.

## Project Shape

- Main app: `coach.html`.
- State/profile migration seam: `coach-state-core.js`.
- Exercise prescription/logging seam: `coach-prescription-core.js`.
- Archetype definition/resolver seam: `do-less-archetype-core.js`.
- Shared session-generation seam: `do-less-session-engine.js`.
- Local profile-instance and namespaced-storage seam: `do-less-profile-store.js`.
- Regression tests: `tests/*.test.js` using Node's built-in test runner.
- Overriding canonical spec: `planning-coach/PIPELINE-do-less-archetype-assignment-spec.md`.
- Detailed canonical architecture: `planning-coach/PIPELINE-do-less-multi-profile-architecture.md`.
- Do Less marketing copy SSOT: `context/marketing-site-hero-copy.md`.
- PWA files: `manifest.json`, `sw.js`, `version.json`, `assets/icon-180.png`.
- Static hosting: Vercel or equivalent. Keep rewrites in `vercel.json` from `/`,
  `/app.html`, and `/home-workout-planner.html` to `/coach.html`.

## Rules

- Every deploy-facing change must bump `version.json` and `CACHE_NAME` in
  `sw.js` together using the same UTC timestamp.
- Use `context/marketing-site-hero-copy.md` as the single source of truth for
  all Do Less marketing materials. Update it first when the positioning changes, then
  keep app copy aligned without replacing clear operational labels.
- Do not add auth or remote persistence before the canonical phase that calls
  for it. Do not add package-manager tooling or a build step unless required.
- Phase 2 keeps app data local to the browser. The live app uses the
  `local-primary` profile instance and `dl:profile:{profileInstanceId}:*` storage
  namespaces. Legacy single-user data migrates idempotently and remains available
  for recovery. Backup/restore still uses JSON export and import from Settings.
- `window.DoLessLocalProfiles.simulateAssignment(...)` is the local-only Phase 2
  assignment seam. Deterministic intake matching, auth, and cloud sync are deferred.
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
- Do Less quality priorities: visible check-in impact, plain-language session
  rationale, safe home-training prescriptions, and fallback sessions counting
  fully toward streaks.
