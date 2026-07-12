import { eq, and, isNull, desc, sql as drizzleSql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { fuelLogs } from '../../db/schema.js';
import type { Db } from '../../db/index.js';
import type { CreateFuelLogInput, UpdateFuelLogInput } from './dto.js';

export class FuelRepository {
  constructor(private readonly database: Db = db) {}

  async findAll(orgId: string, vehicleId?: string, limit = 50, offset = 0) {
    const conditions = [eq(fuelLogs.organizationId, orgId), isNull(fuelLogs.deletedAt)];
    if (vehicleId) conditions.push(eq(fuelLogs.vehicleId, vehicleId));

    return this.database
      .select()
      .from(fuelLogs)
      .where(and(...conditions))
      .orderBy(desc(fuelLogs.filledAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string, orgId: string) {
    const [row] = await this.database
      .select()
      .from(fuelLogs)
      .where(and(eq(fuelLogs.id, id), eq(fuelLogs.organizationId, orgId), isNull(fuelLogs.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async findPreviousLog(vehicleId: string, _odometerKm: number, orgId: string) {
    const [row] = await this.database
      .select()
      .from(fuelLogs)
      .where(
        and(
          eq(fuelLogs.vehicleId, vehicleId),
          eq(fuelLogs.organizationId, orgId),
          isNull(fuelLogs.deletedAt),
        ),
      )
      .orderBy(desc(fuelLogs.odometerKm))
      .limit(1);
    return row ?? null;
  }

  async create(input: CreateFuelLogInput & { organizationId: string; createdBy: string }) {
    const [row] = await this.database
      .insert(fuelLogs)
      .values({
        organizationId: input.organizationId,
        vehicleId: input.vehicleId,
        tripId: input.tripId ?? null,
        liters: input.liters.toString(),
        cost: input.cost.toString(),
        odometerKm: input.odometerKm.toString(),
        fuelType: input.fuelType,
        filledStation: input.filledStation ?? null,
        filledAt: new Date(input.filledAt),
        createdBy: input.createdBy,
      })
      .returning();
    if (!row) throw new Error('Failed to create fuel log');
    return row;
  }

  async update(id: string, orgId: string, input: UpdateFuelLogInput) {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (input.vehicleId !== undefined) data.vehicleId = input.vehicleId;
    if (input.tripId !== undefined) data.tripId = input.tripId;
    if (input.liters !== undefined) data.liters = input.liters.toString();
    if (input.cost !== undefined) data.cost = input.cost.toString();
    if (input.odometerKm !== undefined) data.odometerKm = input.odometerKm.toString();
    if (input.fuelType !== undefined) data.fuelType = input.fuelType;
    if (input.filledStation !== undefined) data.filledStation = input.filledStation;
    if (input.filledAt !== undefined) data.filledAt = new Date(input.filledAt);

    const [row] = await this.database
      .update(fuelLogs)
      .set(data)
      .where(and(eq(fuelLogs.id, id), eq(fuelLogs.organizationId, orgId), isNull(fuelLogs.deletedAt)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, orgId: string) {
    const [row] = await this.database
      .update(fuelLogs)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(fuelLogs.id, id), eq(fuelLogs.organizationId, orgId), isNull(fuelLogs.deletedAt)))
      .returning();
    return row ?? null;
  }

  async count(orgId: string, vehicleId?: string) {
    const conditions = [eq(fuelLogs.organizationId, orgId), isNull(fuelLogs.deletedAt)];
    if (vehicleId) conditions.push(eq(fuelLogs.vehicleId, vehicleId));

    const [result] = await this.database
      .select({ count: drizzleSql<number>`count(*)` })
      .from(fuelLogs)
      .where(and(...conditions));
    return result?.count ?? 0;
  }
}
