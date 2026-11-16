# Earth Field decisions

## 2026-11-15 — Plain-language interpretation layer

The page leads with a live sentence ("Space weather is quiet.") and a summary generated from the readings, followed by the 18 readings grouped in the order the Sun's influence travels: Sun, solar wind, magnetosphere, local sky, cosmic rays. Interpretation stays per-measurement; there is still no combined score.

- The headline word and the R/S/G chips use NOAA's published scales only: R from GOES X-ray flux (M1 = R1 … X20 = R5), S from ≥10 MeV protons (10 pfu = S1, decades upward), G from Kp (5 = G1 … 9 = G5). Flare class (A/B/C/M/X) is derived from the same flux. Kp 3/4 and Dst ≤ −30/−50 nT add "unsettled"/"active" below storm level.
- Per-card badges use NOAA thresholds where they exist (electron alert at 1,000), standard storm classes for Dst, and widely used descriptive bands for wind speed, density, Bt, Bz and F10.7. Ionosphere, ground field and GOES field get no badge where no accepted band exists.
- Badges and sentences are computed in the browser from the same readings shown, so replay produces past-tense text for the selected moment and missing inputs simply drop their clause.

## 2026-11-15 — Self-hosted Node container is production

Earth Field is its own repository (https://github.com/sardistic/earthfield) and production is https://earthfield.sardistic.com, a container built from `Dockerfile`. `server.mjs` adapts Node's HTTP server to the unchanged Worker module (`worker/main.js`), so the Worker code stays portable and the `dist/` Worker build remains available but is not what production runs. Under Node there is no `caches.default`; the existing optional-cache fallback and in-memory TTL cache apply. Still no database, credentials or scheduler; the container is stateless and read-only. Script tags carry `data-cfasync="false"` because the zone's script rewriting must not touch them.

## 2026-11-14 — Scientific metrics with explicit geographic and historical scope

Standalone dependency-free Cloudflare Worker Site, defaulting to Greenville, North Carolina (35.6127, -77.3664). Official feeds are fetched server-side and cached by source cadence. Failures are isolated and observation timestamps govern freshness. No combined radiation dose or safety score is synthesized.

Current readings, historical arithmetic means/ranges, trends and source age retain their own units. F10.7 uses its published 90-day reference. GloTEC retains the provider 30-day median and sparse historical snapshots with coverage quality. Current-only D-RAP has no invented baseline. Current estimated Kp is distinguished from three-hour history.

Nearest operational USGS observatory and model grid centers are selected by coordinates; distances are displayed. Newark and Oulu neutron monitors are named reference stations, not measurements at the chosen address. Global/orbital data do not change geographically. User-initiated geolocation and manually selected coordinates are saved only in browser local storage.

No database, external account credentials, or unattended ingestion. History comes from provider feeds. Cosmic-ray data are noncommercial and credited to station owners and NMDB.

## 2026-11-14 — Hosted cache access is optional

Sites dispatch can deny access to `caches.default`, including throwing when the property is accessed. Cache lookup failures must also fall back to direct provider fetches, and cache writes must never affect successful readings. Retain the bounded in-memory TTL cache and in-flight request coalescing. Regression tests cover denied default-cache access, reads and writes. Verify provider responses on the deployed Site using supported service access rather than relying solely on local tests and deployment status.

## 2026-11-14 — Data-driven Earth diorama and recorded playback

Replace the small text table and marketing copy with a large interactive canvas diorama, readable metric cards and a unified play/pause/scrub timeline. Keep expanded source descriptions behind reading details and a collapsed notes section. Native canvas projection avoids external graphics dependencies; drawing geometry, particle paths and layer extents are illustrative and exaggerated, not a physical reconstruction. Solar wind, Bz, density, F10.7, electron flux, cosmic-ray intensity, TEC and Kp drive selected visual properties. Missing or stale live inputs cannot drive their visual effect.

Day/week/month/year/decade playback uses recorded observations: NASA OMNIWeb daily data, NOAA HAPI solar-wind archives and Oulu corrected neutron counts, supplemented by recent existing feeds. Query history on demand; no database or scheduler is needed. NASA publication lag and per-variable missing sentinels are respected; NOAA quality-zero samples are used. Hourly/daily source cadence is retained with each point. Binary-search sampling never looks forward or fills beyond a source interval. Unavailable local/orbital history stays blank instead of reusing current readings. Daily averages are labeled and cannot represent individual flares.

Period statistics aggregate equal time bins and prefer the finest available cadence within a bin. This prevents dense recent samples from dominating older daily history. Long replay averages/ranges only describe available records; they do not imply complete source coverage. The selected observation point still controls nearby live USGS and GloTEC sources, while named archived cosmic-ray/global sources retain their identity.
