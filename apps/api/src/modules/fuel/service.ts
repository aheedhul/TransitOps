import { FuelRepository } from './repository.js';
import type { CreateFuelLogInput, UpdateFuelLogInput, FuelLogResponse } from './dto.js';
import { publish, createEvent } from '../../lib/events/bus.js';
import { TOPICS } from '../../lib/events/topics.js';
import { db } from '../../db/index.js';
import { vehicles } from '../../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

export class FuelService {
  constructor(private readonly repo: FuelRepository = new FuelRepository()) {}

  async list(orgId: string, vehicleId?: string, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.repo.findAll(orgId, vehicleId, pageSize, offset),
      this.repo.count(orgId, vehicleId),
    ]);
    return {
      data: rows.map((r) => serializeFuelLog(r)),
      meta: { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize) },
    };
  }

  async getById(id: string, orgId: string) {
    const row = await this.repo.findById(id, orgId);
    if (!row) throw new NotFoundError('Fuel log not found');
    return serializeFuelLog(row);
  }

  async create(input: CreateFuelLogInput, orgId: string, actorId: string) {
    const vehicle = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, input.vehicleId), eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (!vehicle) throw new NotFoundError('Vehicle not found');

    const odometerStr = (vehicle.odometer as string) ?? '0';
    const currentOdometer = parseFloat(odometerStr);
    if (input.odometerKm < currentOdometer) {
      throw new BusinessRuleError('Odometer value cannot be lower than current vehicle odometer');
    }

    const row = await this.repo.create({ ...input, organizationId: orgId, createdBy: actorId });

    await db
      .update(vehicles)
      .set({ odometer: input.odometerKm.toString(), updatedAt: new Date() })
      .where(and(eq(vehicles.id, input.vehicleId), eq(vehicles.organizationId, orgId)));

    void publish(
      createEvent(TOPICS.FUEL_LOG_CREATED, {
        actorId,
        organizationId: orgId,
        entityType: 'fuel_log',
        entityId: row.id,
        payload: { vehicleId: input.vehicleId, liters: input.liters, odometerKm: input.odometerKm },
      }),
    );

    return serializeFuelLog(row);
  }

  async update(id: string, orgId: string, input: UpdateFuelLogInput, actorId: string) {
    const existing = await this.repo.findById(id, orgId);
    if (!existing) throw new NotFoundError('Fuel log not found');

    const row = await this.repo.update(id, orgId, input);
    if (!row) throw new NotFoundError('Fuel log not found');

    void publish(
      createEvent(TOPICS.FUEL_LOG_UPDATED, {
        actorId,
        organizationId: orgId,
        entityType: 'fuel_log',
        entityId: row.id,
        payload: { vehicleId: row.vehicleId },
      }),
    );

    return serializeFuelLog(row);
  }

  async softDelete(id: string, orgId: string, actorId: string) {
    const row = await this.repo.softDelete(id, orgId);
    if (!row) throw new NotFoundError('Fuel log not found');

    void publish(
      createEvent(TOPICS.FUEL_LOG_DELETED, {
        actorId,
        organizationId: orgId,
        entityType: 'fuel_log',
        entityId: id,
        payload: {},
      }),
    );
  }
}

function serializeFuelLog(row: Record<string, unknown>): FuelLogResponse {
  return {
    id: row.id as string,
    vehicleId: row.vehicleId as string,
    tripId: (row.tripId as string | null) ?? null,
    liters: row.liters as string,
    cost: row.cost as string,
    odometerKm: row.odometerKm as string,
    fuelType: row.fuelType as string,
    filledStation: (row.filledStation as string | null) ?? null,
    filledAt: (row.filledAt as Date).toISOString(),
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

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}
