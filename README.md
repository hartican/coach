# Do Less

Mobile-first, low-admin movement app evolving under the canonical archetype and
multi-profile specifications in `planning-coach/`. Phase 3 adds guided account
provisioning and Supabase magic-link delivery while keeping the training app
local-first. The main app remains plain HTML/CSS/JS with no client build step.

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
- `supabase/migrations/` - database schema, indexes, grants, and owner-only row-level security policies.
- `do-less-session-engine.js` - profile-instance-aware session-engine boundary used by the live app.
- `do-less-profile-store.js` - local profile-instance model, isolated storage namespaces, assignment simulation, and legacy-data migration.
- `tests/` - Node regression tests for persistence, prescriptions, archetypes, provisioning, and engine delegation.
- `planning-coach/PIPELINE-do-less-archetype-assignment-spec.md` - overriding archetype assignment and phased-delivery contract.
- `planning-coach/PIPELINE-do-less-multi-profile-architecture.md` - detailed canonical multi-profile architecture.
- `context/marketing-site-hero-copy.md` - single source of truth for all Do Less marketing copy.
- `assets/` - strong-arm app icons for the browser manifest and iOS home screen.
- `manifest.json` - home-screen/PWA metadata.
- `sw.js` and `version.json` - simple cache/update support for installed PWAs.
- `vercel.json` - static-host rewrites for shared and old links.

## App Features

- 4-question check-in that chooses session mode, time budget, focus, and indoor/outdoor context.
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

## Local Data

The training app stores workout data in this browser using profile-instance
namespaces in `localStorage`. No login is required for that existing local flow,
and its workout history does not yet sync across devices.

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
key or the internal archetype ID. Phase 4 will add auth-aware app state, workout
sync, and adaptation. Until then, returning from the email link lands in the
local-first app without replacing local workout data.

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

Do Less uses Vercel for the static app and the Phase 3 server function. Deploy the
folder at the site root. The root path, `/app.html`, and
`/home-workout-planner.html` rewrite to `/coach.html`; `/setup` rewrites to the
guided account setup page.

Before enabling account setup:

1. Link the intended Supabase project and apply the migration in `supabase/migrations/`.
2. Configure Supabase email delivery and allow the deployed
   `/coach.html?auth=magic-link` redirect URL.
3. Set these Vercel environment variables for Production (and Preview if used):
   `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
   `DO_LESS_SETUP_ACCESS_CODE`, and `DO_LESS_SITE_URL`.

`DO_LESS_SETUP_ACCESS_CODE` should be a long private value. Legacy Supabase key
names `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` are accepted during key
migration, but the newer names are preferred. If the server configuration is
missing, `/setup` fails closed and the local training app continues to work.

For every deploy-facing change, bump `version.json` and `CACHE_NAME` in `sw.js`
together using a UTC timestamp such as `20260707T105323Z`.
