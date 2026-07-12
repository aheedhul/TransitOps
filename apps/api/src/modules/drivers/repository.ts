import { eq, and, isNull, desc, sql as drizzleSql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { drivers } from '../../db/schema.js';
import type { Db } from '../../db/index.js';
import type { CreateDriverInput, UpdateDriverInput } from './dto.js';

export class DriverRepository {
  constructor(private readonly database: Db = db) {}

  async findAll(orgId: string, limit = 50, offset = 0) {
    return this.database
      .select()
      .from(drivers)
      .where(and(eq(drivers.organizationId, orgId), isNull(drivers.deletedAt)))
      .orderBy(desc(drivers.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string, orgId: string) {
    const [driver] = await this.database
      .select()
      .from(drivers)
      .where(
        and(eq(drivers.id, id), eq(drivers.organizationId, orgId), isNull(drivers.deletedAt)),
      )
      .limit(1);
    return driver ?? null;
  }

  async findByLicenseNumber(licenseNumber: string, orgId: string) {
    const [driver] = await this.database
      .select()
      .from(drivers)
      .where(
        and(
          eq(drivers.licenseNumber, licenseNumber),
          eq(drivers.organizationId, orgId),
          isNull(drivers.deletedAt),
        ),
      )
      .limit(1);
    return driver ?? null;
  }

  async create(input: CreateDriverInput & { organizationId: string }) {
    const [driver] = await this.database
      .insert(drivers)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        licenseNumber: input.licenseNumber,
        licenseCategory: input.licenseCategory,
        licenseExpiryDate: input.licenseExpiryDate,
        contactNumber: input.contactNumber,
      })
      .returning();
    if (!driver) throw new Error('Failed to create driver');
    return driver;
  }

  async update(id: string, orgId: string, input: UpdateDriverInput) {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) data.name = input.name;
    if (input.licenseNumber !== undefined) data.licenseNumber = input.licenseNumber;
    if (input.licenseCategory !== undefined) data.licenseCategory = input.licenseCategory;
    if (input.licenseExpiryDate !== undefined) data.licenseExpiryDate = input.licenseExpiryDate;
    if (input.contactNumber !== undefined) data.contactNumber = input.contactNumber;
    if (input.status !== undefined) data.status = input.status;

    const [driver] = await this.database
      .update(drivers)
      .set(data)
      .where(and(eq(drivers.id, id), eq(drivers.organizationId, orgId), isNull(drivers.deletedAt)))
      .returning();
    return driver ?? null;
  }

  async softDelete(id: string, orgId: string) {
    const [driver] = await this.database
      .update(drivers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(drivers.id, id), eq(drivers.organizationId, orgId), isNull(drivers.deletedAt)))
      .returning();
    return driver ?? null;
  }

  async count(orgId: string) {
    const [result] = await this.database
      .select({ count: drizzleSql<number>`count(*)` })
      .from(drivers)
      .where(and(eq(drivers.organizationId, orgId), isNull(drivers.deletedAt)));
    return result?.count ?? 0;
  }
}
