# 09 — Screens & Workflows

**Owns:** the screen-by-screen specification and the canonical end-to-end workflows that
cross multiple screens. Companion docs: `08` (component grammar), `05` (rule chains),
`04` (offline behavior), `06` (intelligence surfaces), `12` (telematics integration).

> Every screen spec below lists: purpose, persona access, route, data sources, primary
> actions, embedded blocks (linked to `08`), edge cases, offline behavior, acceptance. The
> workflows at the end bind the screens together into the user journeys that constitute the
> product's "feel".

---

## 1. App Shell

A persistent shell wraps all authed screens: top bar (logo, organization switcher
[hidden in single-tenant], command menu trigger, search, sync pill `04`, notifications
bell `07`, user menu with theme/role/logout), left sidebar nav `08 §15`, bottom nav for
driver-persona (mobile), content outlet. RBAC gates sidebar items per `10`.

## 2. Login / Signup

### 2.1 Login
- **Route** `/login` (public).
- **Fields** email, password, optional "remember device" (extends refresh to 90d).
- **MFA**: on successful password, if user has `mfa_secret`, show 6-digit code field with
  recovery-code fallback link.
- **Post-login**: redirect to the role's landing screen (Fleet Manager → Command Center,
  Driver → My Trips, Safety Officer → Drivers, Financial Analyst → Reports, Admin →
  Command Center).
- **Failure codes**: `UNAUTHORIZED` → generic "Wrong email or password". Account-locked
  after 5 consecutive fails (15-min cool-off, audit-logged).
- **Offline**: cannot login offline (no token). On network return, app shows "last session
  still valid" path so cached outbox can replay.

### 2.2 Invite/Accept (admin)
Admin-only `/settings/users` → Invite user → email with magic-link accepting into the org
with a role. First-time password set on accept. Audit logged.

## 3. Command Center (Dashboard)

Blueprint §7.1. Replaces flat dashboard with operations-center feel.

### 3.1 Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ KPI strip (4-6 cells): Vehicles / Available / In Shop / On Trip │
│                    / Drivers On Duty / Fleet Utilization %      │
├─────────────────────────────────────────────────────────────────┤
│ AlertStrip (horizontal scroll, dismissable)                     │
├──────────────────────────────────────┬──────────────────────────┤
│ Left/Center (2/3):                   │ Right Rail (1/3):        │
│  - FleetMap (live) mini              │  - Today's Trips         │
│  - DigitalTwin grid (toggle)         │  - Live KPIs             │
│  - Utilization Heatmap mini          │  - Maintenance Queue     │
│                                     │  - Recent Alerts         │
│                                     │  - Upcoming Expiries     │
│                                     │  - Recent Expenses       │
│                                     │  - Recent Dispatches     │
├──────────────────────────────────────┴──────────────────────────┤
│ Copilot.fleet today's report (Generate button)  + Filters chip  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 KPI cards (always visible, even when the dashboard is "decorated")
Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips,
Drivers On Duty, Fleet Utilization %. Filterable by vehicle type, status, region. Each card
is the `08 §5.2 <KpiCard />` with explainable-tooltip (`08 §17`).

### 3.3 Auto-refresh
- WebSocket `kpi` channel pushes delta; snappy in-place update. Poll fallback every 15s.
- The alert strip, today's trips, maintenance queue update via the same channel.

### 3.4 Generate Today's Report
Top-right primary button. Returns the `intelligence/todays-report` payload (`06 §8`); the UI
renders the structured digest + prose; uses `CopilotCard` variant. Refresh button on the
card re-fetches; the server caches on a 1-min CDN.

### 3.5 Driver persona dash variant
Drivers see a single "Today" view: assigned trips (active + upcoming), pre-trip prompt,
their score trend, alerts. None of the panes above.

## 4. Vehicle Registry

### 4.1 Route `/vehicles`. Tables/grid + filters.
**Filters**: type, status (multi-select), region, health score range, search (reg/name/
model). Default sort: status available first then by health score desc.

### 4.2 Columns
Registration | Name/Model | Type | Capacity | Odometer | Health Score Badge | Status | (QR
download on hover). Row click → Vehicle Detail.

