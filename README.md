# TransitOps — Smart Transport Operations Platform

**Hackathon Project | 8 Hours | 5-Persona Fleet ERP**

> A centralized platform that digitizes vehicle management, driver assignment, trip dispatch, maintenance tracking, fuel logging, expense management, and operational analytics — replacing spreadsheets and manual logbooks.

---

## 🚀 Quick Start

```powershell
pnpm install
cd apps/api && npx tsx src/main.ts    # Terminal 1 — API on :8080
cd apps/web && npx vite                # Terminal 2 — Web on :5173
```

Open **http://localhost:5173** — login with:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@transitops.demo` | `TransitOps@123` |
| Fleet Manager | `fleet_manager@transitops.demo` | `Demo@123` |
| Driver | `driver@transitops.demo` | `Demo@123` |
| Safety Officer | `safety_officer@transitops.demo` | `Demo@123` |
| Financial Analyst | `financial_analyst@transitops.demo` | `Demo@123` |

**Each role sees only their authorized screens** — login as different users to test RBAC.

---

## 📋 Mandatory Deliverables

| Requirement | Status | Where |
|---|---|---|
| Authentication + RBAC | Done | JWT + Argon2id, 5 roles, capability middleware |
| Dashboard with KPIs | Done | `/dashboard` — Active/Available/In-Shop/On-Trip vehicles, active trips, drivers, fleet status grid |
| Vehicle Registry | Done | `/vehicles` — CRUD, unique registration, type/capacity/odometer/cost |
| Driver Management | Done | `/drivers` — License number/expiry, safety score, status tracking |
| Trip Management | Done | `/trips` — Draft→Dispatch→In-Transit→Complete/Cancel lifecycle |
| Trip Validation Rules | Done | Cannot dispatch with unavailable vehicle, expired license, overweight cargo, suspended driver |
| Maintenance | Done | `/maintenance` — Create log auto-flips vehicle to In-Shop; close restores to Available |
| Fuel & Expense | Done | `/fuel` — 30 logs with anomaly detection; expenses tracked |
| Reports & Analytics | Done | `/reports` — 4 tabs (Fleet, Financial, ESG/CO2, Utilization) |
| CSV Export | Done | Per-report CSV download button |
| Responsive UI | Done | Tailwind, mobile-friendly, light/dark mode |
| Search, Filters, Sorting | Done | Cmd+K command palette, `/` universal search, report filters |

## ⭐ Bonus Features

| Feature | Where |
|---|---|
| Dark mode | Toggle in sidebar header |
| Real-time fleet map | `/map` — Leaflet with vehicle pins (colored by status) |
| AI Copilot | `/vehicles` → Copilot card with deterministic recommendations |
| Offline support | Dexie IndexedDB + service worker + sync engine |
| Web push notifications | VAPID push subscription |
| QR codes per vehicle | Vehicle detail → QR code download |
| Keyboard shortcuts | Cmd+K, `/`, Ctrl+N, Esc |
| Universal search | Vehicles/Drivers/Trips/Customers — 3-char min |
| Digital twin grid | Dashboard → colored status squares for all vehicles |
| Geofences | Depot/customer zones with breach detection |
| ETA tracking | Live ETA computation with delay alerts |

---

## 🏗️ Architecture

```
apps/web (Vite + React 19 + TanStack Router + Tailwind)
    │
    ├── /api/v1/* → Express API (Node 22 + TypeScript)
    │                   │
    │                   ├── Drizzle ORM → Supabase PostgreSQL 16
    │                   ├── Redis (queue/cache/pub-sub)
    │                   └── Event Bus (in-process pub/sub)
    │
    ├── Service Worker (offline cache + push)
    └── Dexie IndexedDB (offline store + outbox queue)
```

**Backend modules** (each with DTO/Repository/Service/Routes/Rules layers):
auth, vehicles, drivers, customers, trips, intelligence, maintenance,
fuel, expenses, notifications, sync, reports, telematics, geofences

