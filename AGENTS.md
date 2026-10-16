# Ride Replay contributor guidance

These instructions apply throughout this repository.

## Project and architecture

Ride Replay is a frontend-only GPX route animation and video export app. Keep GPX parsing, playback, trimming, and video encoding in the browser. Do not introduce a backend, file uploads, accounts, API keys, or analytics unless the task explicitly requires them.

The app uses vanilla JavaScript ES modules, HTML, and CSS with no package dependencies. Prefer the existing browser APIs and small modules over adding a framework or build tool.

- `index.html`: editor markup, controls, export dialog, and video result player.
- `style.css`: responsive layout and visual styles.
- `app.js`: UI state, canvas map rendering, tile loading, playback, trimming, and export integration.
- `route.js`: GPX parsing, route preparation, interpolation, distance/elevation calculations, projection, and demo route.
- `recording.js`: MediaRecorder lifecycle, elapsed capture time, pause/resume, and result delivery.
- `server.mjs`: development-only static server with an explicit file allowlist; not an application backend.
- `build.mjs`: copies application assets into `dist/` for static hosting.
- `tests/*.test.mjs`: Node test runner suites for route logic and recording lifecycle.

Edit source files, not generated `dist/` files. When adding a browser module or asset, update both the build copy list and the development server allowlist. Preserve ES module imports with explicit file extensions.

## Commands

Requires Node.js 20+; no dependency installation is needed.

```sh
npm run dev                  # http://localhost:5173
PORT=5234 npm run dev         # alternate local port
npm test                     # node --test tests/*.test.mjs
npm run build                # regenerate dist/
node --check app.js           # syntax check; use for other changed JS files too
```

Do not assume a preview server is running. Restart it when changing the server's file allowlist. If preview startup fails with `EPERM`, report the environment limitation; do not claim browser verification succeeded.

## GPX and playback invariants

- Original timestamps determine ride time, including stops. Multipliers are 1×, 2×, 5×, and 10×; they affect playback duration, not the displayed physical speed.
- Missing timestamps require the user's explicit estimated duration. Label estimated timing; do not silently fabricate accurate ride times.
- Reject duplicate or reversed timestamps rather than silently reordering or removing points.
- Do not invent distance, speed, or ascent across disconnected track segments.
- Preserve missing elevation as unavailable, not zero. Ascent sums positive elevation changes and is not noise-corrected.
- Keep trim bounds ordered, playback within the selected interval, and displayed metrics relative to the selected start.
- Preserve timestamp/elevation data in trimmed GPX exports, escape XML text, and label estimated timestamps.
- Maintain short-path longitude handling across the antimeridian and valid Web Mercator latitude bounds.
- Treat file names, GPX names, and other uploaded content as untrusted. Use `textContent` for display, not HTML injection.

## Video export invariants

- Export is browser-only at 1920 × 1080, requesting 30 FPS. Select a supported MediaRecorder format; do not promise frame-perfect output or faster-than-real-time rendering.
- Keep the active-tab warning visible in the export dialog. Hiding the page pauses recording and preserves progress. Returning requires an explicit resume action.
- Exclude paused time from elapsed capture time so resuming does not skip route positions.
- Stopping early must retain a clearly labelled partial recording. Never silently discard recorded data because the tab became hidden.
- Collect the final `dataavailable` event before creating the result blob. Release stream tracks when capture ends or initialization fails.
- Show completed and partial results in a video player with an explicit download link. Do not rely only on automatic downloads or a temporary toast.
- Keep the result object URL valid while the player and download link use it; revoke replaced URLs. Explain that results must be downloaded before refreshing or closing the page.
- Keep failures visible and actionable. Preserve recorded data where possible.

## Maps, privacy, and interface

- Keep OpenStreetMap attribution visible in the preview and encoded video.
- Request only map tiles needed for the current view; do not introduce bulk tile downloads or offline prefetching.
- GPX files stay on the device. Do not describe the app as fully offline: tiles and optional fonts use external services, and tile requests reveal the viewed area.
- Preserve overview and follow-rider modes, live metrics, trimming, and responsive layouts.
- Give controls accessible names, visible keyboard focus, and readable status messages. Avoid presenting essential export status only in a disappearing toast.

## Validation and handoff

For changes to route or recording behavior, add focused regression tests and run `npm test`. Run syntax checks for changed JavaScript and `npm run build` for app changes. Documentation-only edits do not need a build or new tests.

For UI or export changes, use a browser smoke test when available: upload a GPX, play and scrub, change speed, trim, switch camera modes, and export a short selection. For export lifecycle changes, also switch away and return, resume, stop early, and verify both playback and downloading of the resulting video.

Recording unit tests use a mock MediaRecorder. Passing them does not establish that browser encoding, codecs, map tile CORS, or downloads work. Report exactly what was verified and any browser verification limits. Do not publish, push commits, or change hosting access unless the task authorizes it.

Keep `README.md` aligned with user-visible behavior and commands. Keep dependencies, generated output, local environment files, recordings, and private GPX samples out of commits. Use synthetic route fixtures for tests. If `.openai/hosting.json` is present, it configures optional Sites hosting; it is not needed to run the app locally. Preserve hosting identity and access configuration unless the task requests a change.
