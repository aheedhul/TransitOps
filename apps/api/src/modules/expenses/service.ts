import { ExpenseRepository } from './repository.js';
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseResponse, ExpenseRollup } from './dto.js';
import { publish, createEvent } from '../../lib/events/bus.js';
import { TOPICS } from '../../lib/events/topics.js';
import { db } from '../../db/index.js';
import { vehicles } from '../../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

export class ExpenseService {
  constructor(private readonly repo: ExpenseRepository = new ExpenseRepository()) {}

  async list(orgId: string, vehicleId?: string, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.repo.findAll(orgId, vehicleId, pageSize, offset),
      this.repo.count(orgId, vehicleId),
    ]);
    return {
      data: rows.map((r) => serializeExpense(r)),
      meta: { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize) },
    };
  }

  async getById(id: string, orgId: string) {
    const row = await this.repo.findById(id, orgId);
    if (!row) throw new NotFoundError('Expense not found');
    return serializeExpense(row);
  }

  async create(input: CreateExpenseInput, orgId: string, actorId: string) {
    const vehicle = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, input.vehicleId), eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!vehicle) throw new NotFoundError('Vehicle not found');

    const row = await this.repo.create({ ...input, organizationId: orgId, createdBy: actorId });

    void publish(
      createEvent(TOPICS.EXPENSE_CREATED, {
        actorId,
        organizationId: orgId,
        entityType: 'expense',
        entityId: row.id,
        payload: { vehicleId: input.vehicleId, amount: input.amount, type: input.type },
      }),
    );

    return serializeExpense(row);
  }

  async update(id: string, orgId: string, input: UpdateExpenseInput, actorId: string) {
    const existing = await this.repo.findById(id, orgId);
    if (!existing) throw new NotFoundError('Expense not found');

    const row = await this.repo.update(id, orgId, input);
    if (!row) throw new NotFoundError('Expense not found');

    void publish(
      createEvent(TOPICS.EXPENSE_UPDATED, {
        actorId,
        organizationId: orgId,
        entityType: 'expense',
        entityId: row.id,
        payload: { vehicleId: row.vehicleId },
      }),
    );

    return serializeExpense(row);
  }

  async softDelete(id: string, orgId: string, actorId: string) {
    const row = await this.repo.softDelete(id, orgId);
    if (!row) throw new NotFoundError('Expense not found');

    void publish(
      createEvent(TOPICS.EXPENSE_DELETED, {
        actorId,
        organizationId: orgId,
        entityType: 'expense',
        entityId: id,
        payload: {},
      }),
    );
  }

  async getRollup(orgId: string, vehicleId: string, startDate?: string, endDate?: string): Promise<ExpenseRollup> {
    const vehicle = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!vehicle) throw new NotFoundError('Vehicle not found');

    const rows = await this.repo.getRollup(orgId, vehicleId, startDate, endDate);
    let totalAmount = 0;
    const byType: Record<string, { total: number; count: number }> = {};

    for (const row of rows) {
      const amount = parseFloat(row.amount as string);
      const type = row.type as string;
      totalAmount += amount;
      if (!byType[type]) byType[type] = { total: 0, count: 0 };
      byType[type].total += amount;
      byType[type].count += 1;
    }

    const byTypeStr: Record<string, { total: string; count: number }> = {};
    for (const [key, val] of Object.entries(byType)) {
      byTypeStr[key] = { total: val.total.toString(), count: val.count };
    }

    return {
      vehicleId,
      totalAmount: totalAmount.toString(),
      count: rows.length,
      byType: byTypeStr,
    };
  }
}

function serializeExpense(row: Record<string, unknown>): ExpenseResponse {
  return {
    id: row.id as string,
    vehicleId: row.vehicleId as string,
    tripId: (row.tripId as string | null) ?? null,
    type: row.type as string,
    amount: row.amount as string,
    incurredAt: (row.incurredAt as Date).toISOString(),
    createdBy: row.createdBy as string,
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
