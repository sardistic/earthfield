# Earth Field

Live, text-first space weather dashboard centered on Greenville, North Carolina. Displays 18 metrics covering local/regional effects, cosmic rays, energetic particles, solar emissions, incoming solar wind, geomagnetic indices and the magnetosphere. No combined dose or safety score.

## Run and validate

Node 20+; no dependencies. `npm run dev` serves http://localhost:4174. Run `npm test`, `npm run build`, and `npm run validate`. Source entrypoint: `worker/main.js`. The deterministic build concatenates the three local modules into a standalone Worker at `dist/server/index.js`; it removes only the known top-level module declarations.

APIs: `/api/space`, `/api/local?lat=35.6127&lon=-77.3664`, `/api/cosmic?lat=35.6127&lon=-77.3664`. `/healthz` is application health, not provider health. Coordinates are bounded and external URLs are fixed in code.

Page refresh is every two minutes while visible. Server caches reflect source cadence. A source failure cannot masquerade as a fresh zero. If a browser retains its previous reading after failure, the row is marked failed and excluded from fresh coverage. Averages/ranges use actual available history in the selected 24-hour, seven-day or 30-day window. Trend definitions and coverage are explicit; no interpolated history is invented.

Hosted shared-cache access is optional: Sites can deny `caches.default`, so property access and reads are guarded and fall back to direct fetches. Cache-write errors cannot invalidate a reading. The in-memory TTL cache still applies. Validate actual production data responses after publication, not just deployment status.

## Sources

- NOAA SWPC JSON: active quality-zero upstream solar wind, GOES soft X-rays, protons, electrons and magnetometer (arcjet flags excluded), Kp, Kyoto Dst, noon F10.7 with its published 90-day mean.
- USGS operational observatory catalog: nearest station, `type=variation` horizontal field H at 60-second cadence. Hourly history is aggregated from valid minute readings, because requesting hourly variation samples returned nulls at the verified station. dH/dt excludes gaps over two minutes.
- NOAA GloTEC: nearest 2.5° latitude × 5° longitude modeled cell; TEC, absolute TECU difference from the 30-day median, and coverage quality. Four snapshots give sparse history, not a sampled mean. Directory listing fallback handles empty index responses. A historical comparison with zero observation support is labeled model-only.
- NOAA D-RAP text: parse actual latitude/longitude grid. Value is the highest frequency affected by 1 dB absorption, not a dose. Zero is valid. No native history in this feed.
- NEWK neutron monitor: NMDB revised pressure/efficiency-corrected counts per second, five-minute recent and hourly 30-day history. Credit University of Delaware Department of Physics and Astronomy, Bartol Research Institute, and NMDB (EU FP7 contract 213007). Preliminary; timestamps mark interval start and the newest bucket can be incomplete. Commercial/industrial use requires PI agreement.
- Oulu neutron monitor: pressure/efficiency-corrected counts per minute; five-minute recent and hourly 30-day history. Query boundaries must be half-hour aligned and dates padded. Data credited to Oulu / Sodankylä Geophysical Observatory. Current-month data preliminary. Research/education/public noncommercial use; commercial use requires station-manager agreement.

Newark and Oulu are named reference stations, not a local radiation dose estimate. Distances and model cell centers are displayed. Global/orbital metrics remain global/orbital when location changes. No database or unattended scheduler; historical records come from providers on demand.
