# TransitOps — Intelligent Fleet Operations ERP
### Full Project Blueprint (Hackathon Build Reference)

> **Positioning statement:** We are not building a Transport Management System. We are building an **Intelligent Fleet Operations ERP** — software a logistics company would actually pay for. Every screen should look like it belongs in a product demo, not a hackathon prototype.

---

## Table of Contents

1. [Vision & Positioning](#1-vision--positioning)
2. [Personas — Who Uses What](#2-personas--who-uses-what)
3. [Tech Stack](#3-tech-stack)
4. [Data Model](#4-data-model)
5. [Mandatory Core Modules](#5-mandatory-core-modules-non-negotiable)
6. [Mandatory Business Rules](#6-mandatory-business-rules)
7. [Tier 1 — Standout / Command-Center Features](#7-tier-1--standout--command-center-features)
8. [Flagship Feature — Fleet Copilot](#8-flagship-feature--fleet-copilot)
9. [Tier 2 — Nice-to-Have Polish](#9-tier-2--nice-to-have-polish)
10. [Engineering & Security Standards](#10-engineering--security-standards-non-negotiable)
11. [UI/UX Design Guidelines](#11-uiux-design-guidelines)
12. [Screen-by-Screen Breakdown](#12-screen-by-screen-breakdown)
13. [Key Workflows](#13-key-workflows)
14. [Suggested Build Order (Priority Map)](#14-suggested-build-order-priority-map)
15. [Git & Submission Hygiene](#15-git--submission-hygiene)
16. **[⚠ Important Note on Code Quality](#16--important-note-on-code-quality)**

---

## 1. Vision & Positioning

Logistics companies still run fleet operations on spreadsheets and paper logbooks. This causes scheduling conflicts, underutilized vehicles, missed maintenance, expired licenses, inaccurate expense tracking, and poor visibility for management.

TransitOps digitizes the full lifecycle of transport operations — vehicle registration, driver management, dispatch, maintenance, fuel/expense tracking, and analytics — into a single centralized platform. The differentiator is that it doesn't just **record** operations, it **understands** them: flagging risk before it becomes downtime, recommending the right vehicle instead of making a manager guess, and explaining *why* a decision was blocked instead of silently rejecting it.

**Design philosophy:** proactive, not reactive. The system should tell the manager what needs attention — not wait to be asked.

---

## 2. Personas — Who Uses What

| Persona | Core Need | Primary Screens |
|---|---|---|
| **Fleet Manager** | Oversee fleet assets, maintenance, vehicle lifecycle, operational efficiency | Command Center Dashboard, Vehicle Registry, Interactive Fleet Map, Fleet Health Score |
| **Driver** | Create trips, get assigned vehicles, monitor active deliveries | Trip Management, Smart Dispatch Assistant |
| **Safety Officer** | Ensure driver compliance, license validity, safety scores | Driver Management, Driver Score, Notification Center (license alerts) |
| **Financial Analyst** | Review expenses, fuel consumption, maintenance cost, profitability | Fuel & Expense, Reports & Analytics, Fuel Anomaly Detection, Vehicle ROI |

Every feature below is tagged with the persona it primarily serves — use this to justify feature choices to judges ("this isn't decoration, it's built for the Safety Officer role your own spec defined").

---

## 3. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Tailwind CSS | Fast to build, matches team's existing stack |
| Charts | Recharts | Utilization trends, fuel analytics |
| Maps | Leaflet (OSM) or Google Maps JS SDK | Live fleet map + route intelligence |
| Backend | Node.js + Express | REST API, matches team's existing stack |
| Database | PostgreSQL (via Supabase) | Relational integrity for allocation/status rules |
| Auth | JWT + RBAC middleware | Role-gated routes and UI |
| AI layer (optional) | FastAPI + Groq/Gemini, or pure rules-engine | See Section 8 — rules-based is safer and faster to ship; LLM layer is a stretch add-on |
| Realtime | Polling (short interval) or Supabase Realtime / WebSocket | Powers "live" KPI cards and fleet map without over-engineering |

---

## 4. Data Model

### Core entities (mandatory)
- **User** — id, name, email, password_hash, role (Admin / Fleet Manager / Driver / Safety Officer / Financial Analyst), status
- **Vehicle** — id, registration_number (unique), name/model, type, max_load_capacity, odometer, acquisition_cost, acquisition_date, status (Available / On Trip / In Shop / Retired), location (lat/lng, latest known)
- **Driver** — id, name, license_number, license_category, license_expiry_date, contact_number, safety_score, status (Available / On Trip / Off Duty / Suspended)
- **Trip** — id, source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status (Draft / Dispatched / Completed / Cancelled), dispatched_at, completed_at, final_odometer, fuel_consumed
- **MaintenanceLog** — id, vehicle_id, type (e.g., Oil Change), description, status (Active / Closed), created_at, closed_at
- **FuelLog** — id, vehicle_id, liters, cost, date
- **Expense** — id, vehicle_id, type (toll, misc), amount, date

### Supporting entities (added for standout features — none of these are optional, see Section 7–10)
- **AuditLog** — id, user_id, action, entity_type, entity_id, old_value (JSON), new_value (JSON), timestamp
- **Notification** — id, user_id (nullable = broadcast to role), type, priority (red/orange/blue/green), message, read (bool), created_at
- **MaintenanceSchedule** — id, vehicle_id, predicted_due_odometer, predicted_due_date, basis (rule used), status
- **DriverScoreHistory** — id, driver_id, date, safety_score, trips_count, late_trips, fuel_rating, overall_score
- **VehicleHealthScore** — id, vehicle_id, computed_at, fuel_efficiency_pct, maintenance_pct, driver_safety_pct, utilization_pct, overall_score
- **FuelAnomalyFlag** — id, fuel_log_id, expected_consumption, actual_consumption, deviation_pct, flagged_at

> Vehicle Timeline (Feature in Section 7) does not need its own table — it's a computed feed built by querying Trip, MaintenanceLog, FuelLog, and AuditLog for a given vehicle_id, ordered by timestamp.

---

## 5. Mandatory Core Modules (non-negotiable)

These come directly from the original problem statement. Nothing in this document replaces them — every standout feature below is built *on top of* this foundation.

1. **Authentication** — email/password login, RBAC, only authenticated users access the app.
2. **Dashboard** — KPIs: Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization (%). Filters by vehicle type, status, region. *(Superseded visually by the Command Center Dashboard in Section 7, but every KPI listed here must still be present.)*
3. **Vehicle Registry** — CRUD with Registration Number (unique), Name/Model, Type, Max Load Capacity, Odometer, Acquisition Cost, Status.
4. **Driver Management** — CRUD with Name, License Number, License Category, License Expiry Date, Contact Number, Safety Score, Status.
5. **Trip Management** — create trips (source, destination, vehicle, driver, cargo weight, planned distance). Lifecycle: Draft → Dispatched → Completed → Cancelled.
6. **Maintenance** — create maintenance records; adding one auto-switches vehicle to In Shop and removes it from the driver's selection pool.
7. **Fuel & Expense Management** — fuel logs (liters, cost, date) and expenses (tolls, maintenance); auto-computed total operational cost (Fuel + Maintenance) per vehicle.
8. **Reports & Analytics** — Fuel Efficiency (Distance/Fuel), Fleet Utilization, Operational Cost, Vehicle ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost. CSV export mandatory, PDF optional.

---

## 6. Mandatory Business Rules

- Vehicle registration number must be unique.
- Retired or In Shop vehicles must never appear in dispatch selection.
- Drivers with expired licenses or Suspended status cannot be assigned to trips.
- A driver or vehicle already marked On Trip cannot be assigned to another trip.
- Cargo weight must not exceed the vehicle's maximum load capacity.
- Dispatching a trip automatically sets both vehicle and driver to On Trip.
- Completing a trip automatically resets both vehicle and driver to Available.
- Cancelling a dispatched trip restores vehicle and driver to Available.
- Creating an active maintenance record automatically sets vehicle to In Shop.
- Closing maintenance restores the vehicle to Available (unless retired).

All of these must be enforced **server-side**, not just in the UI (see Section 10).

---

## 7. Tier 1 — Standout / Command-Center Features

These are what turn "a CRUD app that satisfies the spec" into "a platform that looks like it could be sold." Each merges overlapping ideas from all source material into one canonical spec so nothing is built twice.

### 7.1 Command Center Dashboard
Replace flat KPI cards with an operations-center feel:
- Left/top: live counts — 🚚 Total Vehicles, 🟢 Available, 🟠 Maintenance, 🔴 On Trip.
- Alert strip: "License expires tomorrow," "Truck TN09AB1234 overdue," "Fuel efficiency dropped 18%," "Vehicle overloaded yesterday."
- Right rail panels: Today's Trips, Live KPIs, Maintenance Queue, Recent Alerts, Upcoming Expiries, Recent Expenses, Recent Dispatches.
- **Auto-refreshing** (poll every 10–15s or push via websocket) so numbers visibly update while judges watch — this alone signals "production-ready" over "static prototype."
- Persona: Fleet Manager (primary), all roles (secondary view).

### 7.2 Smart Dispatch Assistant
When creating a trip, don't make the manager pick a vehicle/driver blind. Recommend one:
- "Recommended Vehicle: Truck 12 — ✔ nearest ✔ available ✔ fuel efficient ✔ maintenance due in 1200km — Confidence 94%."
- Recommendation logic: filter to Available vehicles with capacity ≥ cargo weight, rank by proximity (if using Route Intelligence), fuel efficiency history, and maintenance headroom.
- **Kill-switch enforcement**: if the only path forward violates a business rule (expired license, suspended driver, overloaded cargo), the Dispatch button is **disabled outright** with an inline reason shown — never a silent rejection after submit. This is a UX expression of the mandatory business rules in Section 6, not a separate feature to skip.
- Persona: Driver, Fleet Manager.

### 7.3 Predictive Maintenance Alerts
Rules-based, not LLM-based ("looks like AI, actually simple" — and more reliable to demo):
- `IF mileage_since_last_service > threshold (e.g. 5000km) AND no maintenance logged → flag "Recommended Service"`.
- Store the computed prediction in `MaintenanceSchedule` (predicted_due_odometer / predicted_due_date) so it can be shown on the dashboard, the vehicle detail page, and feed into Fleet Copilot (Section 8).
- Label it clearly as **"Recommended by Fleet Intelligence"** in the UI — sets expectation correctly without overclaiming AI.
- Persona: Fleet Manager, Financial Analyst.

### 7.4 Fuel Efficiency Anomaly Detection
- On each new fuel log, compare actual consumption (liters per km) against that vehicle's historical rolling average.
- If deviation exceeds a threshold (e.g. >15–20%), write a `FuelAnomalyFlag` and surface it on the dashboard alert strip and the Reports screen.
- This is what makes the Financial Analyst persona *functional* rather than decorative — it directly answers "is this vehicle costing us more than it should."

### 7.5 Fleet Health Score
Composite score per vehicle, color-coded:
- Overall score (e.g. 94/100) broken into sub-scores: Fuel Efficiency, Maintenance, Driver Safety, Utilization.
- Computed periodically (e.g. on each dashboard load or nightly job) and stored in `VehicleHealthScore`.
- Displayed on the Vehicle Detail page and as a compact badge in the Vehicle Registry list.

### 7.6 Driver Score
- Per-driver: Safety Score (already a mandatory field), Trips completed, Late Trips, Fuel Rating, Overall Score.
- Stored historically in `DriverScoreHistory` so trends can be charted, not just a single snapshot.
- Ties directly into Smart Dispatch's ranking logic (7.2) and Safety Officer's compliance view.

### 7.7 Interactive Fleet Map
- Map view (Leaflet/OSM or Google Maps) showing live vehicle pins color-coded by status: 🟢 Available, 🔵 On Trip, 🟠 Maintenance.
- Click a pin → popup with vehicle details, current driver, current trip, fuel level.
- This is the single most visually striking feature for a live demo — prioritize it if only one map-related feature gets built.

### 7.8 Route Intelligence
- When creating a trip, instead of manually typing planned distance, call a maps/routing API (OSRM/Leaflet Routing Machine or Google Directions) using source + destination to auto-fill distance, estimated travel time, and estimated fuel cost.
- Directly satisfies the hackathon's "avoid static data" requirement — this is genuinely dynamic, externally-sourced data, not a hardcoded number.
- Distinct from 7.7: this is per-trip route calculation, the map view is fleet-wide live status. Both can share the same map component.

### 7.9 Vehicle Timeline
- Per-vehicle chronological feed: Purchased → Trip #54 → Fuel → Maintenance → Trip #61 → Tyre Replacement → Trip #75 → Inspection → Current Status.
- Computed by merging Trip, MaintenanceLog, FuelLog, and AuditLog records for that vehicle_id (no dedicated table needed — see Section 4 note).
- Displayed as a vertical timeline component on the Vehicle Detail page.

### 7.10 Notification Center (merges "Notification Center" + "Automatic Alerts")
- Bell icon with unread badge. Feed of system-generated alerts: license expiring, maintenance overdue, trip completed, driver assigned, fuel anomaly, vehicle unavailable.
- Priority color coding (red = urgent, orange = warning, blue = info, green = success).
- Mark-as-read, and these events are proactively generated by the backend (e.g., a nightly/interval job scanning for expiring licenses) — not just logged reactively when a user does something.
- This is also where License Expiry Reminders (originally a bonus feature in the source problem statement) lives — it's a notification type, not a separate subsystem.

### 7.11 Detailed Audit Trail
- Every critical action (dispatch, complete trip, maintenance approval, status change) writes to `AuditLog`: user ID, timestamp, action, entity affected, old value, new value.
- Admin-facing screen: filterable table — Who / When / Action / Old Value / New Value.
- This is a genuine differentiator: almost no hackathon team builds real accountability logging. It directly demonstrates the "Security & Resilience" positioning the team is leaning into given their cybersecurity background.

### 7.12 Business Rules Visualization
- When a dispatch is attempted, show an animated step-through of the validation chain: Vehicle Available? → Driver Available? → License Valid? → Cargo OK? → Dispatch.
- Each step lights up green (pass) or red (fail, with the blocking reason shown inline).
- Judges rarely see business logic made visible like this — it turns an invisible backend check into a demo moment.

### 7.13 Fleet Utilization Heatmap / Timeline View
- On the Reports screen, instead of only pie/bar charts, show a heatmap or horizontal timeline of fleet availability across the day (which vehicles were in use, when).
- More intuitive for a Fleet Manager to scan than aggregate percentages alone.

### 7.14 Fleet Digital Twin
- Compact, live, animated status grid — one row/icon per vehicle, colored dot showing current state, updating in place as trips dispatch/complete.
- Distinct from the Interactive Fleet Map (7.7): this is a dense list/grid view, not geographic — useful as a secondary widget on the Command Center Dashboard for fleets too large to scan on a map at a glance.

---

## 8. Flagship Feature — Fleet Copilot

**If the team can only build one "wow" feature end-to-end, build this one.**

On the Vehicle Detail page, instead of just showing raw stats, generate a written operational analysis for that specific vehicle:

```
Truck TN09AB1234

Utilization: 91% (above fleet average)
Fuel efficiency has dropped 14% over the last 5 trips.
Maintenance is due in approximately 420 km.
Driver Ravi has completed 38 trips with no safety violations.

Recommendation: Schedule preventive maintenance this weekend
to avoid unplanned downtime.
```

**Why this is the highest-leverage feature:** it's not a new subsystem — it's a synthesis layer that reads from data you're already computing (Fleet Health Score 7.5, Predictive Maintenance 7.3, Fuel Anomaly Detection 7.4, Driver Score 7.6) and turns it into a single human-readable recommendation. It can be built as:
- **Rules-based (safe default):** a template that fills in the numbers and picks a recommendation from a small decision table based on which thresholds are breached. Fast, deterministic, zero API risk during a live demo.
- **LLM-enhanced (stretch, given the team's RAG/LLM background):** pass the same computed numbers to an LLM call (Groq/Gemini, matching prior project experience) to generate the prose. Only add this once the rules-based version works — it's a wrapper around real data, not a replacement for it.

This single feature is what most directly proves the "turn operational data into decisions, not just display records" pitch to judges.

**Related, optional, separate feature — do not conflate with the above:**
- **Natural-language dashboard query**: a chat box where a manager can type "which vehicles need maintenance this week" and get an answer generated from live DB data. This is a different capability (open-ended Q&A vs. a fixed per-vehicle summary) and is meaningfully harder (requires safe query generation against the DB). Treat as a stretch add-on only after Fleet Copilot and the "Generate Today's Report" summary (8.1 below) are working.

### 8.1 AI / Rule-Based Operations Summary
- A "Generate Today's Report" button on the dashboard producing a short daily digest:
  > Today: 42 trips completed, 3 maintenance requests, 1 overdue vehicle, fuel cost up 7%, 2 driver licenses expiring this week.
  > Recommendations: Schedule maintenance for Truck 21. Assign more vehicles to South Region.
- Same underlying approach as Fleet Copilot (template/rules first, LLM prose optional) but scoped to the whole fleet instead of one vehicle. Build this and Fleet Copilot from the same summarization logic to avoid duplicate work.

---

## 9. Tier 2 — Nice-to-Have Polish

Build these only after everything in Sections 5–8 is functioning — they're cheap, visible wins, not core differentiators.

| Feature | Description | Notes |
|---|---|---|
| Universal Search | One search bar across Vehicles, Drivers, Trips, Registration, License, Expense | Also fulfils original spec's "search, filters, sorting" bonus item |
| Maintenance Calendar | Calendar view: Today – Truck 12 Oil Change, Tomorrow – Van 6 Inspection, Friday – Truck 2 Brake Check | Pairs with Maintenance module |
| QR Code per Vehicle | Generate a QR code that opens that vehicle's detail page when scanned | Nice physical/demo touch |
| Fuel Analytics Charts | Weekly/monthly, per-vehicle, per-driver, most/least fuel-efficient | Feeds Reports screen, complements Fuel Anomaly Detection |
| Dark Mode | Full theme toggle | Listed as a bonus feature in the original spec too |
| Keyboard Shortcuts | `N` = New Vehicle, `T` = New Trip, `/` = Search | Small "enterprise feel" touch |
| Explain Every Metric | Click a KPI (e.g. Fleet Utilization) → popup shows the formula used | Builds judge trust in the dashboard numbers |
| Beautiful Empty States | "🚚 No Vehicles Yet — Register your first vehicle" instead of a bare "No Data" | Cheap UX polish |
| Offline Mode | Banner + local caching when connection drops, auto-sync on reconnect | Matches the original spec's "plan for offline / don't rely entirely on cloud" guidance |
| Vehicle Document Management | Attach insurance/registration documents to a vehicle record | Listed as a bonus item in the original spec |
| Graceful API Failure Handling | If Maps/routing API times out, show a friendly "Service currently unavailable" state instead of a blank/broken UI | See Section 10 — treat as a hard requirement, not optional polish |

---

## 10. Engineering & Security Standards (non-negotiable)

The team's cybersecurity background is a real edge — most hackathon teams ignore this entirely. Lean into it explicitly:

- **Server-side validation on everything.** Never trust the frontend. Cargo weight, fuel cost, all numeric fields must be re-validated and sanitized on the backend before touching the database — reject negative fuel costs, over-capacity cargo, malformed input, regardless of what the UI already blocked.
- **Input sanitization.** Treat all incoming request bodies as untrusted; sanitize strings, enforce types and ranges server-side.
- **Graceful failure modes.** Any external API call (maps, routing, LLM) must be wrapped so a timeout or failure shows a clear "Service currently unavailable" UI state — never a blank screen, console error, or broken layout.
- **Audit trail as accountability, not decoration.** Section 7.11 isn't just a feature — treat every state-changing action as something that must be logged with who/when/what changed.
- **RBAC enforced server-side**, not just hidden UI elements — a Driver's token should not be able to call an Admin-only endpoint even if they guess the URL.

---

## 11. UI/UX Design Guidelines

- **Consistent color system:** status colors are fixed and reused everywhere (🟢 Available/Good, 🟠 Maintenance/Warning, 🔴 On Trip/Urgent, 🔵 Info/Completed). Don't reinvent color meaning per screen.
- **Navigation:** persistent left sidebar (Dashboard, Vehicles, Drivers, Trips, Maintenance, Fuel & Expense, Reports, Notifications, Audit Log, Settings), consistent spacing, active-state highlighting.
- **Responsiveness:** every screen must degrade cleanly to tablet/mobile widths — collapse sidebar to icons, stack KPI cards.
- **Live-feeling UI:** wherever data is "live" (dashboard KPIs, fleet map, notification bell), use subtle auto-refresh or websocket updates rather than requiring a manual page reload — this is what makes the platform *feel* like production software during a demo.
- **Empty and loading states** are designed, not default browser blanks (see 9. Beautiful Empty States).
- **Forms validate inline** as the user types (e.g., cargo weight vs. selected vehicle's max capacity), in addition to the server-side check in Section 10.

---

## 12. Screen-by-Screen Breakdown

1. **Login / Signup** — email+password, RBAC-aware redirect post-login.
2. **Command Center Dashboard** (7.1) — KPI strip, alert strip, side panels, Fleet Digital Twin widget (7.14), "Generate Today's Report" button (8.1).
3. **Vehicle Registry** — list/grid with Fleet Health Score badge (7.5) per row, filters, search, CRUD, QR code (Tier 2) per vehicle.
4. **Vehicle Detail** — Vehicle Timeline (7.9), Fleet Copilot analysis (Section 8), Health Score breakdown, Predictive Maintenance status, documents (Tier 2).
5. **Driver Management** — list/CRUD with Driver Score (7.6) column, license expiry highlighting.
6. **Trip Management** — create trip form with Route Intelligence auto-fill (7.8), Smart Dispatch Assistant recommendation (7.2), Business Rules Visualization on dispatch attempt (7.12), kill-switched Dispatch button.
7. **Interactive Fleet Map** (7.7) — standalone screen or dashboard widget.
8. **Maintenance** — active/closed records, Maintenance Calendar (Tier 2), Predictive Maintenance flags (7.3).
9. **Fuel & Expense** — log entry forms, Fuel Anomaly flags (7.4) surfaced inline.
10. **Reports & Analytics** — Fuel Efficiency, Utilization, Operational Cost, ROI, Utilization Heatmap (7.13), Fuel Analytics charts (Tier 2), CSV export, "Explain this metric" tooltips (Tier 2).
11. **Notification Center** (7.10) — bell dropdown + full notifications page.
12. **Audit Log** (7.11) — Admin-only filterable table.
13. **Settings** — theme (Dark Mode), profile, notification preferences.

---

## 13. Key Workflows

### 13.1 Dispatch Workflow
`Manager opens Trip Management → enters source/destination → Route Intelligence fills distance/time/fuel estimate → enters cargo weight → Smart Dispatch Assistant recommends a vehicle+driver pair with reasoning → Business Rules Visualization runs the validation chain live → if any check fails, Dispatch button stays disabled with the specific reason shown → on pass, Dispatch → vehicle & driver flip to On Trip → AuditLog entry written → Notification generated if relevant.`

### 13.2 Maintenance Workflow
`Maintenance record created → vehicle auto-flips to In Shop (removed from dispatch pool) → AuditLog entry → on close, vehicle reverts to Available (unless Retired) → Vehicle Timeline updated → if this closes a Predictive Maintenance flag, MaintenanceSchedule status updated.`

### 13.3 Fuel Logging & Anomaly Detection
`Fuel log entered → backend computes consumption rate → compares to vehicle's rolling historical average → if deviation exceeds threshold, FuelAnomalyFlag written → surfaces on Dashboard alert strip + Reports + Notification Center.`

### 13.4 Predictive Maintenance Check
`Scheduled job (or computed on dashboard load) checks each vehicle's odometer since last service → if over threshold with no maintenance logged, write/update MaintenanceSchedule → surfaces as a red dashboard flag and feeds Fleet Copilot.`

### 13.5 Notification Generation
`Interval job (or event-triggered) scans for: licenses expiring within N days, overdue maintenance, overdue returns/trips, fuel anomalies → writes Notification rows scoped to the relevant role(s) → bell badge updates on next poll/refresh.`

### 13.6 Audit Logging
`Any state-changing action (dispatch, complete trip, cancel trip, maintenance create/close, CRUD on vehicle/driver) → middleware or explicit call writes AuditLog with user_id, action, entity, old_value, new_value, timestamp → visible in Audit Log screen, feeds Vehicle Timeline.`

### 13.7 Fleet Copilot Generation
`On Vehicle Detail page load (or on-demand "Analyze" button) → pull VehicleHealthScore, MaintenanceSchedule, FuelAnomalyFlag history, DriverScoreHistory for the assigned driver → run through the rules-based summarizer (optionally pass to LLM for prose) → render the analysis block with a concrete recommendation.`

---

## 14. Suggested Build Order (Priority Map)

This is a reference for sequencing, not a reason to drop anything — every feature above stays in scope regardless of how far down this list the team gets.

**P0 — Core (must work, no exceptions):** Sections 5 & 6 in full — auth/RBAC, all CRUD modules, trip lifecycle with all business rules enforced server-side, maintenance auto-status-flip, fuel/expense cost rollup, reports with CSV export.

**P1 — Standout core (build once P0 is stable):** Command Center Dashboard (7.1), Smart Dispatch Assistant + kill-switches (7.2), Detailed Audit Trail (7.11), Predictive Maintenance (7.3), Fuel Anomaly Detection (7.4), Notification Center (7.10), Business Rules Visualization (7.12), Fleet Copilot (Section 8), Operations Summary button (8.1).

**P2 — High-visual-impact:** Interactive Fleet Map (7.7), Route Intelligence (7.8), Fleet Health Score (7.5), Driver Score (7.6), Vehicle Timeline (7.9), Fleet Digital Twin (7.14), Utilization Heatmap (7.13).

**P3 — Polish (only if time remains):** everything in Section 9 — universal search, maintenance calendar, QR codes, fuel charts, dark mode, keyboard shortcuts, metric tooltips, empty states, offline mode, document management, graceful API failure states.

**P3 stretch (only if the whole team is ahead of schedule):** Natural-language dashboard query (Section 8, related feature note).

---

## 15. Git & Submission Hygiene

The hackathon guidelines explicitly state that one member managing the repo is not enough — judges look at this.

- **Conventional commits**, treating the AI coding agent as a junior engineer whose work you review and commit deliberately: `feat: add maintenance workflow logic`, `fix: enforce cargo weight validation`, `refactor: extract dispatch validation chain`.
- **README.md** documenting: architecture overview, tech stack, environment setup, and how to run the project locally. This is often a tie-breaker for judges assessing "professional readiness."
- Keep commit history meaningful across the build — small, frequent, labeled commits read as real engineering process, not a single giant dump at hour 8.

---

## 16. ⚠ Important Note on Code Quality

**The codebase must read like it was written by a professional engineering team, not generated in one shot by an AI.**

- Comments should explain **why**, not narrate **what** the code obviously already says. No comment on every line, no restating variable names in prose, no leftover scaffolding comments ("// TODO: implement this later" left in a "finished" demo, "// this function does X" above a function called `doX`).
- No AI-slop patterns: no excessive defensive boilerplate for cases that can't occur, no needlessly verbose naming, no repeated near-duplicate blocks that should be a shared function, no inconsistent formatting between files.
- Consistent naming and structure across the whole codebase — if the AI agent generates a module that doesn't match the established folder/naming conventions, adapt it before committing, don't leave it inconsistent.
- Remove all debug `console.log` / `print` statements before the final commit.
- Every team member should be able to explain any block of committed code if a judge asks about it — **understand what the AI agent produced before committing it, don't blindly paste.** This is explicitly one of the hackathon's stated "nice to have" evaluation points.
- Error handling should be real (specific, useful failure states per Section 10), not a bare `try { } catch (e) { console.log(e) }` swallow.

