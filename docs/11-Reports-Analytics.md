# 11 — Reports & Analytics

**Owns:** the canonical KPI definitions, formulas, data sources, refresh cadences, export
formats, scheduled reports, the ESG/CO2 reporting module, customer profitability, and the
explanability-every-metric spec (innovation). Companion docs: `02` (materialized views
+ tables), `06` (Intelligence inputs to scores), `03` (report endpoints), `09` (Reports
screen UI shell).

> **Principle:** every number that appears on a chart, card, or table has a documented
> formula, list of components, and a provenance trace — see `08 §17`. No synthetic numbers.
> Every report must be exportable as CSV (PDF optional behind feature flag) without
> recalculating in the browser.

---

## 1. KPI Definitions (Canonical)

Every KPI has an entry below. The reference lives in `lib/reports/kpis.ts` and is the single
source consumed by the Command Center screen (`09 §3`), reports screens, and the
explainable-tooltip renders.

### 1.1 Fleet KPIs (operational snapshot)
| KPI | Formula | Source | Refresh |
|---|---|---|---|
| **Total Vehicles** | `count(vehicles where deleted_at is null and status in (available,on-trip,in-shop))` | `vehicles` | realtime WS |
| **Available Vehicles** | `count(vehicles where status = 'available')` | `vehicles` | realtime WS |
| **In Maintenance** | `count(vehicles where status = 'in-shop')` or `count(maintenance_logs where status='active')` | `vehicles` & `maintenance_logs` | realtime WS |
| **On Trip** | `count(vehicles where status = 'on-trip')` | `vehicles` | realtime WS |
| **Active Trips** | `count(trips where status in ('dispatched','in-transit'))` | `trips` | realtime WS |
| **Pending Trips** | `count(trips where status = 'draft')` | `trips` | realtime WS |
| **Drivers On Duty** | `count(drivers where status in ('on-trip','available'))` (configurable: counts only active-duty) | `drivers` | realtime WS |
| **Fleet Utilization %** | `(sum(actual_distance_km where status='completed' and completed_at in window) × trips) /(vehicles × hours × avg_nominal_kmh)` — see §1.2 for the canonical definition | `trips` + `vehicles` | MV refreshed hourly + trip events |

### 1.2 Utilization — formal definition
For period `[t0, t1]`:
```
utilization_pct(vehicle_id, period) =
  sum( active_seconds(trip, vehicle) within period ) /
  (length(period in seconds)) * 100
```
where `active_seconds(trip)` = duration from `max(dispatched_at, t0)` to
`min(completed_at, t1)` if trip `completed`/`in-transit`, else `dispatched_at` to `t1`.

Fleet-wide: `avg over vehicles of utilization_pct(vehicle, period)`. Realtime version uses
`on-trip` duration as proxy until complete. **The tooltip spell-out** displays the formula
rendered via MathML:
*Utilization (%) = (Σ active trip duration in period) / (period duration) × 100*, averaged
per-vehicle.

### 1.3 Fuel Efficiency
| KPI | Formula | Source |
|---|---|---|
| **Vehicle KPL** | `sum(distance_km across trips) / sum(fuel_consumed_l)` for window | `trips` + `fuel_logs` |
| **Rolling KPL** | EWMA of per-fill kpl (`06 §3`) | `vehicle_health_signals` cached |
| **Fleet KPL** | `Σ km / Σ liters` over fleet within window | `trips` + `fuel_logs` |
| **Fuel Efficiency Trend** | signed pct Δ of KPL vs rolling baseline | computed |
| **Fuel Cost per km** | `Σ fuel cost / Σ km` per vehicle or fleet per period | `fuel_logs` + `trips` |

### 1.4 Operational Cost
| KPI | Formula |
|---|---|
| **Vehicle Cost (period)** | `Σ fuel_logs.cost + Σ maintenance_logs.cost + Σ expenses.amount where vehicle_id = X and incurred in period` |
| **Cost per km** | `Vehicle Cost / Σ km within window` |
| **Maintenance % of Cost** | `Σ maintenance.cost / Vehicle Cost` |
| **Fuel % of Cost** | `Σ fuel.cost / Vehicle Cost` |

### 1.5 Vehicle ROI
```
ROI (period) = (revenue_amount Σ over completed trips for vehicle) -
              (Σ maintenance_cost + Σ fuel_cost + Σ expenses incurred in period)
              / acquisition_cost × 100
```
Inputs:
- Numerator = `Σ trips.revenue_amount where trip.status='completed' and vehicle=X` minus
  period cost (= §1.4 vehicle cost).
