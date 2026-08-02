# Do Less

Mobile-first, low-admin movement app evolving under the canonical archetype and
multi-profile specifications in `planning-coach/`. Phases 4 and 5 add durable,
profile-scoped workout sync, deterministic adaptation, profile-aware check-ins,
and a guarded admin correction path while keeping the training app local-first.
The main app remains plain HTML/CSS/JS with no client build step.

## Files

- `coach.html` - the Do Less app, served at the site root.
- `coach-state-core.js` - versioned local-state and profile migration rules.
- `coach-prescription-core.js` - upwards-only prescription and completed-load rules.
- `do-less-archetype-core.js` - approved internal archetype definitions, resolver, and deferred matcher interface.
- `do-less-archetype-matcher.js` - deterministic, versioned intake matcher with inspectable rationale.
- `do-less-provisioning-core.js` - validated pre-auth provisioning sequence that stages the profile before requesting an email link.
- `do-less-supabase-provisioning.js` - server-only Supabase account, intake, assignment-event, and profile adapter.
- `setup.html` and `do-less-setup.js` - guided family-profile intake at `/setup`.
- `api/provision-account.js` - Vercel server function for guarded account provisioning.
- `api/supabase-config.js` - no-store browser configuration endpoint that exposes only the public Supabase URL and publishable key.
- `supabase/migrations/` - database schema, indexes, grants, and owner-only row-level security policies.
- `do-less-session-engine.js` - profile-instance-aware session-engine boundary used by the live app.
- `do-less-exercise-catalog.js` - shared tagged movement inventory, archetype filters, substitutions, and intensity caps.
- `do-less-session-outcome-core.js` - deterministic complete, partial, skipped, and aborted outcome classification.
- `do-less-profile-store.js` - local profile-instance model, isolated storage namespaces, assignment simulation, and legacy-data migration.
- `do-less-adaptation-core.js` - deterministic, profile-scoped adaptation rules and inspectable events.
- `do-less-sync-core.js` - offline event queue plus timestamp-and-ID reconciliation rules.
- `do-less-supabase-sync.js` - authenticated browser adapter for owner-scoped Supabase reads and writes.
- `do-less-cloud.js` - auth lifecycle, cloud-profile activation, reconnect, and sync-status orchestration.
- `do-less-checkin-core.js` - profile-aware check-in questions and everyday user copy.
- `do-less-profile-planners.js` - conservative postpartum and active-ageing session recommendations.
- `do-less-admin-core.js` - safe review and confirmed-override validation rules.
- `do-less-supabase-admin.js` - server-only, owner-scoped admin review and override adapter.
- `admin.html` and `do-less-admin.js` - guarded matcher, rationale, and correction view at `/admin`.
- `api/manage-profile.js` - access-code-protected Vercel function for admin review and atomic correction.
- `api/_request-guard.js` - shared no-store POST, body, environment, and constant-time secret checks for server functions.
- `tests/` - Node regression tests for persistence, prescriptions, archetypes, provisioning, sync, adaptation, profile refinements, admin control, and engine delegation.
- `planning-coach/PIPELINE-do-less-archetype-assignment-spec.md` - overriding archetype assignment and phased-delivery contract.
- `planning-coach/PIPELINE-do-less-multi-profile-architecture.md` - detailed canonical multi-profile architecture.
- `context/marketing-site-hero-copy.md` - single source of truth for all Do Less marketing copy.
- `assets/` - strong-arm app icons for the browser manifest and iOS home screen.
- `manifest.json` - home-screen/PWA metadata.
- `sw.js` and `version.json` - simple cache/update support for installed PWAs.
- `vercel.json` - static-host rewrites for shared and old links.

## App Features

- Profile-aware check-in that asks only the readiness, time, goal, symptom, confidence, or environment questions relevant to the active plan.
- Quick start with reshuffle.
- Per-exercise countdowns, overtime and PB feedback, plus pause, back, skip, swap, difficulty, and like/dislike controls.
- Upwards-only in-session rep, hold-time, and load controls with the generated target enforced as the minimum.
- Global goal, Profile, Key lifts, Appearance, sport configuration, and the Technique library under Settings.
- Session generator with standard, momentum-reset, travel, and harder-day modes, resolved through the current internal baseline and active local profile instance.
- Duration-aware repeat sets, daily variation, environment-aware ordering, and an 8-week progression jump control.
- Completed-only session logs with exact variants, generated and completed prescriptions, load history, and specific technique-video searches.
- Daily streak tracking where any completed session counts, including fallback sessions, with three banked cheat-day freezes that refill one at a time every 30 days (maximum bank: three).
- Evening beer-check prompt and time-of-day behavior.
- Local export/import/reset controls under Settings.
- A separate family-profile setup flow that assigns a starting plan, stores its rationale, creates the profile, and only then requests the sign-in email.
- Authenticated profile activation with restrained account/sync status, offline queuing, automatic reconnect, and manual sync/sign-out controls.
- One-sentence recommendation rationale plus deterministic adaptations based on recent completions and feedback.
- Durable skipped/partial outcomes, safe substitution history, and profile-scoped exercise preferences that inform later recommendations.
- A private admin review at `/admin` showing matcher outcome, rationale, intake, recommendation, and adaptation history, with explicit confirmation and an audit reason required before any assignment correction.

