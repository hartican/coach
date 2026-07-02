Ship the current Coach changes. Follow this exact process:

1. Syntax-check anything touched: extract the inline `<script>` from coach.html (or coach-classic.html) and run `node --check` on it; `node --check sw.js`; JSON-validate manifest.json and vercel.json if changed.
2. Bump `version.json` AND the `CACHE_NAME` timestamp in `sw.js` to the current UTC time (format `coach-cache-YYYYMMDDTHHMMSSZ` / `{"version":"YYYYMMDDTHHMMSSZ"}`). Both must change together or phones keep the stale cached app.
3. Verify the change works at mobile width first if it's a UI change (headless Chrome, 390px iframe probe — see the coach-verify-process memory).
4. Commit with a descriptive message and push to main.
5. Poll `https://coach-jack.vercel.app/version.json` until it returns the new version (Vercel deploys in ~1-2 min), then spot-check the changed feature on the live URL with curl.
6. Report what shipped and remind about the in-app Update banner if the change affects the installed PWA.