- Denominator = `vehicles.acquisition_cost` (storage numeric).
- Stored as monthly snapshot in `reports.vehicle_roi_snapshot` (table added for ranking
  history). Tooltip shows the formula and the raw components for the selected time window.

### 1.6 Vehicle Health Score
Composite 0–100; see `06 §5.2`. Components:
- `fuel_efficiency_pct` — kpl relative to class bounds, scaled 0–100.
- `maintenance_pct` — `100 - days_overdue*5 - open_issues*10`, clamped 0–100.
- `driver_safety_pct` — avg driver's safety_score weighted by trips on this vehicle.
- `utilization_pct` — §1.2 over last 30 days.

Weights come from `settings.scoring.weights`. The tooltip explains every term.

### 1.7 Driver Score
```ts
overall_score = clamp(
   scoring.driverWeights.safety * safety_score +
   scoring.driverWeights.fuel    * fuel_rating_score +
   scoring.driverWeights.punctuality * punctuality_score, 0, 100);
```
- `safety_score` starts 100; -1 per late trip; -10 per skipped pre-trip; -5 per documented
  vehicle defect complained; penalty clamp at 0.
- `fuel_rating_score` is the driver's recent trips' KPL z-score mapped to 0..100 with class
  mean = 50, sd = 20 (see `06 §5.1`).
- `punctuality_score` = `100 * (1 - late_trips / max(trips_count,1))`.

### 1.8 Customer Profitability
```sql
with per_customer as (
  select customer_id,
         sum(trips.revenue_amount) as revenue,
         sum(allocated_costs)     as costs
  from trips join allocated_costs ac on ac.trip_id = trips.id
  group by customer_id
)
select customer_id, revenue - costs as profit,
       (revenue - costs) / nullif(revenue,0) as margin_pct
```

### 1.9 ESG — CO2 Emissions (innovation)
```ts
co2_kg = (litres * factor_per_fuel[fuel_type]) +
         (kwh_used * grid_factor_for_region)
```
For trips:
- Estimates from `actual_distance_km` × `vehicle_class_avg_kpl` × `factor` if fuel not
  recorded; method=`estimated`.
- Sums per vehicle (per `emissions_records` period-row) and per trip; surfaces in
  Reports → Emissions tab as:
  - **Fleet CO2 (period)** with chart per day/week/month.
  - **Per-vehicle CO2** sorted with sort toggle.
  - **Per-trip CO2** enabled where data permits.
