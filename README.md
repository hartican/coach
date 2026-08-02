# Do Less

Mobile-first, low-admin movement app evolving under the canonical archetype and
multi-profile specifications in `planning-coach/`. The current Phase 2 build is
still a standalone browser app: plain HTML/CSS/JS, no build step, no auth, no
backend, and local browser persistence only.

## Files

- `coach.html` - the Do Less app, served at the site root.
- `coach-state-core.js` - versioned local-state and profile migration rules.
- `coach-prescription-core.js` - upwards-only prescription and completed-load rules.
- `do-less-archetype-core.js` - approved internal archetype definitions, resolver, and deferred matcher interface.
- `do-less-session-engine.js` - profile-instance-aware session-engine boundary used by the live app.
- `do-less-profile-store.js` - local profile-instance model, isolated storage namespaces, assignment simulation, and legacy-data migration.
- `tests/` - dependency-free Node regression tests for persistence, prescriptions, archetypes, and engine delegation.
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

## Local Data

Do Less stores data only in this browser using profile-instance namespaces in
`localStorage`. Nothing is sent to a cloud database, no login is required, and
data does not sync across devices.

The app stores session history, key lifts, profile fields, theme preference,
optional background signals, and deployed-version state. Browser storage can be
cleared by the user, browser privacy settings, or device cleanup tools.

The live app uses `local-primary` as its current local profile instance. Existing
single-user state, signals, and theme data migrate once into that namespace; the
legacy values remain untouched for recovery. Profile reload, import, and reset
all use the same versioned migration path.
Completed exercise logs store generated and completed reps, seconds, and load;
Key-lift suggestions use those completed values.

Phase 2 also exposes `window.DoLessLocalProfiles` for local development. Its
`simulateAssignment(...)` method creates additional profile instances without a
visible account switcher. Intake matching, authentication, and cloud sync remain
deferred to later phases.

Run the local regression suite with:

```sh
node --test tests/*.test.js
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

Do Less is designed for static hosting on Vercel or similar free hosts. Deploy the
folder at the site root. The root path, `/app.html`, and
`/home-workout-planner.html` all rewrite to `/coach.html` so shared links keep
working.

For every deploy-facing change, bump `version.json` and `CACHE_NAME` in `sw.js`
together using a UTC timestamp such as `20260707T105323Z`.
