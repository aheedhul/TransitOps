import { MaintenanceRepository } from './repository.js';
import type { CreateMaintenanceInput, UpdateMaintenanceInput, MaintenanceResponse } from './dto.js';
import { publish, createEvent } from '../../lib/events/bus.js';
import { TOPICS } from '../../lib/events/topics.js';
import { db } from '../../db/index.js';
import { vehicles } from '../../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

export class MaintenanceService {
  constructor(private readonly repo: MaintenanceRepository = new MaintenanceRepository()) {}

  async list(orgId: string, vehicleId?: string, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.repo.findAll(orgId, vehicleId, pageSize, offset),
      this.repo.count(orgId, vehicleId),
    ]);
    return {
      data: rows.map((r) => serializeMaintenance(r)),
      meta: { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize) },
    };
  }

  async getById(id: string, orgId: string) {
    const row = await this.repo.findById(id, orgId);
    if (!row) throw new NotFoundError('Maintenance log not found');
    return serializeMaintenance(row);
  }

  async create(input: CreateMaintenanceInput, orgId: string, actorId: string) {
    const vehicle = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, input.vehicleId), eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!vehicle) throw new NotFoundError('Vehicle not found');

    const activeExisting = await this.repo.findActiveByVehicle(input.vehicleId, orgId);
    if (activeExisting) throw new ConflictError('Vehicle already has an active maintenance log');

    const row = await this.repo.create({ ...input, organizationId: orgId, createdBy: actorId });

    await db
      .update(vehicles)
      .set({ status: 'in-shop', updatedAt: new Date() })
      .where(and(eq(vehicles.id, input.vehicleId), eq(vehicles.organizationId, orgId)));

    void publish(
      createEvent(TOPICS.MAINTENANCE_CREATED, {
        actorId,
        organizationId: orgId,
        entityType: 'maintenance',
        entityId: row.id,
        payload: { vehicleId: input.vehicleId, type: input.type },
      }),
    );

    return serializeMaintenance(row);
  }

  async update(id: string, orgId: string, input: UpdateMaintenanceInput, actorId: string) {
    const existing = await this.repo.findById(id, orgId);
    if (!existing) throw new NotFoundError('Maintenance log not found');

    const row = await this.repo.update(id, orgId, input);
    if (!row) throw new NotFoundError('Maintenance log not found');

    void publish(
      createEvent(TOPICS.MAINTENANCE_UPDATED, {
        actorId,
        organizationId: orgId,
        entityType: 'maintenance',
        entityId: row.id,
        payload: { vehicleId: row.vehicleId },
      }),
    );

    return serializeMaintenance(row);
  }

  async close(id: string, orgId: string, actorId: string) {
    const existing = await this.repo.findById(id, orgId);
    if (!existing) throw new NotFoundError('Maintenance log not found');
    if (existing.status !== 'active') throw new ConflictError('Only active maintenance logs can be closed');

    const row = await this.repo.close(id, orgId, actorId);
    if (!row) throw new NotFoundError('Maintenance log not found');

    const vehicle = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, existing.vehicleId as string), eq(vehicles.organizationId, orgId)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (vehicle && vehicle.status !== 'retired') {
      await db
        .update(vehicles)
        .set({ status: 'available', updatedAt: new Date() })
        .where(and(eq(vehicles.id, existing.vehicleId as string), eq(vehicles.organizationId, orgId)));
    }

    void publish(
      createEvent(TOPICS.MAINTENANCE_CLOSED, {
        actorId,
        organizationId: orgId,
        entityType: 'maintenance',
        entityId: row.id,
        payload: { vehicleId: existing.vehicleId },
      }),
    );

    return serializeMaintenance(row);
  }

  async softDelete(id: string, orgId: string, actorId: string) {
    const row = await this.repo.softDelete(id, orgId);
    if (!row) throw new NotFoundError('Maintenance log not found');

    void publish(
      createEvent(TOPICS.MAINTENANCE_DELETED, {
        actorId,
        organizationId: orgId,
        entityType: 'maintenance',
        entityId: id,
        payload: {},
      }),
    );
  }
}

function serializeMaintenance(row: Record<string, unknown>): MaintenanceResponse {
  return {
    id: row.id as string,
    vehicleId: row.vehicleId as string,
    type: row.type as string,
    description: row.description as string,
    serviceOdometer: (row.serviceOdometer as string | null) ?? null,
    cost: row.cost as string,
    vendor: (row.vendor as string | null) ?? null,
    status: row.status as string,
    closedAt: row.closedAt ? (row.closedAt as Date).toISOString() : null,
    closedBy: (row.closedBy as string | null) ?? null,
    predictedScheduleId: (row.predictedScheduleId as string | null) ?? null,
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

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}
