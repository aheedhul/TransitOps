import { eq, and, isNull, desc, sql as drizzleSql, gte, lte } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { expenses } from '../../db/schema.js';
import type { Db } from '../../db/index.js';
import type { CreateExpenseInput, UpdateExpenseInput } from './dto.js';

export class ExpenseRepository {
  constructor(private readonly database: Db = db) {}

  async findAll(orgId: string, vehicleId?: string, limit = 50, offset = 0) {
    const conditions = [eq(expenses.organizationId, orgId), isNull(expenses.deletedAt)];
    if (vehicleId) conditions.push(eq(expenses.vehicleId, vehicleId));

    return this.database
      .select()
      .from(expenses)
      .where(and(...conditions))
      .orderBy(desc(expenses.incurredAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string, orgId: string) {
    const [row] = await this.database
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.organizationId, orgId), isNull(expenses.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async create(input: CreateExpenseInput & { organizationId: string; createdBy: string }) {
    const [row] = await this.database
      .insert(expenses)
      .values({
        organizationId: input.organizationId,
        vehicleId: input.vehicleId,
        tripId: input.tripId ?? null,
        type: input.type,
        amount: input.amount.toString(),
        incurredAt: new Date(input.incurredAt),
        createdBy: input.createdBy,
      })
      .returning();
    if (!row) throw new Error('Failed to create expense');
    return row;
  }

  async update(id: string, orgId: string, input: UpdateExpenseInput) {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (input.vehicleId !== undefined) data.vehicleId = input.vehicleId;
    if (input.tripId !== undefined) data.tripId = input.tripId;
    if (input.type !== undefined) data.type = input.type;
    if (input.amount !== undefined) data.amount = input.amount.toString();
    if (input.incurredAt !== undefined) data.incurredAt = new Date(input.incurredAt);

    const [row] = await this.database
      .update(expenses)
      .set(data)
      .where(and(eq(expenses.id, id), eq(expenses.organizationId, orgId), isNull(expenses.deletedAt)))
      .returning();
    return row ?? null;
  }

  async softDelete(id: string, orgId: string) {
    const [row] = await this.database
      .update(expenses)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(expenses.id, id), eq(expenses.organizationId, orgId), isNull(expenses.deletedAt)))
      .returning();
    return row ?? null;
  }

  async count(orgId: string, vehicleId?: string) {
    const conditions = [eq(expenses.organizationId, orgId), isNull(expenses.deletedAt)];
    if (vehicleId) conditions.push(eq(expenses.vehicleId, vehicleId));

    const [result] = await this.database
      .select({ count: drizzleSql<number>`count(*)` })
      .from(expenses)
      .where(and(...conditions));
    return result?.count ?? 0;
  }

  async getRollup(orgId: string, vehicleId: string, startDate?: string, endDate?: string) {
    const conditions = [
      eq(expenses.organizationId, orgId),
      eq(expenses.vehicleId, vehicleId),
      isNull(expenses.deletedAt),
    ];
    if (startDate) conditions.push(gte(expenses.incurredAt, new Date(startDate)));
    if (endDate) conditions.push(lte(expenses.incurredAt, new Date(endDate)));

    const rows = await this.database
      .select()
      .from(expenses)
      .where(and(...conditions));

    return rows;
  }
}
