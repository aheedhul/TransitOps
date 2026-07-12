# TransitOps — Specification Documents (Index)

> **Read this first.** This directory contains the authoritative design specifications for the
> TransitOps **Intelligent Fleet Operations ERP**. These files are written for **AI coding
> agents** and human engineers alike — every doc is self-contained but cross-references its
> siblings when contracts overlap. No document duplicates content in another; if a concept is
> specified somewhere else, this index tells you where.

---

## 1. Project Positioning (do not reinterpret)

TransitOps is **not** a Transport Management System. It is an **Intelligent Fleet Operations
ERP**: a proactive operations platform that *understands* fleet state and surfaces decisions,
not just records. Every spec below inherits this principle.

**Build context:** Production-ready MVP. Single-tenant deployment today, with
`organization_id` on every table so multi-tenant SaaS is a config lift — not a rewrite.
Target fleet size 50–500 vehicles. Single country, single currency. PWA + responsive web for
all personas including drivers. Offline-first for critical-field writes (trips, fuel logs,
e-POD, pre-trip inspection, maintenance notes).

## 2. Document Map

| # | Document | Owns | When to read |
|---|---|---|---|
| `00` | **README (this file)** | Conventions, glossary, cross-cutting rules | First, always |
| `01` | [System Architecture & Tech Stack](./01-System-Architecture-Tech-Stack.md) | Services, layers, runtime topology, env, observability, DR | Before any module work |
| `02` | [Data Model & Schema](./02-Data-Model-Schema.md) | Entities, columns, indexes, migrations, seed | Before touching the DB |
| `03` | [API Contracts (OpenAPI)](./03-API-Contracts-OpenAPI.md) | REST endpoints, auth, errors, idempotency, pagination | Before writing either side of an endpoint |
| `04` | [Offline-First & Sync](./04-Offline-First-Sync.md) | Local store, service worker, sync engine, conflicts, queues | Before any offline write path |
| `05` | [Business Rules & Validation](./05-Business-Rules-Validation.md) | Server-side rules, dispatch validation chain, kill-switches | Before wiring any state transition |
| `06` | [AI / Copilot / Intelligence](./06-AI-Copilot-Intelligence.md) | Rules engine, Copilot, anomaly detection, summaries, LLM layer | Before building any "smart" feature |
| `07` | [Notifications & Alerts](./07-Notifications-Alerts.md) | Channels, lifecycle, generators, escalations, preferences | Before emitting any user-visible alert |
| `08` | [UI / UX & Design System](./08-UI-UX-Design-System.md) | Layout, components, theming, states, a11y, i18n | Before writing any UI |
| `09` | [Screens & Workflows](./09-Screens-Workflows.md) | Screen-by-screen spec + end-to-end workflows | Before building any screen |
| `10` | [Roles & Security](./10-Roles-Security.md) | RBAC matrix, auth, MFA, audit, tenancy, PII | Before any role-gated code |
| `11` | [Reports & Analytics](./11-Reports-Analytics.md) | KPIs, formulas, exports, scheduled reports, heatmap, CO2/ESG | Before building any statistic |
| `12` | [Telematics & Integrations](./12-Telematics-Integrations.md) | GPS, routing, maps, email/SMS, accounting export, webhooks | Before calling any external service |
| `13` | [Testing & QA Strategy](./13-Testing-QA-Strategy.md) | Unit/integration/e2e plan, fixtures, coverage gates | Before opening a PR |
| `14` | [DevOps & Environments](./14-DevOps-Environments.md) | CI/CD, envs, secrets, monitoring, backup, runbook | Before deploying |
| `15` | [AI Build Order / Phasing](./15-AI-Build-Order-Phasing.md) | Sequenced module breakdown for coding agents | When planning the next sprint |

> Source brief lives at `docs/TransitOps_Fleet_ERP_Blueprint.md`. These docs *supersede* the
> brief where they refine it; where a doc is silent, the brief applies.

## 3. Cross-Cutting Conventions (apply to every doc and every commit)

### 3.1 Naming
- Files: `kebab-case.ts` / `kebab-case.tsx`.
- Components: `PascalCase`. Hooks: `useThing`. Stores: `useThingStore`.
- DB tables: `snake_case`, plural (`vehicles`, `audit_logs`). Columns: `snake_case`.
- API paths: `/api/v1/<resource>`, plurals, lowercase, no trailing slash.
- Enums: SCREAMING_SNAKE_CASE in code, lowercase-with-hyphen wire format (`on-trip`).

