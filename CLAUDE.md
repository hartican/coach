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
