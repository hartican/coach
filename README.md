# Do Less

Mobile-first, low-admin movement app built from `Planning/coach-app-spec.md`.
It is a standalone browser app: plain HTML/CSS/JS, no build step, no auth,
no backend, and local browser persistence only.

## Files

- `coach.html` - the Do Less app, served at the site root.
- `Planning/coach-app-spec.md` - canonical product spec.
- `context/marketing-site-hero-copy.md` - single source of truth for all Do Less marketing copy.
- `assets/` - strong-arm app icons for the browser manifest and iOS home screen.
- `manifest.json` - home-screen/PWA metadata.
- `sw.js` and `version.json` - simple cache/update support for installed PWAs.
- `vercel.json` - static-host rewrites for shared and old links.

## App Features

- 4-question check-in that chooses session mode, time budget, focus, and indoor/outdoor context.
- Quick start with reshuffle.
- Per-exercise countdowns, overtime and PB feedback, plus pause, back, skip, swap, difficulty, and like/dislike controls.
- Global goal, Profile, Key lifts, Appearance, sport configuration, and the Technique library under Settings.
- Session generator with standard, momentum-reset, travel, and harder-day modes.
- Duration-aware repeat sets, daily variation, environment-aware ordering, and an 8-week progression jump control.
- Completed-only session logs with exact variants and specific technique-video searches.
- Daily streak tracking where any completed session counts, including fallback sessions, with three banked cheat-day freezes that refill one at a time every 30 days (maximum bank: three).
- Evening beer-check prompt and time-of-day behavior.
- Local export/import/reset controls under Settings.

## Local Data

Do Less stores data only in this browser using `localStorage`. Nothing is sent to
a cloud database, no login is required, and data does not sync across devices.

The app stores session history, key lifts, profile fields, theme preference,
optional background signals, and deployed-version state. Browser storage can be
cleared by the user, browser privacy settings, or device cleanup tools.

Use Settings -> Export backup before clearing site data or moving devices. Use
Settings -> Import backup to restore that JSON file in another browser. Use
Settings -> Reset Do Less data to clear local Do Less data in the current browser.

Optional background signals can be written by phone automation to
`localStorage["hwc_signals"]` in this shape:

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
