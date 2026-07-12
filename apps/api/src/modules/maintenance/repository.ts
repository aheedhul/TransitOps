import { eq, and, isNull, desc, sql as drizzleSql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { maintenanceLogs } from '../../db/schema.js';
import type { Db } from '../../db/index.js';
import type { CreateMaintenanceInput, UpdateMaintenanceInput } from './dto.js';

export class MaintenanceRepository {
  constructor(private readonly database: Db = db) {}

  async findAll(orgId: string, vehicleId?: string, limit = 50, offset = 0) {
    const conditions = [eq(maintenanceLogs.organizationId, orgId), isNull(maintenanceLogs.deletedAt)];
    if (vehicleId) conditions.push(eq(maintenanceLogs.vehicleId, vehicleId));

    return this.database
      .select()
      .from(maintenanceLogs)
      .where(and(...conditions))
      .orderBy(desc(maintenanceLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string, orgId: string) {
    const [row] = await this.database
      .select()
      .from(maintenanceLogs)
      .where(
        and(eq(maintenanceLogs.id, id), eq(maintenanceLogs.organizationId, orgId), isNull(maintenanceLogs.deletedAt)),
      )
      .limit(1);
    return row ?? null;
  }

  async findActiveByVehicle(vehicleId: string, orgId: string) {
    const [row] = await this.database
      .select()
      .from(maintenanceLogs)
      .where(
        and(
          eq(maintenanceLogs.vehicleId, vehicleId),
          eq(maintenanceLogs.organizationId, orgId),
          eq(maintenanceLogs.status, 'active'),
          isNull(maintenanceLogs.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async create(input: CreateMaintenanceInput & { organizationId: string; createdBy: string }) {
    const [row] = await this.database
      .insert(maintenanceLogs)
      .values({
        organizationId: input.organizationId,
        vehicleId: input.vehicleId,
        type: input.type,
        description: input.description,
        serviceOdometer: input.serviceOdometer?.toString() ?? null,
        cost: input.cost.toString(),
        vendor: input.vendor ?? null,
        createdBy: input.createdBy,
      })
      .returning();
    if (!row) throw new Error('Failed to create maintenance log');
    return row;
  }

  async update(id: string, orgId: string, input: UpdateMaintenanceInput) {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (input.vehicleId !== undefined) data.vehicleId = input.vehicleId;
    if (input.type !== undefined) data.type = input.type;
    if (input.description !== undefined) data.description = input.description;
    if (input.serviceOdometer !== undefined) data.serviceOdometer = input.serviceOdometer.toString();
    if (input.cost !== undefined) data.cost = input.cost.toString();
    if (input.vendor !== undefined) data.vendor = input.vendor;
    if (input.status !== undefined) data.status = input.status;

    const [row] = await this.database
      .update(maintenanceLogs)
      .set(data)
      .where(and(eq(maintenanceLogs.id, id), eq(maintenanceLogs.organizationId, orgId), isNull(maintenanceLogs.deletedAt)))
      .returning();
    return row ?? null;
  }

  async close(id: string, orgId: string, closedBy: string) {
    const [row] = await this.database
      .update(maintenanceLogs)
      .set({
        status: 'closed',
        closedAt: new Date(),
        closedBy,
        updatedAt: new Date(),
      })
      .where(
        and(eq(maintenanceLogs.id, id), eq(maintenanceLogs.organizationId, orgId), eq(maintenanceLogs.status, 'active'), isNull(maintenanceLogs.deletedAt)),
      )
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, orgId: string) {
    const [row] = await this.database
      .update(maintenanceLogs)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(maintenanceLogs.id, id), eq(maintenanceLogs.organizationId, orgId), isNull(maintenanceLogs.deletedAt)))
      .returning();
    return row ?? null;
  }

  async count(orgId: string, vehicleId?: string) {
    const conditions = [eq(maintenanceLogs.organizationId, orgId), isNull(maintenanceLogs.deletedAt)];
    if (vehicleId) conditions.push(eq(maintenanceLogs.vehicleId, vehicleId));

    const [result] = await this.database
      .select({ count: drizzleSql<number>`count(*)` })
      .from(maintenanceLogs)
      .where(and(...conditions));
    return result?.count ?? 0;
  }
}
