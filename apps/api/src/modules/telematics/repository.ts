import { eq, and, desc, sql as drizzleSql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { vehicleLocations, vehicles } from '../../db/schema.js';
import type { Db } from '../../db/index.js';

export interface LocationInsertInput {
  vehicleId: string;
  lat: number;
  lng: number;
  heading?: number;
  speedKmph: number;
  odometerKm?: number;
  source: string;
  tripId?: string;
  recordedAt: Date;
}

export class TelematicsRepository {
  constructor(private readonly database: Db = db) {}

  async insert(input: LocationInsertInput) {
    const [row] = await this.database
      .insert(vehicleLocations)
      .values({
        vehicleId: input.vehicleId,
        lat: input.lat.toString(),
        lng: input.lng.toString(),
        heading: input.heading?.toString() ?? null,
        speedKmph: input.speedKmph.toString(),
        odometerKm: input.odometerKm?.toString() ?? null,
        source: input.source,
        tripId: input.tripId ?? null,
        recordedAt: input.recordedAt,
      })
      .returning();
    return row ?? null;
  }

  async insertBatch(positions: LocationInsertInput[]) {
    return this.database
      .insert(vehicleLocations)
      .values(
        positions.map((p) => ({
          vehicleId: p.vehicleId,
          lat: p.lat.toString(),
          lng: p.lng.toString(),
          heading: p.heading?.toString() ?? null,
          speedKmph: p.speedKmph.toString(),
          odometerKm: p.odometerKm?.toString() ?? null,
          source: p.source,
          tripId: p.tripId ?? null,
          recordedAt: p.recordedAt,
        })),
      )
      .returning();
  }

  async findLatest(vehicleId: string, limit = 10) {
    return this.database
      .select()
      .from(vehicleLocations)
      .where(eq(vehicleLocations.vehicleId, vehicleId))
      .orderBy(desc(vehicleLocations.recordedAt))
      .limit(limit);
  }

  async findLatestAll(orgId: string) {
    const rows = await this.database
      .select({
        id: vehicleLocations.id,
        vehicleId: vehicleLocations.vehicleId,
        lat: vehicleLocations.lat,
        lng: vehicleLocations.lng,
        heading: vehicleLocations.heading,
        speedKmph: vehicleLocations.speedKmph,
        odometerKm: vehicleLocations.odometerKm,
        source: vehicleLocations.source,
        tripId: vehicleLocations.tripId,
        recordedAt: vehicleLocations.recordedAt,
        vehicleName: vehicles.name,
        vehicleStatus: vehicles.status,
      })
      .from(vehicleLocations)
      .innerJoin(vehicles, eq(vehicleLocations.vehicleId, vehicles.id))
      .where(eq(vehicles.organizationId, orgId))
      .orderBy(desc(vehicleLocations.recordedAt));

    const latest = new Map<string, typeof rows[0]>();
    for (const row of rows) {
      if (!latest.has(row.vehicleId)) {
        latest.set(row.vehicleId, row);
      }
    }

    return Array.from(latest.values());
  }

  async findRecentByVehicle(vehicleId: string, minutes = 15, limit = 5) {
    return this.database
      .select()
      .from(vehicleLocations)
      .where(
        and(
          eq(vehicleLocations.vehicleId, vehicleId),
          drizzleSql`${vehicleLocations.recordedAt} > now() - interval '${drizzleSql.raw(String(minutes))} minutes'`,
        ),
      )
      .orderBy(desc(vehicleLocations.recordedAt))
      .limit(limit);
  }

  async updateVehicleOdometer(vehicleId: string, odometerKm: number) {
    this.database
      .update(vehicles)
      .set({ odometer: odometerKm.toString(), updatedAt: new Date() })
      .where(eq(vehicles.id, vehicleId));
  }
}
