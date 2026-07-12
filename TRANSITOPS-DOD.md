# TransitOps — Definition of Done Tracker

Tracked against `docs/15-AI-Build-Order-Phasing.md` §14 (project-level DoD).

Updated: 2026-07-12

## Project-Level Gates (docs/15 §14)

| # | Gate | Status |
|---|---|---|
| 1 | Every Phase 0–8 slice implemented and meets acceptance criteria | :red_circle: Phase 0 in progress |
| 2 | Phase 9 stretch slices dark behind flags, dormant in prod | :white_circle: Not started |
| 3 | Merge-readiness checklist (13 §12) passes for every PR | :white_circle: Pending first PR |
| 4 | Performance budgets (13 §8.1, 13 §8.2) met on staging | :white_circle: Not started |
| 5 | All screens light + dark, desktop + mobile, zero visual-regression diffs | :white_circle: Not started |
| 6 | Lighthouse a11y >= 95 across primary screens | :white_circle: Not started |
| 7 | Demo e2e cold-start -> dispatch -> offline -> reconnect -> reports <20 min | :white_circle: Not started |
| 8 | CI pipeline <30 min on vanilla golden PR | :white_circle: CI stubs in place |
| 9 | Runbook catalog verified end-to-end (≥3 drills) | :white_circle: Skeletons written |
| 10 | Docs 00–15 reflect as-built; drift audit notes zero critical mismatches | :white_circle: Pending |

## Phase 0 Gates

| Slice | Acceptance | Status |
|---|---|---|
| `p0_repo_setup` | pnpm workspaces, configs, app skeletons | :green_circle: Done |
| `p0_docker_compose` | docker-compose.yml with PG16, Redis7, MinIO | :green_circle: Done |
| `p0_db_drizzle` | Drizzle + migration engine + healthz table | :green_circle: Done |
| `p0_api_bootstrap` | Express + helmet + cors + /healthz + /readyz | :green_circle: Done |
| `p0_web_bootstrap` | Vite + Router + Tailwind + shadcn/ui + i18next + /login stub | :green_circle: Done |
| `p0_ci` | GitHub Actions PR pipeline stubs | :green_circle: Done |
| `p0_runbooks` | Skeleton runbook files in apps/api/docs/runbooks/ | :green_circle: Done |

**Phase 0 shred metric:** `pnpm install && pnpm db:up && pnpm db:migrate && pnpm seed && pnpm dev && pnpm test && pnpm test:e2e` must run green on a fresh clone.
- [ ] Fully verified (requires Docker for db:up/db:migrate/seed)

## Keys Needed from User

The following keys need real values in `.env.local` for full functionality:

| Key | Source | Required For |
|---|---|---|
| `GROQ_API_KEY` | https://console.groq.com/keys | LLM / Copilot |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey | LLM / Copilot (alt provider) |
| `ORS_API_KEY` | https://openrouteservice.org/dev/#signup | Maps / Routing |
| `GOOGLE_MAPS_API_KEY` | https://console.cloud.google.com/ | Maps / Routing (alt provider) |
| `MAPBOX_TOKEN` | https://account.mapbox.com/access-tokens | Maps (alt provider) |
| `PUSH_VAPID_PUBLIC_KEY` | Run `pnpm infra:gen-vapid` | Web Push notifications |
| `PUSH_VAPID_PRIVATE_KEY` | Run `pnpm infra:gen-vapid` | Web Push notifications |
| `JWT_ACCESS_SECRET` | Generated (already placed in .env.local) | Auth |
| `JWT_REFRESH_SECRET` | Generated (already placed in .env.local) | Auth |
| `SENTRY_DSN_API` | https://sentry.io/signup/ | Error tracking |
| `SENTRY_DSN_WEB` | https://sentry.io/signup/ | Error tracking |

All optional keys default to graceful degradation. The system boots without any of the above.
