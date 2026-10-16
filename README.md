# Ride Replay

Frontend-only GPX animation studio. No runtime dependencies, API keys, account, or backend. GPX files remain in browser memory. The development server only serves static files.

## Run

Requires Node.js 20+ or Bun.

```sh
npm run dev
# open http://localhost:5173
```

No installation needed. `npm run build` creates `dist/`, ready for static hosting. `npm test` runs the route-calculation tests.

## Features

- GPX upload and drag/drop, with a built-in Dolomites demo.
- Timestamp-based playback at 1×, 2×, 5×, and 10×, preserving recorded stops.
- Start/end trimming, scrubbing, elevation profile, and trimmed GPX download.
- Live speed, altitude, distance, and ascent; follow-rider and overview camera modes.
- Browser-generated 1920 × 1080 video at a requested 30 FPS, including optional metrics and map attribution. The browser selects supported WebM or MP4 encoding.

## Behavior and limits

- Missing timestamps require an explicit estimated ride duration. Estimated timing assumes constant speed between points; it cannot recover actual stops. Non-increasing timestamps are rejected rather than silently changing ride time.
- Speed is derived from adjacent coordinates and timestamps, not proprietary device speed extensions. Ascent sums positive elevation differences and may include GPS noise. Missing altitude is shown as unavailable. Disconnected segments do not contribute invented travel distance.
- Export uses Canvas captureStream and MediaRecorder, so a 60-minute ride at 10× takes six minutes to record. Switching tabs pauses recording and preserves progress; resume explicitly after returning. Actual frame rate depends on device performance. Long videos consume browser memory. Stopping early retains a clearly labelled partial video. Completed and partial videos appear in a player with an explicit download link; they remain available until replaced or the page is closed/refreshed.
- Map tiles and optional Google Fonts require internet access. GPX contents are never uploaded, but visible map tile requests reveal the viewed map area to the tile provider. Tile service failure leaves a route on a neutral grid. Follow mode may need new tiles while recording.
- OpenStreetMap attribution is included on both the preview and exported video. The public OSM tile service is appropriate for modest interactive use; use a suitable provider for production-scale traffic. No offline bulk downloads or tile prefetching are performed.
- Antimeridian crossings use the short path. Polar map positions are clamped to Web Mercator's supported latitude.

## Verification

`npm test`: twelve tests covering recording pause/resume timing, final video chunks, partial video retention, encoder failures, stream cleanup, and interpolation, stops, segment gaps, estimated timing, invalid timestamps, missing altitude, trim metrics, antimeridian crossings, and projection. JavaScript syntax and static build checked. The recording lifecycle tests use a mock MediaRecorder. Browser playback and actual video encoding still require a browser smoke test.

## Browser API references

- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
- https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static
- https://operations.osmfoundation.org/policies/tiles/
