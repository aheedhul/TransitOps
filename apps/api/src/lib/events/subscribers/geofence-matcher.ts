import { subscribe } from '../bus.js';
import { TOPICS } from '../topics.js';
import { logger } from '../../logger.js';
import { GeofenceRepository } from '../../../modules/geofences/repository.js';
import { db } from '../../../db/index.js';
import { geofenceEvents } from '../../../db/schema.js';

interface GeoPoint {
  lat: number;
  lng: number;
}

interface GeofenceRow {
  id: string;
  geometryType: string;
  geometry: Record<string, unknown>;
  radiusMeters: string | number | null;
  centerLat: string | number | null;
  centerLng: string | number | null;
}

type StateKey = `${string}:${string}`;
const vehicleStates = new Map<StateKey, string>();

function pointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!; const b = polygon[j]!;
    const intersect =
      ((b.lat > point.lat) !== (a.lat > point.lat)) &&
      (point.lng < ((a.lng - b.lng) * (point.lat - b.lat)) / (a.lat - b.lat) + b.lng);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInRadius(point: GeoPoint, center: GeoPoint, radiusM: number): boolean {
  const R = 6371e3;
  const dLat = ((center.lat - point.lat) * Math.PI) / 180;
  const dLng = ((center.lng - point.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((point.lat * Math.PI) / 180) *
      Math.cos((center.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= radiusM;
}

function isInside(point: GeoPoint, geofence: GeofenceRow): boolean {
  if (geofence.geometryType === 'radius') {
    const centerLat = Number(geofence.centerLat);
    const centerLng = Number(geofence.centerLng);
    const radius = Number(geofence.radiusMeters);
    if (isNaN(centerLat) || isNaN(centerLng) || isNaN(radius)) return false;
    return pointInRadius(point, { lat: centerLat, lng: centerLng }, radius);
  }

  if (geofence.geometryType === 'polygon') {
    const coords = geofence.geometry?.coordinates as unknown[];
    if (!coords || !Array.isArray(coords[0])) return false;

    const ring = (coords[0] as Array<[number, number]>).map(
      ([lng, lat]: [number, number]) => ({ lat, lng }),
    );
    if (ring.length < 3) return false;
    return pointInPolygon(point, ring);
  }

  if (geofence.geometryType === 'bbox') {
    const coords = geofence.geometry?.coordinates as unknown[];
    if (!coords || !Array.isArray(coords[0])) return false;
    const [minLng, minLat] = coords[0] as [number, number];
    const [maxLng, maxLat] = coords[1] as [number, number];
    return (
      point.lat >= minLat &&
      point.lat <= maxLat &&
      point.lng >= minLng &&
      point.lng <= maxLng
    );
  }

  return false;
}

async function recordGeofenceEvent(
  geofenceId: string,
  vehicleId: string,
  eventType: string,
  point: GeoPoint,
) {
  await db.insert(geofenceEvents).values({
    geofenceId,
    vehicleId,
    eventType,
    lat: point.lat.toString(),
    lng: point.lng.toString(),
    occurredAt: new Date(),
  });
}

let geofenceRepo: GeofenceRepository;
let cachedGeofences: GeofenceRow[] = [];
let cacheExpiry = 0;

async function getActiveGeofences(orgId: string): Promise<GeofenceRow[]> {
  if (Date.now() < cacheExpiry) return cachedGeofences;
  if (!geofenceRepo) geofenceRepo = new GeofenceRepository();
  const rows = await geofenceRepo.findAllActive(orgId);
  cachedGeofences = rows.map((r) => ({
    id: r.id as string,
    geometryType: r.geometryType as string,
    geometry: r.geometry as Record<string, unknown>,
    radiusMeters: r.radiusMeters,
    centerLat: r.centerLat,
    centerLng: r.centerLng,
  }));
  cacheExpiry = Date.now() + 30_000;
  return cachedGeofences;
}

export function initGeofenceMatcherSubscriber(): void {
  subscribe(TOPICS.VEHICLE_POSITION_UPDATED, async (event) => {
    try {
      const payload = event.payload as {
        vehicleId: string;
        lat: number;
        lng: number;
        speedKmph: number;
      };

      const point: GeoPoint = { lat: payload.lat, lng: payload.lng };
      const vehicleId = payload.vehicleId;
      const orgId = event.organizationId;

      if (!orgId) return;

      const geofences = await getActiveGeofences(orgId);

      for (const gf of geofences) {
        const key: StateKey = `${vehicleId}:${gf.id}`;
        const inside = isInside(point, gf);
        const prevState = vehicleStates.get(key) ?? 'outside';

        if (inside && prevState === 'outside') {
          vehicleStates.set(key, 'inside');
          void recordGeofenceEvent(gf.id, vehicleId, 'enter', point);

          void import('../bus.js').then(({ publish, createEvent }) => {
            publish(
              createEvent(TOPICS.GEOFENCE_ENTERED, {
                actorId: event.actorId,
                organizationId: orgId,
                entityType: 'geofence_event',
                entityId: gf.id,
                payload: { geofenceId: gf.id, vehicleId, lat: payload.lat, lng: payload.lng },
              }),
            );
          });
        } else if (!inside && prevState === 'inside') {
          vehicleStates.set(key, 'outside');
          void recordGeofenceEvent(gf.id, vehicleId, 'exit', point);

          void import('../bus.js').then(({ publish, createEvent }) => {
            publish(
              createEvent(TOPICS.GEOFENCE_EXITED, {
                actorId: event.actorId,
                organizationId: orgId,
                entityType: 'geofence_event',
                entityId: gf.id,
                payload: { geofenceId: gf.id, vehicleId, lat: payload.lat, lng: payload.lng },
              }),
            );
          });
        }
      }
    } catch (err) {
      logger.error({ err }, 'geofence_matcher subscriber error');
    }
  });
}