**Frontend features**: auth store (Zustand), API client, offline engine,
fleet map, copilot, command palette, notification bell, dark mode

---

## 🔐 Business Rules (Server-Enforced)

| Rule | Enforcement |
|---|---|
| Registration number unique per org | DB unique constraint |
| Retired/In-Shop vehicles excluded from dispatch | `validateDispatch()` rules chain |
| Expired license drivers cannot be assigned | Rules chain — `driver.license_valid` |
| Suspended drivers blocked | Rules chain — `driver.not_suspended` |
| Cargo weight ≤ vehicle capacity | Rules chain — `cargo.within_capacity` |
| Dispatch flips vehicle+driver to On-Trip | Transactional service with events |
| Complete trip restores to Available | `trip.complete` → status flip |
| Cancel restores to Available | `trip.cancel` → status flip |
| Maintenance auto-flips to In-Shop | `maintenance.create` → vehicle status update |
| Close maintenance restores to Available | `maintenance.close` → vehicle status update |

All rules are pure functions in `modules/<x>/rules.ts` — unit-testable.

---

## 📊 Database (25+ tables)

Organizations, Users, RefreshTokens, AuditLogs, Vehicles, Drivers,
Customers, Trips, TripEvents, MaintenanceLogs, MaintenanceSchedules,
FuelLogs, FuelAnomalyFlags, Expenses, Notifications, NotificationRecipients,
VehicleDocuments, VehicleLocations, Geofences, GeofenceEvents,
VehicleHealthScores, DriverScoreHistory, EmissionsRecords,
EmissionsFactors, Settings, SyncIdempotency

All tables use UUID primary keys, soft deletes, `organization_id` for multi-tenancy.

---

## 🧪 Demo Workflow (5 minutes)

1. **Login as admin** → Dashboard shows 12 vehicles, 4 KPIs
2. **Vehicles** → See all 12 vehicles with status colors
3. **Drivers** → 8 drivers with license expiry dates
4. **Trips** → Create → Dispatch (rule chain validates) → View timeline
5. **Reports** → Fleet KPIs, Financial, ESG/CO2, Utilization heatmap
6. **Fleet Map** → 11 vehicle dots across Bangalore
7. **Audit Log** → Every action recorded with actor/entity/timestamp
8. **Toggle dark mode** in sidebar header
9. **Login as driver** → Only sees Dashboard, Vehicles, Trips — sidebar limited

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Router, TanStack Query, Zustand, Tailwind CSS, Leaflet, i18next |
| Backend | Node.js, Express, TypeScript, Drizzle ORM, Zod, Pino, JWT, Argon2id |
| Database | PostgreSQL 16 (Supabase) |
| Offline | Dexie.js (IndexedDB), Service Worker |
| Testing | Vitest, Playwright |

---

## 📂 Project Structure

```
transitops/
├── apps/api/          # Express backend (20+ endpoints)
│   ├── src/modules/   # Domain modules (auth, vehicles, trips, ...)
│   ├── src/lib/       # Auth, events, LLM, maps, realtime
│   └── src/db/        # Drizzle schema, migrations, seed
├── apps/web/          # React frontend (15+ screens)
│   ├── src/routes/    # TanStack Router file-based routes
│   ├── src/features/  # Domain features (trips, fleet, offline, ...)
│   └── src/components/# Shared UI components
├── packages/types/    # Shared TypeScript types
└── docs/              # Design specifications (17 docs)
```

---

## 🔑 Environment

Copy `.env.example` to `.env.local`. Required: `DATABASE_URL` (Supabase connection string). All other keys (LLM, Maps, Push) are optional — the system degrades gracefully without them.

---

## 📝 Git History

13+ conventional commits across 8 phases: scaffolding → auth → CRUD → trips → operations → offline → intelligence → telematics → polish → hardening.
