import { eq, and, isNull, desc, sql as drizzleSql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { customers } from '../../db/schema.js';
import type { Db } from '../../db/index.js';
import type { CreateCustomerInput, UpdateCustomerInput } from './dto.js';

export class CustomerRepository {
  constructor(private readonly database: Db = db) {}

  async findAll(orgId: string, limit = 50, offset = 0) {
    return this.database
      .select()
      .from(customers)
      .where(and(eq(customers.organizationId, orgId), isNull(customers.deletedAt)))
      .orderBy(desc(customers.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string, orgId: string) {
    const [customer] = await this.database
      .select()
      .from(customers)
      .where(
        and(eq(customers.id, id), eq(customers.organizationId, orgId), isNull(customers.deletedAt)),
      )
      .limit(1);
    return customer ?? null;
  }

  async findByName(name: string, orgId: string) {
    const [customer] = await this.database
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.name, name),
          eq(customers.organizationId, orgId),
          isNull(customers.deletedAt),
        ),
      )
      .limit(1);
    return customer ?? null;
  }

  async create(input: CreateCustomerInput & { organizationId: string }) {
    const [customer] = await this.database
      .insert(customers)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        contactName: input.contactName ?? null,
        contactEmail: input.contactEmail ?? null,
        contactPhone: input.contactPhone ?? null,
        billingAddress: input.billingAddress ?? null,
        type: input.type,
      })
      .returning();
    if (!customer) throw new Error('Failed to create customer');
    return customer;
  }

  async update(id: string, orgId: string, input: UpdateCustomerInput) {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) data.name = input.name;
    if (input.contactName !== undefined) data.contactName = input.contactName;
    if (input.contactEmail !== undefined) data.contactEmail = input.contactEmail;
    if (input.contactPhone !== undefined) data.contactPhone = input.contactPhone;
    if (input.billingAddress !== undefined) data.billingAddress = input.billingAddress;
    if (input.type !== undefined) data.type = input.type;

    const [customer] = await this.database
      .update(customers)
      .set(data)
      .where(
        and(eq(customers.id, id), eq(customers.organizationId, orgId), isNull(customers.deletedAt)),
      )
      .returning();
    return customer ?? null;
  }

  async softDelete(id: string, orgId: string) {
    const [customer] = await this.database
      .update(customers)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(customers.id, id), eq(customers.organizationId, orgId), isNull(customers.deletedAt)),
      )
      .returning();
    return customer ?? null;
  }

  async count(orgId: string) {
    const [result] = await this.database
      .select({ count: drizzleSql<number>`count(*)` })
      .from(customers)
      .where(and(eq(customers.organizationId, orgId), isNull(customers.deletedAt)));
    return result?.count ?? 0;
  }
}
