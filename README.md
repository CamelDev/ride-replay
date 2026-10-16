# Ride Replay

Turn a GPX ride into a map animation and export it as a Full HD video, entirely in your browser.

Ride Replay is a frontend-only app built with vanilla JavaScript, HTML, and CSS. It needs no accounts, API keys, package dependencies, or application backend. Your GPX file is processed locally.

## Features

- Upload a GPX file or explore the included Dolomites demo.
- Replay recorded timestamps at **1×, 2×, 5×, or 10×**, including stops.
- Trim the beginning and end of a ride, scrub through playback, and download the selected section as GPX.
- View live speed, altitude, distance, ascent, and an elevation profile.
- Switch between **Overview** and **Follow rider** camera modes.
- Record **1920 × 1080** video with an optional ride-data overlay.
- Preview the exported video and download it, including partial recordings stopped early.

## Run locally

You need **Node.js 20 or later** and npm. No `npm install` step is required.

```sh
git clone https://github.com/CamelDev/ride-replay.git
cd ride-replay
npm run dev
```

Open [localhost:5173](http://localhost:5173). If you already have the project checked out, run `npm run dev` from its directory.

To use another port on macOS or Linux:

```sh
PORT=5234 npm run dev
```

Then open [localhost:5234](http://localhost:5234). Stop the server with `Ctrl+C`.

The development server only serves static files. Serve the app over HTTP rather than opening `index.html` directly, because it uses JavaScript modules.

## Replay a ride

1. Click **Upload GPX** or drop a `.gpx` file onto the upload area. The file limit is 25 MB.
2. Choose a playback speed and camera mode.
3. Adjust the **Start** and **End** trim sliders if you want only part of the route.
4. Press play or use the timeline to inspect the ride.
5. Use **Download trimmed GPX** to save the selected route independently of video export.

Track points are used when present; GPX route points are also supported. At least two valid points are required.

### Timing and ride metrics

Playback follows the recorded timestamps. Speed multipliers shorten the animation without multiplying the displayed riding speed.

If timestamps are missing, the app asks for a total ride duration and labels the timing as estimated. Estimated timing distributes time by distance; it cannot recover actual stops or speed changes. Duplicate or reversed timestamps are rejected.

Speed is calculated from adjacent coordinates and timestamps. Altitude comes from GPX elevation data, and ascent is the sum of positive elevation changes. Missing elevation is shown as unavailable. GPS noise can affect these values; no elevation smoothing is applied. Gaps between track segments do not add invented distance or ascent.

## Export a video

1. Select the route section, playback speed, camera mode, and overlay setting.
2. Wait for the map to load, then click **Export video**.
3. Review the video duration and click **Start recording**.
4. Keep the tab active until recording finishes.
5. Play the result below the map and click **Download video** to save it.

**Switching tabs or minimizing the browser pauses recording.** Your progress is kept while the page remains open. Return to the tab and click **Resume recording** to continue. **Stop & keep partial video** finishes the portion already recorded and labels it as partial.

**Download your result before refreshing or closing the page.** Results are held in browser memory, not saved to a library. A new result replaces the previous one.

### Export limits

- Recording runs in real time at the chosen multiplier. A 60-minute ride at 10× takes about six minutes of active recording; pauses add to the wait.
- The canvas resolution is 1920 × 1080 and the requested capture rate is 30 FPS. Actual frame rate depends on browser and device performance.
- The app chooses a supported MediaRecorder format: WebM when available, otherwise MP4. It does not offer format conversion.
- Long recordings consume browser memory. Start with a short trimmed section to check your browser's output.
- Export requires Canvas `captureStream` and `MediaRecorder` support. Codec availability varies by browser.
- Follow mode can require new map tiles during recording, so connection speed can affect the rendered map.

## Privacy and maps

GPX parsing, trimming, playback, and video encoding happen on your device. The app does not upload GPX contents or videos.

The app is **not fully offline**: map tiles come from OpenStreetMap, and fonts are requested from Google Fonts. Tile requests reveal the map area being viewed to the provider. If tiles cannot load, the preview shows the route on a neutral grid; recording waits for the initial visible tiles to load.

OpenStreetMap attribution appears in the preview and exported video. The app requests tiles for the current view without bulk downloads or offline prefetching. Review the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/) before deploying at scale.

## Build and host

```sh
npm run build
```

This copies the application files into `dist/`. Deploy that folder to a static host; no server-side application or environment variables are required. Keep the files together so relative module and stylesheet URLs resolve correctly.

If your host asks for build settings:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |

If present, `.openai/hosting.json` configures optional OpenAI Sites hosting. It is not required for local development or other static hosts.

## Development

| File | Purpose |
| --- | --- |
| `index.html` | Editor controls, export dialog, and result player |
| `style.css` | Responsive layout and styles |
| `app.js` | UI state, map canvas, playback, and export integration |
| `route.js` | GPX parsing, route calculations, interpolation, and demo data |
| `recording.js` | Recording lifecycle and pause/resume timing |
| `server.mjs` | Local static development server |
| `build.mjs` | Static build copy script |
| `tests/` | Route and recording lifecycle tests |
| `AGENTS.md` | Project guidance for coding agents |

Edit the source files rather than `dist/`. When adding a browser module or asset, update both the copy list in `build.mjs` and the allowlist in `server.mjs`. Restart the development server after changing its allowlist.

### Checks

```sh
npm test
node --check app.js
node --check route.js
node --check recording.js
npm run build
```

Tests cover route timing, interpolation, segment gaps, missing data, antimeridian crossings, recording pause/resume, final chunks, partial recordings, and encoder failure cleanup.

Recording tests use a mock MediaRecorder. They do not verify actual browser codecs, video playback, downloads, or map tile loading. For changes to export behavior, also record a short route in a browser, switch away and resume, and check both a completed and a partial video's playback and download.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Port is already in use | Stop the other process or use `PORT=5234 npm run dev`. |
| Server reports `EPERM` | The environment may block opening a listening port. Run the server in a local terminal with permission to listen. |
| Map is incomplete or recording waits for tiles | Check your internet connection and whether tile requests are blocked. |
| Export appears to have stopped | Return to the tab and check the export dialog for **Resume recording**. |
| No file appeared in Downloads | Use **Download video** in the result panel; completion does not automatically save a file. |
| A result disappeared after refreshing | Results are kept only in memory. Record again and download before leaving the page. |
| Video export is unavailable | Check the browser's Canvas capture and MediaRecorder support; try another browser with those capabilities. |
