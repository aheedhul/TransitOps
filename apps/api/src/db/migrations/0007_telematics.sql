-- Phase 6   Telematics tables + materialized view

CREATE TABLE IF NOT EXISTS vehicle_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  heading NUMERIC(5,1),
  speed_kmph NUMERIC(6,1) NOT NULL DEFAULT 0,
  odometer_km NUMERIC(10,2),
  source TEXT NOT NULL DEFAULT 'device',
  trip_id UUID REFERENCES trips(id),
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_location_source CHECK (source IN ('device','pwa','simulator','manual'))
);

CREATE INDEX IF NOT EXISTS idx_vehicle_locations_vehicle ON vehicle_locations (vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_trip ON vehicle_locations (trip_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'depot',
  geometry_type TEXT NOT NULL DEFAULT 'polygon',
  geometry JSONB NOT NULL,
  radius_meters NUMERIC(8,1),
  center_lat NUMERIC(9,6),
  center_lng NUMERIC(9,6),
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  active TEXT NOT NULL DEFAULT 'true',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT chk_geofence_kind CHECK (kind IN ('depot','yard','customer','restricted','charging','other')),
  CONSTRAINT chk_geofence_geometry_type CHECK (geometry_type IN ('polygon','radius','bbox')),
  CONSTRAINT chk_geofence_active CHECK (active IN ('true','false'))
);

CREATE INDEX IF NOT EXISTS idx_geofences_org ON geofences (organization_id, kind) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  geofence_id UUID NOT NULL REFERENCES geofences(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  event_type TEXT NOT NULL,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  location_id UUID REFERENCES vehicle_locations(id),
  distance_meters NUMERIC(8,1),
  dwell_minutes NUMERIC(6,1),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_geofence_event_type CHECK (event_type IN ('enter','exit','dwell','idle','unauthorized_stop','entry_denied'))
);

CREATE INDEX IF NOT EXISTS idx_geofence_events_geofence ON geofence_events (geofence_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_events_vehicle ON geofence_events (vehicle_id, occurred_at DESC);

-- Latest vehicle location (1 row per vehicle)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_vehicle_latest_locations AS
SELECT DISTINCT ON (vehicle_id)
  id,
  vehicle_id,
  lat,
  lng,
  heading,
  speed_kmph,
  odometer_km,
  source,
  trip_id,
  recorded_at
FROM vehicle_locations
ORDER BY vehicle_id, recorded_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_vehicle_latest ON mv_vehicle_latest_locations (vehicle_id);
