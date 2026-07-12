import { eq, and, isNull, desc, sql as drizzleSql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { vehicles } from '../../db/schema.js';
import type { Db } from '../../db/index.js';
import type { CreateVehicleInput, UpdateVehicleInput } from './dto.js';

export class VehicleRepository {
  constructor(private readonly database: Db = db) {}

  async findAll(orgId: string, limit = 50, offset = 0) {
    return this.database
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
      .orderBy(desc(vehicles.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string, orgId: string) {
    const [vehicle] = await this.database
      .select()
      .from(vehicles)
      .where(
        and(eq(vehicles.id, id), eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)),
      )
      .limit(1);
    return vehicle ?? null;
  }

  async findByRegistration(registrationNumber: string, orgId: string) {
    const [vehicle] = await this.database
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.registrationNumber, registrationNumber),
          eq(vehicles.organizationId, orgId),
          isNull(vehicles.deletedAt),
        ),
      )
      .limit(1);
    return vehicle ?? null;
  }

  async create(input: CreateVehicleInput & { organizationId: string }) {
    const [vehicle] = await this.database
      .insert(vehicles)
      .values({
        organizationId: input.organizationId,
        registrationNumber: input.registrationNumber,
        name: input.name ?? null,
        model: input.model ?? null,
        type: input.type,
        maxLoadCapacity: input.maxLoadCapacity.toString(),
        fuelType: input.fuelType,
        acquisitionCost: input.acquisitionCost.toString(),
        acquisitionDate: input.acquisitionDate,
        currencyCode: input.currencyCode,
      })
      .returning();
    if (!vehicle) throw new Error('Failed to create vehicle');
    return vehicle;
  }

  async update(id: string, orgId: string, input: UpdateVehicleInput) {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (input.registrationNumber !== undefined) data.registrationNumber = input.registrationNumber;
    if (input.name !== undefined) data.name = input.name;
    if (input.model !== undefined) data.model = input.model;
    if (input.type !== undefined) data.type = input.type;
    if (input.maxLoadCapacity !== undefined) data.maxLoadCapacity = input.maxLoadCapacity.toString();
    if (input.fuelType !== undefined) data.fuelType = input.fuelType;
    if (input.acquisitionCost !== undefined) data.acquisitionCost = input.acquisitionCost.toString();
    if (input.acquisitionDate !== undefined) data.acquisitionDate = input.acquisitionDate;
    if (input.status !== undefined) data.status = input.status;

    const [vehicle] = await this.database
      .update(vehicles)
      .set(data)
      .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
      .returning();
    return vehicle ?? null;
  }

  async softDelete(id: string, orgId: string) {
    const [vehicle] = await this.database
      .update(vehicles)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
      .returning();
    return vehicle ?? null;
  }

  async count(orgId: string) {
    const [result] = await this.database
      .select({ count: drizzleSql<number>`count(*)` })
      .from(vehicles)
      .where(and(eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)));
    return result?.count ?? 0;
  }
}