### 4.3 Actions
- Primary "New Vehicle" (`N`). Admin/Fleet Manager only.
- Bulk import (CSV) — admin only; dry-run + diff before commit; audit-logged.
- Export (CSV) — saves last filter set into the filename.
- Per-row: Edit, Deactivate (soft delete), Retire.

### 4.4 Empty / Error states per `08 §9`.

## 5. Vehicle Detail

Route `/vehicles/{id}`. Multi-section with tabs on narrow; master-detail on desktop.

### 5.1 Header
Registration + Name/Model + Status pill + Health Score Badge (large, with expanded
breakdown popover incl. `08 §17` explain). Quick actions: Edit, Retire, Print QR.

### 5.2 Tabs
- **Overview** — Fleet Copilot card (`06 §7`) at the top, key stats (acquisition cost,
  current odometer, utilization, latest kpl, maintenance status), Predicted Maintenance
  status chip, latest location mini-map.
- **Timeline** — `<Timeline />` merging trips, maintenance, fuel, audit (filterable by
  type).
- **Health Score** — historical sparkline of `vehicle_health_scores`; sub-score breakdown
  with explainable numbers.
- **Maintenance** — active/closed records; "Create maintenance" button (Fleet Manager+).
- **Fuel & Expense** — logs + anomaly flags surfaced inline.
- **Documents** — Tier 2 file upload, expiry visible.
- **Map** — historical track for the last 24h; today's trip route overlay.
- **Audit** — Admin-only audit scoped to this entity.

### 5.3 Copilot Card placement
Above all other tabs since this is the flagship surface. On-tab render = optimistic preview
from cached signals; on/idle triggers a refetch in background.

## 6. Driver Management

### 6.1 Route `/drivers`. List + filters.
Filters: status, license expiry (expiring soon / expired), score range, search.

### 6.2 Columns
Name | License # | Category | License Expiry (cell goes amber if within 30d, red if past) |
Score | Status. Row click → Driver Detail.

### 6.3 Driver Detail (single-screen drawer or full page)
Overview (contact, license, last 30d trips, score trend chart) + Safety Score breakdown +
Driver Score History sparkline + Assigned Vehicle/Active Trip (if any) + pre-trip
inspections history.

## 7. Trip Management

### 7.1 List `/trips`
Filters: status, driver, vehicle, customer, date range. Default: active trips; tabs for
Draft / Dispatched / In-Transit / Completed / Cancelled.

### 7.2 Trip Create / Edit
**Route** `/trips/new` or drawer. Layout:
1. Route section (source/destination + Auto-fill button).
2. Cargo section (weight + description).
3. Optional customer + planned times.
4. Smart Dispatch section:
   - Vehicle/Driver selectors (manual pick).
   - **`<DispatchRecommendationCard />`** above: top pair + reason chips + alternatives.
   - "Use recommended" button applies; user can override selection.
5. `<RuleVisualizationChain />` below: live-updates as fields change. Each step green/red.
6. **Dispatch button**: bottom right; `disabled={!canDispatch}`; primary failure reason shown
   inline above it; "Override" checkbox appears only when failures are warn-severity (§05).
7. Save as Draft (no vehicle/driver needed) vs. Save & Dispatch (requires all).
8. Pre-trip inspection top alert (drivers): "Pre-trip required before dispatch" → links to
   the inspection form. Pre-trip must pass for dispatch if enabled (`05 §2.4`).

### 7.3 Trip Detail `/trips/{id}`
- Header: route summary, status pill, vehicle/driver chips (click → detail), customer chip.
- Status timeline (per-trip events).
- Live ETA panel (if in-transit): planned + current ETA delta (animated); presents re-route
  suggestion (`06 §10.2`) when one is offered (acknowledge/dismiss buttons).
- Map: route polyline + vehicle position (live).
- Pre-trip inspection record + e-POD record.
- Cost panel: fuel + expenses + maintenance split linked to the trip.
- Audit (admin).

### 7.4 Trip actions
- Dispatch (above). Cancel (requires reason). Start (driver). Add checkpoint (driver).
  Complete (driver; requires odometer + fuel; opens `<PodCapture />`). Reschedule (admin).
  Re-assign vehicle (admin) — re-runs rule chain.

## 8. Driver Live Trip screens (mobile, PWA)

### 8.1 My Trips (Home for driver)
List of today's assigned + recent trips. Each row: route, vehicle reg, status, ETA/in-
progress info, action button contextual (Start / Checkpoint / Complete / Report issue).

