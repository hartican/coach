# Coach

Jack's personal workout PWA. No build step — plain HTML/JS/CSS, localStorage persistence.

- `coach.html` — the app (single-file SPA). `coach-classic.html` — legacy planner. `coach-app-spec.md` — product spec.
- Deployed via Vercel from github.com/hartican/coach (push to main auto-deploys). Public URL: https://coach-jack.vercel.app
- Old paths `/app.html` and `/home-workout-planner.html` are rewritten in `vercel.json` — keep those rewrites.

## Rules

- Every deploy-facing change: bump `version.json` AND `CACHE_NAME` in `sw.js` together (UTC timestamp format). Otherwise installed PWAs serve the stale cached version.
- Use `/ship` to run the full ship process (check → bump → verify → push → confirm live).
- Verify UI changes at 390px mobile width with headless Chrome before pushing; use an iframe probe, not direct screenshots (direct ones show stale-paint artifacts).
- Jack is a non-developer: report outcomes in plain language, work autonomously, push when done unless told otherwise.

## Recent local changes (human summary)

- 2026-07-02: Reworked the check-in flow to a 3-question starter: (1) "How are you feeling?" (combined mood+energy), (2) "Time available" (10 / 20 / 30+ min), (3) "What do you feel like training?". The answers now guide session length, rests, and difficulty.
- Tuned the session builder to respect a time budget: shorter budgets reduce rest durations and trim the number of steps.
- Added a small Theme toggle (Auto / Day / Night) in the top bar; preference saved to `localStorage` as `hwc_theme_pref`.
- Fixed layout issues: preview buttons now switch to a row at wider viewports; small CSS tweaks for desktop alignment.
- Added app credit on the splash/coach card: "Vibe coded by Jack Hartican, 2026(C)".

If you want this summarized into a commit message or a changelog entry, tell me the preferred text and I'll commit & push.
