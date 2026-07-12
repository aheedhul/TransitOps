import { eq, and, isNull, desc, sql as drizzleSql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { trips, tripEvents, vehicles, drivers } from '../../db/schema.js';
import type { Db } from '../../db/index.js';
import type { CreateTripInput, UpdateTripInput } from './dto.js';

export class TripRepository {
  constructor(private readonly database: Db = db) {}

  async findAll(orgId: string, limit = 50, offset = 0) {
    return this.database
      .select()
      .from(trips)
      .where(and(eq(trips.organizationId, orgId), isNull(trips.deletedAt)))
      .orderBy(desc(trips.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findById(id: string, orgId: string) {
    const [trip] = await this.database
      .select()
      .from(trips)
      .where(
        and(eq(trips.id, id), eq(trips.organizationId, orgId), isNull(trips.deletedAt)),
      )
      .limit(1);
    return trip ?? null;
  }

  async create(input: CreateTripInput & { organizationId: string; createdBy: string }) {
    const [trip] = await this.database
      .insert(trips)
      .values({
        organizationId: input.organizationId,
        vehicleId: input.vehicleId ?? null,
        driverId: input.driverId ?? null,
        customerId: input.customerId ?? null,
        sourceLabel: input.sourceLabel,
        sourceLat: input.sourceLat?.toString() ?? null,
        sourceLng: input.sourceLng?.toString() ?? null,
        destinationLabel: input.destinationLabel,
        destinationLat: input.destinationLat?.toString() ?? null,
        destinationLng: input.destinationLng?.toString() ?? null,
        cargoWeightKg: input.cargoWeightKg.toString(),
        plannedDistanceKm: input.plannedDistanceKm?.toString() ?? null,
        plannedTravelMins: input.plannedTravelMins ?? null,
        estimatedFuelL: input.estimatedFuelL?.toString() ?? null,
        estimatedFuelCost: input.estimatedFuelCost?.toString() ?? null,
        cargoDescription: input.cargoDescription ?? null,
        plannedDepartureAt: input.plannedDepartureAt ? new Date(input.plannedDepartureAt) : null,
        revenueAmount: (input as Record<string, unknown>).revenueAmount?.toString() ?? null,
        createdBy: input.createdBy,
      })
      .returning();
    if (!trip) throw new Error('Failed to create trip');
    return trip;
  }

  async update(id: string, orgId: string, input: UpdateTripInput) {
    const data: Record<string, unknown> = { updatedAt: new Date() };
    if (input.sourceLabel !== undefined) data.sourceLabel = input.sourceLabel;
    if (input.sourceLat !== undefined) data.sourceLat = input.sourceLat.toString();
    if (input.sourceLng !== undefined) data.sourceLng = input.sourceLng.toString();
    if (input.destinationLabel !== undefined) data.destinationLabel = input.destinationLabel;
    if (input.destinationLat !== undefined) data.destinationLat = input.destinationLat.toString();
    if (input.destinationLng !== undefined) data.destinationLng = input.destinationLng.toString();
    if (input.cargoWeightKg !== undefined) data.cargoWeightKg = input.cargoWeightKg.toString();
    if (input.plannedDistanceKm !== undefined) data.plannedDistanceKm = input.plannedDistanceKm.toString();
    if (input.plannedTravelMins !== undefined) data.plannedTravelMins = input.plannedTravelMins;
    if (input.estimatedFuelL !== undefined) data.estimatedFuelL = input.estimatedFuelL.toString();
    if (input.estimatedFuelCost !== undefined) data.estimatedFuelCost = input.estimatedFuelCost.toString();
    if (input.cargoDescription !== undefined) data.cargoDescription = input.cargoDescription;
    if (input.plannedDepartureAt !== undefined) data.plannedDepartureAt = new Date(input.plannedDepartureAt);
    if (input.vehicleId !== undefined) data.vehicleId = input.vehicleId;
    if (input.driverId !== undefined) data.driverId = input.driverId;
    if (input.customerId !== undefined) data.customerId = input.customerId;
    if ((input as Record<string, unknown>).revenueAmount !== undefined) {
      data.revenueAmount = ((input as Record<string, unknown>).revenueAmount as number).toString();
    }

    const [trip] = await this.database
      .update(trips)
      .set(data)
      .where(and(eq(trips.id, id), eq(trips.organizationId, orgId), isNull(trips.deletedAt)))
      .returning();
    return trip ?? null;
  }

  async softDelete(id: string, orgId: string) {
    const [trip] = await this.database
      .update(trips)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(trips.id, id), eq(trips.organizationId, orgId), isNull(trips.deletedAt)))
      .returning();
    return trip ?? null;
  }

  async count(orgId: string) {
    const [result] = await this.database
      .select({ count: drizzleSql<number>`count(*)` })
      .from(trips)
      .where(and(eq(trips.organizationId, orgId), isNull(trips.deletedAt)));
    return result?.count ?? 0;
  }

  async updateStatus(id: string, orgId: string, status: string, extra: Record<string, unknown> = {}) {
    const data: Record<string, unknown> = { status, updatedAt: new Date(), ...extra };
    const [trip] = await this.database
      .update(trips)
      .set(data)
      .where(and(eq(trips.id, id), eq(trips.organizationId, orgId), isNull(trips.deletedAt)))
      .returning();
    return trip ?? null;
  }

  async insertEvent(data: {
    tripId: string;
    eventType: string;
    lat?: number;
    lng?: number;
    odometerKm?: number;
    note?: string;
    payload?: Record<string, unknown>;
    recordedBy: string;
  }) {
    const [event] = await this.database
      .insert(tripEvents)
      .values({
        tripId: data.tripId,
        eventType: data.eventType,
        lat: data.lat?.toString() ?? null,
        lng: data.lng?.toString() ?? null,
        odometerKm: data.odometerKm?.toString() ?? null,
        note: data.note ?? null,
        payload: data.payload ?? {},
        recordedBy: data.recordedBy,
        recordedAt: new Date(),
      })
      .returning();
    return event;
  }

  async getEvents(tripId: string) {
    return this.database
      .select()
      .from(tripEvents)
      .where(eq(tripEvents.tripId, tripId))
      .orderBy(desc(tripEvents.recordedAt));
  }

  async lockVehicleForDispatch(vehicleId: string, orgId: string) {
    const [row] = await this.database
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.organizationId, orgId),
          isNull(vehicles.deletedAt),
        ),
      )
      .for('update')
      .limit(1);
    return row ?? null;
  }

  async lockDriverForDispatch(driverId: string, orgId: string) {
    const [row] = await this.database
      .select()
      .from(drivers)
      .where(
        and(
          eq(drivers.id, driverId),
          eq(drivers.organizationId, orgId),
          isNull(drivers.deletedAt),
        ),
      )
      .for('update')
      .limit(1);
    return row ?? null;
  }

  async updateVehicleStatus(id: string, orgId: string, status: string) {
    await this.database
      .update(vehicles)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(vehicles.id, id), eq(vehicles.organizationId, orgId)));
  }

  async updateDriverStatus(id: string, orgId: string, status: string) {
    await this.database
      .update(drivers)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(drivers.id, id), eq(drivers.organizationId, orgId)));
  }

  async findAvailableVehicles(orgId: string) {
    return this.database
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.organizationId, orgId),
          eq(vehicles.status, 'available'),
          isNull(vehicles.deletedAt),
        ),
      );
  }

  async findAvailableDrivers(orgId: string) {
    return this.database
      .select()
      .from(drivers)
      .where(
        and(
          eq(drivers.organizationId, orgId),
          eq(drivers.status, 'available'),
          isNull(drivers.deletedAt),
        ),
      );
  }

  async findVehicleById(vehicleId: string, orgId: string) {
    const [row] = await this.database
      .select()
      .from(vehicles)
      .where(
        and(
          eq(vehicles.id, vehicleId),
          eq(vehicles.organizationId, orgId),
          isNull(vehicles.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findDriverById(driverId: string, orgId: string) {
    const [row] = await this.database
      .select()
      .from(drivers)
      .where(
        and(
          eq(drivers.id, driverId),
          eq(drivers.organizationId, orgId),
          isNull(drivers.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }
}