### 8.2 Active Trip view
- Top: route summary; large status pill; live ETA countdown.
- Quick-action cards: Next Checkpoint (auto-captures position + odometer photo optional),
  e-POD (opens `<PodCapture />`), Pause, Report Issue (records an `issue_logged` trip
  event with photo).
- Map peek at the bottom (swipe up to expand).

### 8.3 Pre-Trip Inspection flow
- Stack of items (tires, lights, brakes, fluids, mirrors, documents, cargo securement) with
  OK / Defect toggle per item and optional note + photo per item. The list is configurable
  per org via settings.
- Submit: if any defect marked → `passed=false` → must request maintenance (link) before
  dispatch. Otherwise passed.

### 8.4 e-POD capture
- Photo capture (camera first; gallery second).
- Signature canvas (driver + recipient).
- Recipient name + phone (auto-filled from customer contact when known).
- Notes (optional).
- Geolocation captured with bearer accuracy (`geolocation.getCurrentPosition` with
  `enableHighAccuracy:true`, falls back to manual).
- Submit → enqueues offline write (`trips.pod.attach`); shows "Uploading…" card if not yet
  synced; shows green tick when uploaded.

## 9. Interactive Fleet Map

### 9.1 Route `/fleet-map`. Top-level map.
- Live pins color-coded per status; vehicle clusters at low zoom; click → popup with reg,
  type, driver, current trip, ETA, fuel gauge, deep-link to Detail.
- Side panel filter by status/type/region. Toggle "Show only on-trip".
- Toggle "Predicted maintenance overlay" colors vehicles amber-on-pin if flagged.
- Geofences rendered as polygons (faint fill, dashed border).
- Re-route suggestion indicator pops up on the map when present.
- Driver trajectory vector layer available on a per-trip detail (Trip Detail screen).

## 10. Maintenance

### 10.1 Route `/maintenance`. Active queue + closed.
- Active list: vehicle, type, opened date + predicted due; close action opens confirm with
  final odometer input + cost input. Closing triggers `vehicle.status → available`
  (`05 §2.1`) and emits events.
- Closed list (read-only) filters by month.
- Predicted Maintenance panel — top of page; shows `maintenance_schedules` rows with status
  `pending`, sorted by `predicted_due_date`. Each has "Schedule" → opens an "open
  maintenance" form prefilled from the prediction.
- Tier-2 **Maintenance Calendar** view — month grid showing today/tomorrow etc. as
  blueprint §9; reachable via tab toggle.

## 11. Fuel & Expense

### 11.1 Route `/fuel-expense`. Two tabs: Fuel Logs / Expenses.

