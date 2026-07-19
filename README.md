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

- 3-question check-in that chooses session mode, time budget, focus, and difficulty.
- Quick start with reshuffle.
- Global goal on the Plan tab: visible abs, anterior/posterior chain, or upper body.
- Session generator with standard, momentum-reset, travel, and harder-day modes.
- 8-week progression map with key-lift tracking.
- Technique library with brief cues and video searches.
- Daily streak tracking where any completed session counts, including fallback sessions, with three banked cheat-day freezes that refill one at a time every 30 days (maximum bank: three).
- Evening beer-check prompt and time-of-day behavior.
- Local export/import/reset controls on the Profile tab.

## Local Data

Do Less stores data only in this browser using `localStorage`. Nothing is sent to
a cloud database, no login is required, and data does not sync across devices.

The app stores session history, key lifts, profile fields, theme preference,
optional background signals, and deployed-version state. Browser storage can be
cleared by the user, browser privacy settings, or device cleanup tools.

Use Profile -> Export backup before clearing site data or moving devices. Use
Profile -> Import backup to restore that JSON file in another browser. Use
Profile -> Reset Do Less data to clear local Do Less data in the current browser.

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
