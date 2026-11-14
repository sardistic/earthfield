# Earth Field decisions

## 2026-11-14 — Scientific metrics with explicit geographic and historical scope

Standalone dependency-free Cloudflare Worker Site, defaulting to Greenville, North Carolina (35.6127, -77.3664). Official feeds are fetched server-side and cached by source cadence. Failures are isolated and observation timestamps govern freshness. No combined radiation dose or safety score is synthesized.

Current readings, historical arithmetic means/ranges, trends and source age retain their own units. F10.7 uses its published 90-day reference. GloTEC retains the provider 30-day median and sparse historical snapshots with coverage quality. Current-only D-RAP has no invented baseline. Current estimated Kp is distinguished from three-hour history.

Nearest operational USGS observatory and model grid centers are selected by coordinates; distances are displayed. Newark and Oulu neutron monitors are named reference stations, not measurements at the chosen address. Global/orbital data do not change geographically. User-initiated geolocation and manually selected coordinates are saved only in browser local storage.

No database, external account credentials, or unattended ingestion. History comes from provider feeds. Cosmic-ray data are noncommercial and credited to station owners and NMDB.