#### Fuel tab
- List paged; filters by vehicle, date, anomaly only.
- Inline anomaly flag chip + accent left-border when `fuel_anomaly_flags` exists.
- New fuel log form: vehicle (search), trip (auto-fill if vehicle on-trip), liters, cost,
  odometer, fuel_type (default vehicle's).
- Bulk import for back-dated fuel records (admin).
- "Anomalies only" toggle - shows Financial Analyst view of outliers + acknowledge action.

#### Expense tab
- List + form (type, vehicle, trip optional, amount, incurred_at).
- Sum header: total fuel + total expense per vehicle for the filtered date range.

## 12. Reports & Analytics

Detailed in `11-Reports-Analytics.md`; here, screen shape only.

### 12.1 Route `/reports`
- Tabs: Fuel Efficiency | Utilization | Operational Cost | Vehicle ROI | Emissions/ESG |
  Customer Profitability | Driver Score | Anomalies.
- Each tab: filter chip (date range + extra per tab) + chart(s) + table + Export (CSV/PDF).
- **Utilization Heatmap** (`08 §5.2 <Heatmap />`) shows hourly fleet availability grid.
- **Anomaly tab**: clusters + cohort z-score overview (§6 `06 §11`).
- Every chart Number has the explainable-tooltip.
- Scheduled reports: "Schedule weekly" action → registers a `reports.scheduled` job to
  email/upload weekly. (Email channel ships dark — see `07 §2.3` notes.)

## 13. Notification Center

### 13.1 Route `/notifications`.
- Filter rail (priority, type, audience, read/unread, date).
- Grouped/flat toggle (group consecutive broadcasts).
- Bulk actions.
- Per-row deep-link + "Mute this type" inline action.
- Unread count in title tag and shell bell badge persists.

## 14. Audit Log

### 14.1 Route `/audit-logs` (admin only).
- Filters: actor, entity_type, entity_id, action, date range.
- Table: time | actor (with link to user) | action | entity (link to entity) | trace_id |
  old → new (collapsible diff viewer).
- Export CSV/JSON; scheduled export weekly.

## 15. Geofence Manager

### 15.1 Route `/geofences` (fleet_manager/admin).
- List of geofences by region + kind.
- Create / edit: name, region, kind (depot/customer/restricted/yard/charging), drawing on
  a small map (rect/polygon/radius), rules config (enter/exit alert, dwell threshold,
  idle threshold). Save → triggers `geofences.updated` event + audit.

### 15.2 Geofence Events screen
- Filterable list of `geofence_events` (vehicle, geofence, event, duration, time).
- Click into related Geofence, Vehicle, Trip from the row.

## 16. Pre-Trip Inspection Templates (admin)

`/settings/inspection-templates`. Versioned JSON list of items; new active version invalidates
old without deletion. Each item: key, label (i18n), category, optional photo-required flag.
Template versions refer to the org's `settings.pre_trip.template_version`.

## 17. Settings (admin)

`/settings` with sub-sections:
- **Organization**: name, currency, locale, timezone, unit_system, audit_retention_days.
- **Thresholds**: maintenance intervals, anomaly %, license warn days, scoring weights,
  predictive_eta thresholds. Each change is audit-logged; settings diff is shown before
  save.
- **Roles & Users**: invite users, change roles, deactivate.
- **Inspection templates** (above).
- **Geofences** (above).
- **Integrations**: maps provider + key, push VAPID keys, LLM provider + key.
- **Offline**: per-org sync defaults (e.g. paused-after-hours flag, photo upload queue cap).
- **Appearance**: dark mode default for org, brand color (future).

## 18. Account / Profile (`/me`)

- Personal info (name, contact number), password change, MFA enroll/disable + recovery
  codes reveal once + regenerate, notification preferences incl. push subscription
  management (list devices with subscriptions, revoke any).

---

## 19. End-to-End Workflows

These bind the screens into journeys. Each step references its owning screen.

### 19.1 Dispatch Workflow (manager)
1. Open Trip Management (`/trips`) → New Trip (`/trips/new`).
2. Enter source/destination → click "Auto-fill from route" (Route Intelligence).
3. Enter cargo weight + customer + planned times.
4. Smart Dispatch shows recommendation; user accepts or picks manual override; reason
   chips visible.
5. Rule chain lights up live; failures show red inline + Dispatch button disabled.
6. If enabled, driver must have submitted a passing Pre-Trip Inspection (`/trips/{id}/pre-trip`).
7. Dispatch succeeds → vehicle+driver flip to `on-trip`; audit row written; trip
   `dispatched_at`, trip_events `dispatched`; Notification `trip_dispatched` → driver + manager.

### 19.2 Driver Live-Trip Workflow
1. Driver sees assignment on `/me/trips` (notification bell).
2. Opens Trip → Pre-Trip Inspection form (`/trips/{id}/pre-trip-inspection/form`).
3. Submits; if passed → Start enabled. Defects → maintenance request opened; trip stays
   `dispatched` awaiting service (per org policy).
4. Start Trip (driver) → records `trip_events=enroute`, captures location, persists in
   outbox (offline-ok), emits `trip.started`.
5. Active Trip view → Next Checkpoint record each waypoint (offline-ok), live ETA panel
   updates via background job.
6. On rate of progress drop (traffic) → Re-route suggestion surfaces (auto), driver
   acknowledges → route plan updated; notification to manager.
7. Arrival → `<PodCapture />` (photo + signature, recipient info). Submit → `complete`
   pending offline replay.
8. If network is down, after offline period, the metadata+photos sync; final vehicle +
   driver flips to `available`; audit row written.

### 19.3 Maintenance Workflow (manager)
1. Command Center alert: "TN09AB1234 maintenance due 420km" (Predictive).
2. Click → Vehicle Detail Maintenance tab → "Open maintenance" prefilled from prediction.
3. Save → vehicle flips to `in-shop`, dispatch selection excludes it, audit row written,
   notification to dispatch_manager.
4. Track service progress (free-text notes field allowed offline).
5. Close action → enter final cost + odometer + vendor → close it → vehicle back to
   `available` (or remain `retired` if status is retired), `MaintenanceSchedule` updates —
   predicted schedule marked `fulfilled`. Audit row written.

### 19.4 Fuel Logging + Anomaly Detection
1. Driver/Fleet Manager logs fuel entry.
2. Server validates the log, computes KPL against previous fill, runs EWMA, checks
   deviation; writes `fuel_anomaly_flags` if exceeded.
3. Returns response with `anomaly_flag` populated; UI shows chip inline.
4. Notification `fuel_anomaly_detected` to Financial Analyst + driver (via event) — see `07`.
5. Reports screen surfaces anomalies; Financial Analyst can acknowledge with reason.

### 19.5 Predictive Maintenance Check
Periodic job (every hour during working hours) scans each vehicle's `odometer - last_service`
vs thresholds; upserts `maintenance_schedules.status='pending'`.≥7 days due → emits
notification. Surfaces on Command Center alert strip + Vehicle Detail maintenance tab.

### 19.6 Notification Generation Workflow
See `07` — events + scheduled scans produce the row; dispatcher fans out per recipient;
WS + push + bell + Center screen all react.

### 19.7 Audit Logging Workflow
Every state change covered by an event in `01 §4.2`. Every audit row satisfies: who, when,
what changed, trace_id-linked. Visible in `/audit-logs`; on Vehicle/Trip/Driver Detail Audit
tab.

### 19.8 Fleet Copilot Generation Workflow
1. User opens Vehicle Detail → CopilotCard triggers `GET /vehicles/{id}/copilot`.
2. Server collects `VehicleSignals`, runs rules → `StructuredRecommendation`.
3. If flag on + online → LLM adapter rewrites prose (cached 60min by signal hash).
4. Render structured + prose + 'why' drawer sources.
5. User can click recommendation chits (e.g. "Schedule maintenance") to navigate to the
   relevant action with prefilled context.

### 19.9 Organization Onboarding Workflow (admin first-run)
1. Seed creates org + admin + sample dataset.
2. Admin logs in → `/settings/organization` completes name, currency, locale, unit_system.
3. Configure thresholds (or accept defaults).
4. Invite users per role (`/settings/users`).
5. Define regions + geofences.
6. Add vehicles + drivers (or import).
7. Surface pre-built sample dashboard → ready to operate.

### 19.10 Sync Recovery Workflow (driver, after offline period)
1. Driver goes offline mid-trip; sync pill turns amber, with mutation count accumulating.
2. On reconnect: auto-sync triggers; photos upload (overnight if size) → numbers apply
   in-flight visible from pill spinner.
3. If a sync issue surfaces (conflict): pill turns red; tray lists rejected mutation with
   three options (§04 §8.2).
4. Driver chooses to discard local + keep server version OR keep waiting if appropriate.
5. Trip state on screen reflects authoritative server state after resolution.

### 19.11 Geofence Event Workflow (innovation)
1. Telematics stream (driver PWA session or simulator) emits a position to the API.
2. Backend geofence matcher (`12 §5`) detects in/out/dwell/idle.
3. Writes geofence_events row → emits `geofence.event`.
4. Generator fans out notification to fleet_manager (alert severity per rule).
5. Map + Audit surfaces reflect the new event.

### 19.12 ESG/Emissions Reporting Workflow
1. Each trip.complete event triggers emissions_records creation via worker (`11`).
2. Reports screen Emissions tab reads mv or pre-computed aggregates.
3. Export PDF monthly statement; configurable for compliance formats (GHG Protocol).

## 20. Acceptance

- Every screen renders correctly in light/dark, three breakpoints, both iOS PWA + desktop
  Chrome.
- Driver can complete the entire Live-Trip workflow offline; sync resolves within 1 min of
  reconnection without data loss including the signature image.
- Smart Dispatch recommendation matches the dispatch chain outcome for any input — the
  displayed buttons reflect reality.
- Command Center refresh rendered ≥ 5 frames/min without manual refresh; updates feel live.
- Audit log contains one row per state change across the seed script end-to-end.
- Mobile (`<360px`) every primary action reachable within 3 taps from any screen.