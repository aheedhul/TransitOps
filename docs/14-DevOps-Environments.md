# 14 — DevOps & Environments

**Owns:** developer-local setup, environment matrix (dev/test/staging/prod), CI/CD,
secrets, observability end-to-end, backup & restore, runbooks, infra-as-code, container
strategy, and release policy. Companion docs: `01` (architecture), `13` (testing), `10`
(secrets reference), `04` (offline timeouts).

> **Posture:** Twelve-factor. Idempotent migrations. Containerized everything except the
> long-term data tier. Two-way observability — the same metrics mean the same thing in every
> env. Production deploys are PR-gated, timed during business hours, and reversible in under
> 5 minutes.

---

## 1. Local Development

### 1.1 Stack Bring-up
- Repository `transitops`. Monorepo via **pnpm workspaces** with `apps/web`, `apps/api`,
  `apps/sim` (the dispatch simulator), `packages/*/` (shared types, zod schemas, ui kit
  sync via tsup).
- Prerequisites: `pnpm v9`, Node 20 LTS, Docker + Docker Compose v2 (Postgres + Redis +
  MinIO), optional Maven-like local KMS if signing in dev.
- Bringup: `pnpm install && pnpm db:up && pnpm db:migrate && pnpm seed && pnpm dev`. The
  dev script turbo/in parallel: `apps/web:dev` (Vite), `apps/api:dev` (nodemon + ts-node),
  `apps/sim:dev`, plus the docker-compose Postgres/Redis/MinIO.
- Hot reload end-to-end. API on `http://localhost:8080`, web on
  `http://localhost:5173` (Vite proxies `/api/v1` to API).
- First-run seed creates the org, 5 users (one per role), the demo data (per `02 §11`).
  Default login: `admin@transitops.demo` / printed to stdout on first seed (env override
  `SEED_ADMIN_PASSWORD`).

### 1.2 Developer scripts (illustrative)
```
pnpm dev            # api + web + sim hot reload
pnpm db:up          # docker compose up -d postgres redis minio
pnpm db:down        # docker compose down
pnpm db:migrate     # drizzle-kit migrate
pnpm db:seed        # idempotent seed
pnpm openapi:gen    # regenerate openapi.yaml + frontend TS client
pnpm lint           # eslint + prettier check
pnpm typecheck      # tsc --noEmit on workspaces
pnpm test           # vitest unit + integration
pnpm test:e2e       # playwright
pnpm test:a11y      # axe via Playwright
pnpm test:load      # k6 scripts
```

