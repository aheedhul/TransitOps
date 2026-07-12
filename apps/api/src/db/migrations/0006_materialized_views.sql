-- MVP   Materialized Views for Phase 5 Reports

-- 1. Fleet KPIs (updated every 60s by a cron job)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_fleet_kpis AS
SELECT
  (SELECT count(*) FROM vehicles WHERE organization_id = o.id AND deleted_at IS NULL) AS total_vehicles,
  (SELECT count(*) FROM vehicles WHERE organization_id = o.id AND status = 'available' AND deleted_at IS NULL) AS available_vehicles,
  (SELECT count(*) FROM vehicles WHERE organization_id = o.id AND status = 'in-shop' AND deleted_at IS NULL) AS in_maintenance,
  (SELECT count(*) FROM vehicles WHERE organization_id = o.id AND status = 'on-trip' AND deleted_at IS NULL) AS on_trip,
  (SELECT count(*) FROM trips WHERE organization_id = o.id AND status IN ('dispatched', 'in-transit') AND deleted_at IS NULL) AS active_trips,
  (SELECT count(*) FROM trips WHERE organization_id = o.id AND status = 'draft' AND deleted_at IS NULL) AS pending_trips,
  (SELECT count(*) FROM drivers WHERE organization_id = o.id AND status IN ('available', 'on-trip') AND deleted_at IS NULL) AS drivers_on_duty,
  (SELECT count(*) FROM trips WHERE organization_id = o.id AND status = 'completed' AND deleted_at IS NULL AND completed_at >= now() - interval '30 days') AS completed_trips_30d,
  (SELECT coalesce(sum(cost), 0) FROM fuel_logs WHERE organization_id = o.id AND deleted_at IS NULL AND filled_at >= now() - interval '30 days') AS fuel_cost_30d,
  (SELECT coalesce(sum(cost), 0) FROM maintenance_logs WHERE organization_id = o.id AND deleted_at IS NULL AND created_at >= now() - interval '30 days') AS maintenance_cost_30d,
  (SELECT coalesce(sum(amount), 0) FROM expenses WHERE organization_id = o.id AND deleted_at IS NULL AND incurred_at >= now() - interval '30 days') AS expenses_30d,
  now() AS refreshed_at
FROM organizations o;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_fleet_kpis ON mv_fleet_kpis (refreshed_at);

-- 2. Latest Vehicle Health Score (1 row per vehicle)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_vehicle_health_latest AS
SELECT DISTINCT ON (vehicle_id)
  id,
  vehicle_id,
  computed_at,
  fuel_efficiency_pct,
  maintenance_pct,
  driver_safety_pct,
  utilization_pct,
  overall_score,
  signals
FROM vehicle_health_scores
ORDER BY vehicle_id, computed_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_vehicle_health ON mv_vehicle_health_latest (vehicle_id);

-- 3. Latest Driver Score (1 row per driver)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_driver_score_latest AS
SELECT DISTINCT ON (driver_id)
  id,
  driver_id,
  computed_at,
  period_start,
  period_end,
  trips_count,
  late_trips,
  safety_score,
  fuel_rating,
  overall_score
FROM driver_score_history
ORDER BY driver_id, computed_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_driver_score ON mv_driver_score_latest (driver_id);

-- 4. Hourly Utilization (powers heatmap)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_utilization_hourly AS
SELECT
  v.id AS vehicle_id,
  date_trunc('hour', t.dispatched_at) AS hour_bucket,
  count(t.id) AS trip_count,
  coalesce(sum(EXTRACT(EPOCH FROM (coalesce(t.completed_at, now()) - t.dispatched_at)) / 3600), 0) AS active_hours,
  min(v.organization_id) AS organization_id
FROM vehicles v
LEFT JOIN trips t ON t.vehicle_id = v.id
  AND t.deleted_at IS NULL
  AND t.dispatched_at IS NOT NULL
  AND t.dispatched_at >= now() - interval '30 days'
GROUP BY v.id, date_trunc('hour', t.dispatched_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_utilization_hourly ON mv_utilization_hourly (vehicle_id, hour_bucket);
