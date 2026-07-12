import { eq, and, isNull, desc, sql as drizzleSql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { geofences } from '../../db/schema.js';
import type { Db } from '../../db/index.js';
import type { CreateGeofenceInput, UpdateGeofenceInput } from './dto.js';

export class GeofenceRepository {
  constructor(private readonly database: Db = db) {}

  async findAll(orgId: string, kind?: string) {
    const conditions = [eq(geofences.organizationId, orgId), isNull(geofences.deletedAt)];
    if (kind) {
      conditions.push(eq(geofences.kind, kind));
    }
    return this.database
      .select()
      .from(geofences)
      .where(and(...conditions))
      .orderBy(desc(geofences.createdAt));
  }

  async findById(id: string, orgId: string) {
    const [row] = await this.database
      .select()
      .from(geofences)
      .where(
        and(eq(geofences.id, id), eq(geofences.organizationId, orgId), isNull(geofences.deletedAt)),
      )
      .limit(1);
    return row ?? null;
  }

  async findAllActive(orgId: string) {
    return this.database
      .select()
      .from(geofences)
      .where(
        and(
          eq(geofences.organizationId, orgId),
          eq(geofences.active, 'true'),
          isNull(geofences.deletedAt),
        ),
      );
  }

  async create(input: CreateGeofenceInput & { organizationId: string }) {
    const [row] = await this.database
      .insert(geofences)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        kind: input.kind ?? 'depot',
        geometryType: input.geometryType ?? 'polygon',
        geometry: input.geometry,
        radiusMeters: input.radiusMeters?.toString() ?? null,
        centerLat: input.centerLat?.toString() ?? null,
        centerLng: input.centerLng?.toString() ?? null,
        rules: input.rules ?? {},
        active: input.active ? 'true' : 'false',
      })
      .returning();
    return row ?? null;
  }

  async update(id: string, orgId: string, input: UpdateGeofenceInput) {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) data.name = input.name;
    if (input.kind !== undefined) data.kind = input.kind;
    if (input.geometryType !== undefined) data.geometryType = input.geometryType;
    if (input.geometry !== undefined) data.geometry = input.geometry;
    if (input.radiusMeters !== undefined) data.radiusMeters = input.radiusMeters.toString();
    if (input.centerLat !== undefined) data.centerLat = input.centerLat.toString();
    if (input.centerLng !== undefined) data.centerLng = input.centerLng.toString();
    if (input.rules !== undefined) data.rules = input.rules;
    if (input.active !== undefined) data.active = input.active ? 'true' : 'false';

    const [row] = await this.database
      .update(geofences)
      .set(data)
      .where(and(eq(geofences.id, id), eq(geofences.organizationId, orgId), isNull(geofences.deletedAt)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, orgId: string) {
    const [row] = await this.database
      .update(geofences)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(geofences.id, id), eq(geofences.organizationId, orgId), isNull(geofences.deletedAt)))
      .returning();
    return row ?? null;
  }

  async count(orgId: string) {
    const [result] = await this.database
      .select({ count: drizzleSql<number>`count(*)` })
      .from(geofences)
      .where(and(eq(geofences.organizationId, orgId), isNull(geofences.deletedAt)));
    return result?.count ?? 0;
  }
}