### 3.2 Folder layout (frontend)
```
apps/web/
  src/
    app/            # routes (TanStack Router file-based)
    features/       # one folder per domain: vehicles, drivers, trips, ...
      <feature>/
        api/        # hooks (TanStack Query)
        components/
        hooks/
        store/      # Zustand slices
        offline/    # Dexie tables + mutations + sync metadata
        types.ts
    components/     # shared shadcn/ui-based primitives
    lib/            # cross-feature utilities
    styles/         # tailwind config tokens
```

### 3.3 Folder layout (backend)
```
apps/api/
  src/
    modules/        # one folder per domain (mirrors frontend features)
      <module>/
        routes.ts
        service.ts
        repository.ts
        dto.ts
        rules.ts    # business rules (pure functions)
        events.ts   # what this module emits on the event bus
    lib/
      auth/ db/ events/ jobs/ llm/ maps/ notifications/ ...
    middleware/
    main.ts
```

### 3.4 Status grammar (canonical — reuse everywhere)
| Domain | Status enum | Color token | Hex (light) | Hex (dark) |
|---|---|---|---|---|
| Vehicle | `available` | `--status-available` | `#16a34a` | `#22c55e` |
| Vehicle | `on-trip` | `--status-on-trip` | `#2563eb` | `#3b82f6` |
| Vehicle | `in-shop` | `--status-in-shop` | `#d97706` | `#f59e0b` |
| Vehicle | `retired` | `--status-retired` | `#6b7280` | `#9ca3af` |
| Driver | `available` / `on-trip` / `off-duty` / `suspended` | (same as vehicle for matching states) | | |
| Trip | `draft` / `dispatched` / `completed` / `cancelled` | derived semantic per state | | |
| Alert priority | `red` / `orange` / `blue` / `green` | `--alert-*` | per design system | |

Status must be the **only** source of color meaning — never recreate per-screen palettes.

### 3.5 ID strategy
- All primary keys: `id uuid primary key default gen_random_uuid()`.
- All foreign keys are `uuid`. All timestamps are `timestamptz` UTC, stored as UTC, formatted
  in the client using the user's locale.
- Surrogate keys everywhere; natural keys (registration number, license number) are unique
  *constraints*, never primary keys.

### 3.6 Multi-tenancy readiness
Every multi-tenant-owned table has `organization_id uuid not null references organizations(id)`.
The current build is single-tenant — there is exactly one row in `organizations` — but **no
query may be written without an `organization_id` filter** on multi-tenant tables. See
`10-Roles-Security.md` §Tenancy.

### 3.7 Soft deletes
Every table has `deleted_at timestamptz null`. Repository functions append
`and deleted_at is null` by default. Hard deletes are forbidden at the app layer; an admin
purge job may `deleted_at`-vacuum after the audit retention window. See
`10-Roles-Security.md` §Retention.

### 3.8 Units
- Storage unit is **metric**. Distances in kilometres, fuel in litres, weights in kilograms,
  costs in the tenant's `currency_code`.
- UI offers a display toggle (km/mi, L/gal, kg/lb) — see `08-UI-UX-Design-System.md` §Units.
- Conversions happen at the presentation layer only; storage stays metric.

### 3.9 Time
- All server timestamps UTC ISO-8601 with explicit offset (`Z`).
- Local input on the client is converted to UTC before transmission.
- Trips carry `planned_departure_at` and `planned_arrival_at` in UTC; the client renders in
  the trip's destination timezone if known, else user timezone.

### 3.10 Error envelope
```jsonc
// Every non-2xx response uses this shape (see 03-API-Contracts-OpenAPI.md)
{
  "error": {
    "code": "VALIDATION_FAILED",          // stable machine code
    "message": "Cargo weight exceeds vehicle max capacity", // human string
    "details": [                          // optional, field-level
      { "field": "cargo_weight", "code": "OVER_CAPACITY", "message": "..." }
    ],
    "trace_id": "01HN..."                 // always present, log-correlated
  }
}
```

### 3.11 Event-driven side effects
State-changing services do **not** write notifications/audit/anomaly flags inline. They emit
domain events on an in-process event bus (`lib/events`). Subscribers handle AuditLog,
Notification, FuelAnomaly, MaintenanceSchedule, DriverScoreHistory. See
`01-System-Architecture-Tech-Stack.md` §Event spine and `07-Notifications-Alerts.md`.