- CO2 per ton-km *intensity* KPI = `total_co2 / total_cargo_tonne_km` (innovation KPI: "how
  efficiently are we delivering cargo?").
- ESG-style "vs target" — admins set `settings.esg.target_co2_per_tkm`; alerts when off.

### 1.10 Anomalies + Cohort Anomalies (lightweight stats)
- Top anomalies table from `fuel_anomaly_flags`, sorted by `deviation_pct`.
- Weekly cohort z-score computation per region + vehicle class for fuel_kpl and
  idle_seconds. Output stored in `reports.cohort_anomalies` (table added).

### 1.11 Idle-time + Geofence Event Reports
- Idle minutes per vehicle per period (sum of `geofence_events where event='idle'`+
  telematics idle seconds, see `12`).
- Idle cost = `idle_fuel_litres * fuel_price` per region (configurable).
- Geofence event count by `event` per vehicle per region.

### 1.12 ETA Reliability (innovation KPI)
- The ratio of `|actual_arrival_at - last_published_eta|` over completed trips.
- Shown as avg minutes deviation + tail (5%/10%); used to assess the ETA worker's value
  add over the static baseline.

## 2. Materialized Views & Snapshot Tables

| Object | Refresh | Used by |
|---|---|---|
| `mv_fleet_kpis` | hourly | Command Center deck cards |
| `mv_vehicle_health_latest` | `on trip.completed`, `maintenance.closed`, `anomaly.fuel.detected`; also nightly | Vehicle Registry badge, Vehicle Detail |
| `mv_driver_score_latest` | on `trip.completed`; nightly | Driver list, Driver Detail |
| `mv_utilization_hourly` | hourly | Reports Utilization + Heatmap |
| `mv_emissions_daily` | daily 02:00 + per trip completion | ESG tab |
| `mv_customer_profitability_monthly` | monthly 1st at 00:30 | Customer Profitability report |
| `mv_cohort_anomalies_weekly` | weekly Sun 02:30 | Anomalies tab |
| `reports_vehicle_roi_snapshot` | monthly | ROI history chart |
| `reports_eta_reliability_snapshot` | daily 03:00 | ETA reliability KPI |

All `refresh materialized view concurrently` (mvs requires unique index). Jobs registered in
`lib/jobs/registry.ts` (`01`).

## 3. Reports Screen Layout (shell — full spec in `09 §12`)

Top filter: date range + (optional per-tab) filters. Each tab a body composed of:
1. **Headline tile(s)** — single number + delta + sparkline.
2. **Primary chart** — line/bar/donut.
3. **Secondary chart** — when useful (e.g., per-vehicle bar).
4. **Detail table** — sortable, full data, with per-row explain-tooltip.
5. **Export** — drop-down: CSV now, PDF now (WkHTMLtoPDF behind flag), XLSX later (stretch).

## 4. CSV Export Contract

- Column header row matches server-side declared header (English default; locale applied
  at the API using `Accept-Language`).
- Decimal separator per browser locale only at download time; server CSV stores `.` and `,`
  for thousands is None (canonical CSV → spreadsheet-friendly).
- First column always the entity id (uuid) for traceability.
- Filename: `<report_id>_<from>_<to>_<org>.csv`.
- All values are server-rendered — never browser-side join of cached data (no drift on
  ships offline; CSV reflects server truth at the moment of generation).
- Exports are submitted as async jobs (`POST /reports/export`) regardless of size; the
  browser downloads the result via signed URL when ready.

## 5. PDF Export (Tier 2 + scheduled)

- Layout: brand header + report title + period + org name; tables only (no chart
  screenshots, deterministic across browsers); signed by the generating user + timestamp.
- Stored in S3; downloadable link emailed (when email channel ships — `07` future) or
  surfaced in `/reports/exports` history panel.
- Optional components: cover page, chart thumbnails rendered server-side via headless Chrome
  (Puppeteer) — focused WkHTML-to-PDF limit kept behind a feature flag to bound heavy load.

## 6. Scheduled Reports

- `POST /reports/schedule` body `{ report_id, period: 'daily'|'weekly'|'monthly',
  channel: 'in-app'|'email'|'object-storage', recipients?: [] }`.
- Scheduled time UTC; push notification `report.scheduled.ready` when generated.
- History UI in `/reports/exports`.
- Per-org cap: 20 schedules (admin) to prevent abuse.

## 7. "Explain Every Metric" Spec (innovation — KPIgängi explainability)

Every metric of every report carries these three elements rendered in the explainable
popover (`08 §17`):

1. **Formula**: prose + MathML render.
2. **Components**: enumerates the raw inputs that produced this specific number (their
   counts/sums/averages), each linked to its row in the underlying data (so a click can
   filter the table to those rows).
3. **Provenance**: which method/materialized view + slice computed this number + the
   `computed_at` timestamp.

This is the **strong** design choice that guards against "AI hallucinated KPI" risk and
builds judge trust — operational data showing its work.

### 7.1 Examples

Utilization tooltip:
> **Utilization (last 30 days): 84%**
> Formula: Σ active trip duration / period duration × 100 (per-vehicle avg)
> Components: 18 vehicles · 12,480 active-hours / 14,880 wall-clock-hours
> Provenance: `mv_utilization_hourly@2026-07-12T02:00Z`

Vehicle ROI tooltip:
> **ROI (Q2): 4.7%**
> Formula: (Revenue - Maintenance - Fuel - Expenses) / Acquisition Cost × 100
> Components (Q2): Revenue ₹1,284,300; M+F+E ₹963,410; Acq ₹6,800,000
> Provenance: `reports_vehicle_roi_snapshot@2026-07-01T00:30Z`

Anomaly tooltip:
> **Deviation 21%** vs rolling baseline 4.31 kpl; actual 3.41 kpl
> Components: 5 prior samples (avg 4.31); threshold entered ≥15%
> Provenance: `fuel_anomaly_flags.id=01HN...`

## 8. Acceptance

- All reports agree with the same numbers across screens — a KPI on the Command Center
  matches the table on the Reports tab for the same period; mismatches are bugs.
- Drill-down: clicking any number on a chart filters the detail table to the entities in
  the numerator; the URL preserves the filter state so it's shareable.
- A report with zero entities (trips, vehicles, customers) does not break — Empty State
  per `08 §9` with a designer-friendly message.
- PDF/CSV export of any tab matches the visible counts and ranges when produced from the
  same params; the export is deterministic given the same params + same DB snapshot (handled
  via the `mv_*` snapshot).
- ESG reports the CO2 in kg, the intensity in gCO2/tonne-km, with the factor source quoted
  for audit.
- "Explain" popovers show the same prose and components across the dashboard and the
  equivalent reports tab — no inconsistencies.