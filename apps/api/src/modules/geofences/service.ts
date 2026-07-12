import { GeofenceRepository } from './repository.js';
import type { CreateGeofenceInput, UpdateGeofenceInput, GeofenceResponse } from './dto.js';
import { publish, createEvent } from '../../lib/events/bus.js';
import { TOPICS } from '../../lib/events/topics.js';

export class GeofenceService {
  constructor(private readonly repo: GeofenceRepository = new GeofenceRepository()) {}

  async list(orgId: string, kind?: string) {
    const rows = await this.repo.findAll(orgId, kind);
    return {
      data: rows.map(serializeGeofence),
    };
  }

  async getById(id: string, orgId: string) {
    const row = await this.repo.findById(id, orgId);
    if (!row) throw new NotFoundError('Geofence not found');
    return serializeGeofence(row);
  }

  async create(input: CreateGeofenceInput, orgId: string, actorId: string) {
    const row = await this.repo.create({ ...input, organizationId: orgId });
    if (!row) throw new Error('Failed to create geofence');

    void publish(
      createEvent(TOPICS.GEOFENCE_CREATED, {
        actorId,
        organizationId: orgId,
        entityType: 'geofence',
        entityId: row.id,
        payload: { name: row.name, kind: row.kind },
      }),
    );

    return serializeGeofence(row);
  }

  async update(id: string, orgId: string, input: UpdateGeofenceInput, actorId: string) {
    const existing = await this.repo.findById(id, orgId);
    if (!existing) throw new NotFoundError('Geofence not found');

    const row = await this.repo.update(id, orgId, input);
    if (!row) throw new NotFoundError('Geofence not found');

    void publish(
      createEvent(TOPICS.GEOFENCE_UPDATED, {
        actorId,
        organizationId: orgId,
        entityType: 'geofence',
        entityId: row.id,
        payload: { name: row.name, kind: row.kind },
      }),
    );

    return serializeGeofence(row);
  }

  async softDelete(id: string, orgId: string, actorId: string) {
    const row = await this.repo.softDelete(id, orgId);
    if (!row) throw new NotFoundError('Geofence not found');

    void publish(
      createEvent(TOPICS.GEOFENCE_DELETED, {
        actorId,
        organizationId: orgId,
        entityType: 'geofence',
        entityId: id,
        payload: {},
      }),
    );
  }
}

function serializeGeofence(row: Record<string, unknown>): GeofenceResponse {
  return {
    id: row.id as string,
    name: row.name as string,
    kind: row.kind as string,
    geometryType: row.geometryType as string,
    geometry: (row.geometry as Record<string, unknown>) ?? {},
    radiusMeters: row.radiusMeters ? Number(row.radiusMeters) : null,
    centerLat: row.centerLat ? Number(row.centerLat) : null,
    centerLng: row.centerLng ? Number(row.centerLng) : null,
    rules: (row.rules as Record<string, unknown>) ?? {},
    active: row.active === 'true',
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString(),
  };
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
