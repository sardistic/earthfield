# Project Agent Contract

## Purpose

Earth Field is a live space weather observatory: an interactive Earth/atmosphere diorama plus 18 metric cards (solar wind, magnetosphere, ionosphere, geomagnetic and cosmic-ray readings), defaulting to Greenville, North Carolina, with day/week/month/year/decade replay of recorded observations.

It is a standalone project. It began inside the `lights` repository under `sites/earth-observatory` and was split out on 2026-11-15; it shares no code, runtime or deployment with `lights`.

## Architecture

Dependency-free Cloudflare-Worker-style Site, Node 20+.

- `worker/main.js` — entrypoint and routing (`/`, `/app.js`, `/api/space`, `/api/local`, `/api/cosmic`, `/api/history`, `/api/glance`, `/healthz`).
- `worker/data.js` — live provider fetches, parsing, caching by source cadence.
- `worker/history.js` — on-demand archived series and time-bin statistics.
- `worker/view.js` — page markup and styles.
- `worker/client.js`, `worker/diorama.js` — browser application and canvas diorama, served at `/app.js`.
- `server.mjs`, `Dockerfile` — self-hosted Node entrypoint and container image.
- `scripts/build.mjs` — deterministic build that concatenates the local modules into `dist/server/index.js`.
- `.openai/hosting.json` — Sites hosting project binding.

No database, credentials or scheduler. All data comes from public provider feeds (NOAA SWPC, NASA OMNIWeb, USGS, NMDB, Oulu) fetched server-side. See `README.md` for source details and `docs/agent/DECISIONS.md` for the scientific and scope rules that must be preserved.

## Commands

| Operation | Command |
|---|---|
| Install | None (no dependencies) |
| Develop | `npm run dev` (http://localhost:4174) |
| Test | `npm test` |
| Lint | None configured |
| Build | `npm run build` |
| Validate artifact | `npm run validate` |
| Icons / share image | Edit files in `assets/`, then `node scripts/embed-assets.mjs` to regenerate `worker/assets.js` (served at `/favicon.svg`, `/favicon.ico`, `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png`, `/og.jpg`) |
| Run (production) | `npm start` (`server.mjs`, `PORT` default 8080) or the `Dockerfile` |
| Deploy | On the production host: pull this repository, then `docker compose up -d --build` in the service directory (see the control-plane runbook) |

## Agent state

Read these files before editing:

- `docs/agent/HANDOFF.md`
- `.agent/runtime/WORKTREE.md`
- `docs/agent/DECISIONS.md`

Update `docs/agent/HANDOFF.md` after any turn that changes implementation state.

Do not commit `.agent/runtime/` or `docs/agent/HANDOFF.md`.

## Validation

Run `npm test`, `npm run build` and `npm run validate`. After publishing, check real data responses on the deployed Site, not just deployment status. Record exact results in the handoff.

## Deployment

Production is https://earthfield.sardistic.com, self-hosted as a Docker container built from this repository's `Dockerfile` (`server.mjs` runs the Worker module under Node; no build step is needed). Source of truth is https://github.com/sardistic/earthfield.

An earlier private copy published by the Codex Sites workflow (`.openai/hosting.json`) may still exist at https://earth-field-observatory.sardistic.chatgpt.site; it is not updated by this deployment.

The sardistic.com zone rewrites script tags (Rocket Loader); keep `data-cfasync="false"` on every script tag in `worker/view.js`.

Infrastructure facts live in the local control plane at
`C:\Users\coldh\Desktop\agent-control-plane\infra\` (never copy their contents into this repository).

A commit is not proof of deployment. After deploying, report it:
`py C:\Users\coldh\Desktop\agent-control-plane\scripts\report_event.py --project earthfield --kind deploy --message "..."`

## Security

Do not place secrets in source control, agent instructions, handoff documents, logs, or generated state. The project needs no credentials; keep it that way unless a decision is recorded.