### 3.12 Server-authoritative everything
The client is untrusted. Every rule in `05-Business-Rules-Validation.md` runs server-side;
client-side enforcement is a UX nicety. The `kill-switch` on the Dispatch button is a UI
expression of a server decision — never the only check.

### 3.13 Deterministic before probabilistic
Every "AI" surface is built rules-first. LLM enhancement is a prose wrapper around the same
computed numbers and must degrade gracefully to templated output on timeout / API failure /
offline. See `06-AI-Copilot-Intelligence.md`.

### 3.14 Accessibility floor
WCAG 2.1 AA. Color is never the only signal — the design tokens carry shape, icon, and text.
Form labels are real `<label>`, modals trap focus, all interactive elements are keyboard
reachable within two tabs. See `08-UI-UX-Design-System.md` §Accessibility.

### 3.15 i18n
English is the default, but **no user-facing string is hardcoded**. All strings live in
`messages/<locale>.json` keyed by dotted path; `i18next` is wired. Adding a locale is a data
file, not a code change.

### 3.16 No slop
- No `console.log` outside odyssey/dev branches.
- No TODO/FIXME merged to trunk without a linked issue.
- No defensive boilerplate for impossible states — validate at the boundary then trust types.
- No duplicate near-identical blocks; if you wrote it twice, extract it.
- JSDoc on exported APIs only, and only where the contract isn't obvious from types.

## 4. Glossary

| Term | Meaning |
|---|---|
| **Asset** | Any tracked vehicle. |
| **Command-Center** | The persona-agnostic operational dashboard view (formerly the "Dashboard"). |
| **Dispatch** | Transitioning a Trip from `draft` to `dispatched`, which flips vehicle + driver to `on-trip`. |
| **e-POD** | Electronic Proof of Delivery — photo + signature + recipient metadata captured at completion. |
| **Health Score** | Composite 0–100 score per vehicle from fuel/maintenance/safety/utilization sub-scores. |
| **Kill-switch** | UI-disabled submit button whose disabled state is driven by a server-computed validation chain. |
| **Lead-time** | Distance remaining before a predicted maintenance due. |
| **Operation** | Any state-changing user/system action (dispatch, complete, maintain, CRUD). |
| **Org** | The tenant. RLS-implicit in all queries. |
| **Pre-trip inspection** | Mandatory driver checklist before a trip is dispatched. |
| **Replay queue** | The offline mutation buffer that re-applies client writes on reconnect. |
| **Rolling average** | EWMA with α=0.3 by default; per-vehicle fuel consumption baseline. |
| **Rules engine** | The deterministic Intelligence layer that produces scores, flags, and recommendation stems. |
| **Sync** | The act of draining the replay queue and pulling fresh server state. |
| **Telematics** | GPS/OBD/IoT signal ingestion from a device or the driver PWA. |
| **Timeline** | The per-vehicle merged chronological feed (Trips + Maintenance + Fuel + Audit). |
| **Twin (Digital)** | Compact per-vehicle colored state chip used on the Command Center grid. |

## 5. Personas (used for justification in every doc)

| Persona | Why they exist | Primary screens |
|---|---|---|
| Admin | All users + role administration + audit + settings | Users, Audit Log, Settings |
| Fleet Manager | Owns vehicles, trips, maintenance, dispatch decisions | Command Center, Vehicles, Trips, Maintenance, Map |
| Driver | Operates trips, completes e-POD, runs pre-trip inspection | My Trips, Pre-Trip, e-POD |
| Safety Officer | License validity, driver scoring, compliance | Drivers, Driver Score, Notifications |
| Financial Analyst | Cost, fuel anomalies, ROI, ESG | Reports, Fuel & Expense, Customer Profitability |

## 6. How to consume these docs as an AI agent

1. Always start here. Always.
2. Open `15-AI-Build-Order-Phasing.md` to know which slice you own this sprint.
3. Read `01` for the system boundary and `10` for who-can-do-what.
4. Read the domain-specific doc(s) for your slice (`09`Screens + the relevant `XX-...`).
5. Open `02` for your entities' columns and `03` for your endpoints' contracts.
6. If your work crosses offline, read `04`. If it crosses decisions/intelligence, read `06`.
7. Before raising a PR: open `13` for what tests you owe and run the lint/type gate.
8. Never invent contracts that contradict an existing doc — open a question instead.