## Local Data

The training app stores workout data in this browser using profile-instance
namespaces in `localStorage`. No login is required for the existing local flow.
When an assigned account is signed in, completions, readiness, lift snapshots,
adaptation events, and derived profile state sync to Supabase; the local copy and
pending-event queue keep the app usable offline.

The app stores session history, key lifts, profile fields, theme preference,
optional background signals, and deployed-version state. Browser storage can be
cleared by the user, browser privacy settings, or device cleanup tools.

The live app uses `local-primary` as its current local profile instance. Existing
single-user state, signals, and theme data migrate once into that namespace; the
legacy values remain untouched for recovery. Profile reload, import, and reset
all use the same versioned migration path.
Completed exercise logs store generated and completed reps, seconds, and load;
Key-lift suggestions use those completed values.

The Phase 2 seam also exposes `window.DoLessLocalProfiles` for local development. Its
`simulateAssignment(...)` method creates additional profile instances without a
visible account switcher.

Phase 3 adds a separate online setup path. Intake, the matcher decision, its
rationale, the user account, and the assigned profile are stored in Supabase
before `signInWithOtp` is called with implicit signup disabled. The server
function computes the redirect; the browser never receives the Supabase secret
key or the internal archetype ID.

Phase 4 activates the authenticated profile instance after the magic-link
return. Each cloud profile keeps its own
`dl:profile:{profileInstanceId}:pending-events` queue. Event records reconcile by
stable ID and update timestamp. Generated plans are deliberately not merged
between devices; the engine regenerates them from synced history and current
profile state. A cached cloud-profile hint keeps the correct namespace available
offline and is revalidated against the authenticated Supabase user before sync.

Phase 5 keeps normal workout copy free of internal archetype IDs, refines
postpartum symptom gates and active-ageing confidence-based starts, and adds an
admin-only assignment review. Corrections run as one database transaction,
append an assignment event, reset only archetype-dependent derived state, and
preserve the profile's workout history. Database guards reject stale offline
writes when a newer copy is already stored remotely.

Run the local regression suite with:

```sh
npm test
```

Use Settings -> Export backup before clearing site data or moving devices. Use
Settings -> Import backup to restore that JSON file in another browser. Use
Settings -> Reset Do Less data to clear local Do Less data in the current browser.

Optional background signals can be written by phone automation to
`localStorage["dl:profile:local-primary:signals"]` in this shape:

```json
{"dateISO":"YYYY-MM-DD","steps":1234,"alcoholUnits":0}
```

## Hosting

Do Less uses Vercel for the static app and server functions. Deploy the folder
at the site root. The root path, `/app.html`, and
`/home-workout-planner.html` rewrite to `/coach.html`; `/setup` rewrites to the
guided account setup page; and `/admin` rewrites to the private review page.
`/api/supabase-config` returns only browser-safe configuration and must not be
cached.

Before enabling account setup:

1. Link the intended Supabase project and apply the migrations with
   `npx supabase db push --linked`.
2. Configure Supabase email delivery and allow the deployed
   `/coach.html?auth=magic-link` redirect URL.
3. Set these Vercel environment variables for Production (and Preview if used):
   `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
   `DO_LESS_SETUP_ACCESS_CODE`, `DO_LESS_ADMIN_ACCESS_CODE`, and
   `DO_LESS_SITE_URL`.

`DO_LESS_SETUP_ACCESS_CODE` should be a long private value. Legacy Supabase key
names `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` are accepted during key
migration, but the newer names are preferred. If the server configuration is
missing, `/setup` fails closed and the local training app continues to work.
`SUPABASE_PUBLISHABLE_KEY` is the only key returned to the browser;
`SUPABASE_SECRET_KEY` remains server-only. `/admin` requires its own separate
`DO_LESS_ADMIN_ACCESS_CODE`; it is submitted only in a protected POST body and
is neither placed in the URL nor stored by the page. Do not share the admin code
with people who only need to create a family profile.

For every deploy-facing change, bump `version.json` and `CACHE_NAME` in `sw.js`
together using a UTC timestamp such as `20260707T105323Z`.
