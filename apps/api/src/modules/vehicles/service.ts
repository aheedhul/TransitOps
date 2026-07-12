import { VehicleRepository } from './repository.js';
import type { CreateVehicleInput, UpdateVehicleInput, VehicleResponse } from './dto.js';
import { publish, createEvent } from '../../lib/events/bus.js';
import { TOPICS } from '../../lib/events/topics.js';

export class VehicleService {
  constructor(private readonly repo: VehicleRepository = new VehicleRepository()) {}

  async list(orgId: string, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.repo.findAll(orgId, pageSize, offset),
      this.repo.count(orgId),
    ]);
    return {
      data: rows.map((v) => serializeVehicle(v)),
      meta: {
        total,
        page,
        page_size: pageSize,
        pages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: string, orgId: string, role: string) {
    const vehicle = await this.repo.findById(id, orgId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }
    return serializeVehicle(vehicle, role);
  }

  async create(input: CreateVehicleInput, orgId: string, actorId: string) {
    const existing = await this.repo.findByRegistration(input.registrationNumber, orgId);
    if (existing) {
      throw new ConflictError('A vehicle with this registration number already exists');
    }

    const vehicle = await this.repo.create({
      ...input,
      organizationId: orgId,
    });

    void publish(
      createEvent(TOPICS.VEHICLE_CREATED, {
        actorId,
        organizationId: orgId,
        entityType: 'vehicle',
        entityId: vehicle.id,
        payload: { registrationNumber: vehicle.registrationNumber },
      }),
    );

    return serializeVehicle(vehicle);
  }

  async update(id: string, orgId: string, input: UpdateVehicleInput, actorId: string) {
    const existing = await this.repo.findById(id, orgId);
    if (!existing) {
      throw new NotFoundError('Vehicle not found');
    }

    if (input.registrationNumber && input.registrationNumber !== existing.registrationNumber) {
      const duplicate = await this.repo.findByRegistration(input.registrationNumber, orgId);
      if (duplicate) {
        throw new ConflictError('A vehicle with this registration number already exists');
      }
    }

    const vehicle = await this.repo.update(id, orgId, input);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    void publish(
      createEvent(TOPICS.VEHICLE_UPDATED, {
        actorId,
        organizationId: orgId,
        entityType: 'vehicle',
        entityId: vehicle.id,
        payload: { registrationNumber: vehicle.registrationNumber },
      }),
    );

    return serializeVehicle(vehicle);
  }

  async softDelete(id: string, orgId: string, actorId: string) {
    const vehicle = await this.repo.softDelete(id, orgId);
    if (!vehicle) {
      throw new NotFoundError('Vehicle not found');
    }

    void publish(
      createEvent(TOPICS.VEHICLE_DELETED, {
        actorId,
        organizationId: orgId,
        entityType: 'vehicle',
        entityId: id,
        payload: {},
      }),
    );
  }
}

function serializeVehicle(row: Record<string, unknown>, role?: string): VehicleResponse {
  const isSensitive = role === 'admin' || role === 'financial_analyst';
  return {
    id: row.id as string,
    registrationNumber: row.registrationNumber as string,
    name: (row.name as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    type: row.type as string,
    maxLoadCapacity: row.maxLoadCapacity as string,
    odometer: row.odometer as string,
    fuelType: row.fuelType as string,
    acquisitionCost: isSensitive ? (row.acquisitionCost as string) : null,
    acquisitionDate: row.acquisitionDate as string,
    currencyCode: row.currencyCode as string,
    status: row.status as string,
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