### 1.3 IDE / Lint / Hooks
- ESLint + Prettier config in repo root; typescript-eslint strict; prettier config shared.
- Husky pre-commit: prettier + eslint diff + `tsc --noEmit` (architecture-only).
- `commit-msg` enforces Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`,
  `test:`, `chore:`, `perf:`).
- VSCode workspace settings checked in (formatOnSave, ESLint fix).
- Recommended VSCode extensions file (`.vscode/extensions.json`) shared.

## 2. Environment Matrix

| Env | Purpose | Lifecycle | URL | Data | Observability | Secrets source |
|---|---|---|---|---|---|---|
| local | dev work | per dev | `localhost:5173` / `:8080` | seeded fixture | Pino pretty + Sentry dev | `.env.local` (gitignored) |
| ephemeral | per-PR review apps | spun up on PR | `<pr>--<n>.pr.transitops.dev` | single-tenant seeded fixture for that PR | prometheus sidecar + Loki dev | CI secret manager scoped to PR |
| test | QA suite | permanent | `test.transitops.dev` | refreshed every night from prod-scrubbed snapshot | staging-grade observability | CI secret manager |
| staging | pre-prod mirror | permanent; promote-product approvals | `staging.transitops.dev` | anonymized prod refresh weekly | full observability | cloud KMS + SOPS |
| prod | customer-facing | permanent; blue/green deploy | `app.transitops.dev` | prod data | full observability + alerting | cloud KMS + SOPS |

### 2.1 Single-tenant for v1
All environments above represent one organization (default `transitops-demo`). The
column plumbing is in `10 §3.2`; lift to multi-tenant SaaS is an operational change, not a
code change.

## 3. Container / Orchestration

- Docker Compose for local + ephemeral PR stacks. Single `docker-compose.yml` declares
  Postgres 16, Redis 7, MinIO, the API, the web static bundle in nginx, the simulator.
- Production target: containerized services on Kubernetes (managed EKS/GKE) is the
  recommendation; for MVP we can run via a VM with docker-compose + Nginx as reverse proxy
  + Prometheus node_exporter. **Decision deferred to a production infra review**.
- API is the only long-running state-changing service. Workers run as separate containers
  via BullMQ worker processes (`apps/api/worker` entrypoint sharing `modules/` source).
- Nginx added as edge proxy with TLS termination, gzip, static caching, websocket upgrade.
- PreStop hook drains WS connections 5s before SIGTERM.

## 4. CI/CD Pipeline

CI runs on every PR. CD runs on merge to `main` (test/ephemeral) and on release tag
(staging → prod with explicit approval).

### 4.1 PR pipeline (`pull_request`)
1. Lint + typecheck.
2. Unit + integration tests.
3. Test coverage report → diff gate.
4. Docker build `apps/api` + `apps/web` images → push to registry (cache-by-layer).
5. Ephemeral environment up with seeded fixture.
6. Playwright e2e suite + a11y + visual regression.
7. Performance smoke (postman-lite) on the ephemeral env.
8. Lighthouse CI mobile + desktop.
9. **Definition of merging**: all green + 1 approval. Auto-historical conventional commits
   lint via commitlint.

### 4.2 Continuous Deployment — `main` → test env
On merge to `main`:
1. Same image that passed PR pipeline pulled from registry.
2. Deployed into the `test` cluster via Helm chart `helm upgrade --atomic`.
3. Migration step pre-deploy: `apps/api migrate` with the new image; abort on failure.
4. Smoke tests run against test env.
5. Notifications to chat channel (Slack/Discord) summarizing deploy.

### 4.3 Staging → Prod
- Release tag cut via `release-please` action; Conventional Commits release notes auto-
  generated.
- Manual gate: an "Approve production deployment" GitHub release review.
- Deploy target staging — full test suite + e2e + load smoke; results reviewed/reported.
- Once staging reports pass for ≥30 min, promote-by-tag via `helm upgrade` to prod (rolling
  update with readiness gates).
- All prod deploys are reversible via `helm rollback` to the previous tag (<5 min).

### 4.4 Schema migrations in production
- Migrations shipped in the image (one migration per logical change; see `02 §10`).
- On deploy the migration runs first as an init container with a SA limited to `CREATE
  TABLE`, `ALTER TABLE ADD COLUMN`, etc. — destructive migrations require a manual review
  step (e.g. dropping a column where data relocation has gone out via a prior release).
- A migration is *double-safe* if it can deploy alongside the previous code version (see
  Expand-Contract pattern):
  1. Release N adds column / new table.
  2. Release N writes to both old and new.
  3. Release N+1 deletes old column.
- Contract changes (column rename/drop) require the explicit two-phase release.

## 5. Secrets Management

- **Local dev**: `.env.local`, gitignored. Sample `.env.example` documented in repo with
  all required vars.
- **CI / ephemeral / test**: secrets stored in the CI provider's secret manager (GitHub
  Actions secrets). Each scoped per-env; ephemeral envs have least-privilege keys.
- **Staging + prod**: cloud secret store (AWS Secrets Manager / Google Secret Manager);
  SOPS-age files committed to a separate `infra-secrets` repo (NEVER in app repo).
- The API on boot reads from SOPS or via cloud SDK; secrets cached in memory only until
  rotation. Rotations run quarterly on the most sensitive: DB password, KMS wrapping key,
  JWT signing key, VAPID keys.
- Token-rotation secrets (refresh tokens in DB) live only in the DB; reviewed by an audit
  script weekly for stale family points.

## 6. Observability End-to-End

| Source | Stack | Retention |
|---|---|---|
| API logs | Pino → stdout → Loki (via Promtail) | 30d hot, 90d cold |
| Web logs (errors, RUM) | Sentry | 90d |
| API metrics | Prometheus → Grafana (RED: rate, errors, duration per route) | 30d hot |
| Job metrics | Prometheus (BullMQ exporter custom) + dashboards: queue depth, lag, retries | 30d |
| Traces | OpenTelemetry → Tempo; sampling 100% in test, 10% prod | 14d |
| Synthetic probes | Grafana Synthetic Monitoring + external uptime | 90d |
| DB performance | pg_stat_statements + percona PMM exporter | 30d |
| Container metrics | cAdvisor + node-exporter | 30d |
| Audit archive | S3 object lock immutable | per retention policy (default 365d) |

### 6.1 Alerts
- Severity 1 ( PagerDuty ) = service down, dataLoss imminent, security incident.
- Severity 2 (Slack) = user-facing degradation, partial outage, error rate >2% for 5 min.
- Severity 3 (Slack info) = jobs lagged, anomalies reported, deploys observed.

### 6.2 Dashboards (Grafana)
- API Overview (RED, top endpoints, error breakdown).
- Realtime (WS connection counts, broadcast fan-out lag, Redis pub/sub depth).
- Sync Engine (outbox depth, push/pull throughput, rejection rates, sync issues per
  user).
- Workers (queue depth, processed rate, dead-letter count, anomalies flag rate).
- DB (queries/second, slow query count, replication lag, matview refresh job).
- Maps & LLM (calls/sec, latency p50/p95, failures, cost per call).
- Fleet Operations KPIs (mirroring customer-facing `/reports` for ops).
- Security (login failures mass-pattern, refresh-reuse alerts, audit ingest rate).

## 7. Backup & Restore

### 7.1 RPO + RTO
- DB continuous WAL archive → 5-min RPO; recovery time ≤15 min for hot tier (point-in-time
  recovery via WAL replay).
- Nightly logical backup at 02:00; cross-region copy at 03:00 (≤1h RPO for catastrophic
  region loss; cold archive).
- Object storage (S3): versioning enabled on documents bucket; lifecycle:
  - Hot: 30 days
  - Warm (S3–Intelligent Tiering): 90 days
  - Archive (Glacier Deep Archive) after 90 days for 7 years (compliance audit) — applies
    only to audit-eligible exports.
- Audit log (Postgres `audit_logs`): nightly copy to S3 object-lock; buckets are
  versioned + immutable for the retention period.

### 7.2 Restore testing
- Quarterly PITR drill: restore to a staging cluster; verify data integrity; document
  time-to-restore; spotlight gaps.
- Annual full-region-failure drill assuming total loss: rebuild from nightly + S3 backups;
  acceptable RTO 24h for cold tier.

## 8. Runbooks

Located in `apps/api/docs/runbooks/` (Markdown). Each has a severity tag, owner role,
detection signals, mitigation steps, and escalation contacts.

| Runbook | When |
|---|---|
| `RB-001 DB Out of Connections` | `pg_stat_activity` > max_conn × 0.9 |
| `RB-002 Redis Stream Lag > 60s` | BullMQ lag alert |
| `RB-003 Refresh Token Reuse Detected` | Audit-log alert for `auth.refresh_replay` |
| `RB-004 Sync Engine Outbox Backpressure` | Outbox size >10k entries |
| `RB-005 Maps/LLM Provider Down` | `DOWNSTREAM_UNAVAILABLE` > 5% of calls |
| `RB-006 Web Push Large Failure Rate` | Push fail rate >10% in 5 min |
| `RB-007 Telematics Ingest Worker Stalled` | Heartbeat metric absent >2 min |
| `RB-008 Matview Refresh Job Stalled` | matview >2 refresh cycles behind |
| `RB-009 DB Storage Low` | <20% free |
| `RB-010 Security Incident — Mass Login Failure` | ≥100 failures from one IP in 5 min |
| `RB-011 Migration Rollback` | Schema rollback after broken deploy |
| `RB-012 Notification Spray` | `WORK_IN_PROGRESS` dispatcher pause — see `07` |

## 9. Release Policy

- **Schedule**: deploys during business hours (10:00–15:00 IST) Tue–Thu for staging-to-prod
  unless a Ptch hot-fix is needed.
- **Frequency**: trunk-based development → small frequent merges to main; prod release
  tide as needed; not batched weekly.
- **Communication**: GitHub release notes generated from Conventional Commit messages;
  internal Slack post summarizes the deploy + dashboard snapshot link.
- **Rollback**: Helm rollback to previous tag <5 min; database rollback only via Down
  migrations (verified in PR/CI gate). For migrations without safe Down path, fix-forward
  is preferred (ship a new forward migration).
- **Freeze windows**: holidays + end-of-quarter close freeze for accounting stability.

## 10. Service Accounts / IAM

- API runtime SA: read-write DB, read-redis, S3 R/W documents, KMS-decrypt only.
- Workers SA: only the queues + DB role granted by read-write schema, no S3 credentials
  beyond documents buckets.
- Migration SA: schema-only privileges; scoped to `CREATE TABLE`, `ALTER TABLE ADD COLUMN`,
  `CREATE INDEX`, `CREATE TYPE`. **No** `DROP TABLE` privilege — drops require manual ops
  session with a dedicated elevated role.
- LLM/maps: per-org encrypted secrets in DB (read-only API runtime SA) — never env in prod
  unless required by the provider's registration step.

## 11. Cost & Budget

- Test + ephemeral environments auto-shutdown at non-business hours except the
  long-running test cluster.
- Documentation on infra-as-code sizing targets (MVP): 1 vCPU Postgres, 1 vCPU Redis, 2 vCPU
  API + 1 vCPU worker; autoscale at 70% CPU.
- LLM cost guard: per-org weekly token budget; overage auto-disables the LLM adapter for
  the org (`flags.copilot_llm.enabledFor=false`) with a notification to admins. Reset on
  billing cycle restart.

## 12. Acceptance

- Pivoting from "fresh checkout" → "running test env" within ≤30 min on a developer
  laptop.
- Ephemeral environments come up in <8 min after a PR is opened; destroyed on PR close +
  24h stay window for review.
- Schema migrations succeed in reverse (verify down — checked in CI with `pnpm db:migrate &&
  pnpm db:rollback && pnpm db:migrate`).
- A prod deploy completes script → staging gate → approval → deploy → smoke in <60 min
  total; rollback in <5 min.
- Restoring a staging cluster from PITR to time T-30m works end-to-end and the audit rows
  for that period are intact (the quarterly drill verifies this).
- Every runbook references Grafana dashboard IDs and alert fingerprints; no orphan runbooks.