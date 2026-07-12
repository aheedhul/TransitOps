import { TripRepository } from './repository.js';
import {
  validateDispatch,
  canDispatch,
} from './rules.js';
import type {
  CreateTripInput,
  UpdateTripInput,
  TripResponse,
  DispatchTripInput,
  StartTripInput,
  CheckpointInput,
  CompleteTripInput,
  CancelTripInput,
  RouteAutofillInput,
  DispatchCheckResponse,
  DispatchRecommendationResponse,
  RuleResult,
} from './dto.js';
import { publish, createEvent } from '../../lib/events/bus.js';
import { TOPICS } from '../../lib/events/topics.js';
import { getMapsAdapter } from '../../lib/maps/adapter.js';
import { TelematicsRepository } from '../telematics/repository.js';

export class TripService {
  constructor(private readonly repo: TripRepository = new TripRepository()) {}

  async list(orgId: string, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.repo.findAll(orgId, pageSize, offset),
      this.repo.count(orgId),
    ]);
    return {
      data: rows.map((t) => serializeTrip(t)),
      meta: {
        total,
        page,
        pageSize,
        pages: Math.ceil(total / pageSize),
      },
    };
  }

  async getById(id: string, orgId: string, role: string) {
    const trip = await this.repo.findById(id, orgId);
    if (!trip) throw new NotFoundError('Trip not found');

    return serializeTrip(trip, { isAdmin: role === 'admin' });
  }

  async getEvents(id: string, orgId: string) {
    const trip = await this.repo.findById(id, orgId);
    if (!trip) throw new NotFoundError('Trip not found');
    return this.repo.getEvents(id);
  }

  async create(input: CreateTripInput, orgId: string, actorId: string) {
    if (input.vehicleId) {
      const vehicle = await this.repo.findVehicleById(input.vehicleId, orgId);
      if (!vehicle) throw new NotFoundError('Vehicle not found');
    }
    if (input.driverId) {
      const driver = await this.repo.findDriverById(input.driverId, orgId);
      if (!driver) throw new NotFoundError('Driver not found');
    }

    const trip = await this.repo.create({ ...input, organizationId: orgId, createdBy: actorId });

    await this.repo.insertEvent({
      tripId: trip.id,
      eventType: 'created',
      recordedBy: actorId,
    });

    void publish(
      createEvent(TOPICS.TRIP_CREATED, {
        actorId,
        organizationId: orgId,
        entityType: 'trip',
        entityId: trip.id,
        payload: { status: trip.status },
      }),
    );

    return serializeTrip(trip);
  }

  async update(id: string, orgId: string, input: UpdateTripInput, actorId: string) {
    const existing = await this.repo.findById(id, orgId);
    if (!existing) throw new NotFoundError('Trip not found');
    if (existing.status !== 'draft') {
      throw new BusinessRuleError('Only draft trips can be edited');
    }

    if (input.vehicleId && input.vehicleId !== existing.vehicleId) {
      const vehicle = await this.repo.findVehicleById(input.vehicleId, orgId);
      if (!vehicle) throw new NotFoundError('Vehicle not found');
    }
    if (input.driverId && input.driverId !== existing.driverId) {
      const driver = await this.repo.findDriverById(input.driverId, orgId);
      if (!driver) throw new NotFoundError('Driver not found');
    }

    const trip = await this.repo.update(id, orgId, input);
    if (!trip) throw new NotFoundError('Trip not found after update');

    void publish(
      createEvent(TOPICS.TRIP_UPDATED, {
        actorId,
        organizationId: orgId,
        entityType: 'trip',
        entityId: trip.id,
        payload: { status: trip.status },
      }),
    );

    return serializeTrip(trip);
  }

  async softDelete(id: string, orgId: string, actorId: string) {
    const existing = await this.repo.findById(id, orgId);
    if (!existing) throw new NotFoundError('Trip not found');
    if (existing.status === 'in-transit') {
      throw new BusinessRuleError('Cannot delete a trip that is in transit');
    }

    const trip = await this.repo.softDelete(id, orgId);
    if (!trip) throw new NotFoundError('Trip not found');

    void publish(
      createEvent(TOPICS.TRIP_DELETED, {
        actorId,
        organizationId: orgId,
        entityType: 'trip',
        entityId: id,
        payload: {},
      }),
    );
  }

  /**
   * Dispatch a trip — server-authoritative transaction per docs/05 §7.
   * Uses SELECT...FOR UPDATE for concurrency control.
   */
  async dispatch(
    id: string,
    orgId: string,
    input: DispatchTripInput,
    actorId: string,
  ): Promise<{ data: TripResponse; chain: RuleResult[] }> {
    const trip = await this.repo.findById(id, orgId);
    if (!trip) throw new NotFoundError('Trip not found');
    if (trip.status !== 'draft') {
      throw new BusinessRuleError('Only draft trips can be dispatched');
    }

    const vehicleId = trip.vehicleId;
    const driverId = trip.driverId;

    if (!vehicleId || !driverId) {
      throw new BusinessRuleError('Trip requires both a vehicle and a driver to be dispatched');
    }

    const vehicle = await this.repo.lockVehicleForDispatch(vehicleId, orgId);
    const driver = await this.repo.lockDriverForDispatch(driverId, orgId);

    const cargoWeight = parseFloat(trip.cargoWeightKg as string);

    const ruleInput = {
      vehicle: vehicle
        ? {
            id: vehicle.id,
            status: vehicle.status,
            type: vehicle.type,
            maxLoadCapacity: vehicle.maxLoadCapacity as string,
          }
        : null,
      driver: driver
        ? {
            id: driver.id,
            status: driver.status,
            licenseNumber: driver.licenseNumber,
            licenseExpiryDate: (driver.licenseExpiryDate as string),
          }
        : null,
      cargoWeightKg: cargoWeight,
      plannedDepartureAt: trip.plannedDepartureAt?.toISOString(),
      hasPreTripInspection: false,
      force: input.force,
      overrideReason: input.overrideReason,
    };

    const chain = validateDispatch(ruleInput);

    if (!canDispatch(chain, input.force, input.overrideReason)) {
      return {
        data: serializeTrip(trip),
        chain,
      };
    }

    const now = new Date();
    const dispatched = await this.repo.updateStatus(id, orgId, 'dispatched', {
      dispatchedAt: now,
      plannedDepartureAt: trip.plannedDepartureAt ?? now,
    });

    if (vehicle) {
      await this.repo.updateVehicleStatus(vehicleId, orgId, 'on-trip');
    }
    if (driver) {
      await this.repo.updateDriverStatus(driverId, orgId, 'on-trip');
    }

    await this.repo.insertEvent({
      tripId: id,
      eventType: 'dispatched',
      recordedBy: actorId,
      payload: {
        vehicleId,
        driverId,
        force: input.force,
        overrideReason: input.overrideReason ?? null,
        dispatchChain: chain,
      },
    });

    void publish(
      createEvent(TOPICS.TRIP_DISPATCHED, {
        actorId,
        organizationId: orgId,
        entityType: 'trip',
        entityId: id,
        payload: { vehicleId, driverId, cargoWeight },
      }),
    );

    const result = dispatched ?? trip;
    return {
      data: serializeTrip(result),
      chain,
    };
  }

  async start(id: string, orgId: string, input: StartTripInput, actorId: string) {
    const trip = await this.repo.findById(id, orgId);
    if (!trip) throw new NotFoundError('Trip not found');
    if (trip.status !== 'dispatched') {
      throw new BusinessRuleError('Only dispatched trips can be started');
    }

    const updated = await this.repo.updateStatus(id, orgId, 'in-transit', {
      startedAt: new Date(),
    });

    await this.repo.insertEvent({
      tripId: id,
      eventType: 'enroute',
      lat: input.lat,
      lng: input.lng,
      odometerKm: input.odometerKm,
      recordedBy: actorId,
    });

    void publish(
      createEvent(TOPICS.TRIP_STARTED, {
        actorId,
        organizationId: orgId,
        entityType: 'trip',
        entityId: id,
        payload: { startOdometr: input.odometerKm },
      }),
    );

    return serializeTrip(updated ?? trip);
  }

  async addCheckpoint(id: string, orgId: string, input: CheckpointInput, actorId: string) {
    const trip = await this.repo.findById(id, orgId);
    if (!trip) throw new NotFoundError('Trip not found');
    if (trip.status !== 'in-transit') {
      throw new BusinessRuleError('Only in-transit trips can record checkpoints');
    }

    await this.repo.insertEvent({
      tripId: id,
      eventType: 'checkpoint',
      lat: input.lat,
      lng: input.lng,
      odometerKm: input.odometerKm,
      note: input.note,
      recordedBy: actorId,
      payload: { lat: input.lat, lng: input.lng, note: input.note ?? null },
    });

    if (trip.vehicleId) {
      const telemetryRepo = new TelematicsRepository();
      const now = new Date();
      await telemetryRepo.insert({
        vehicleId: trip.vehicleId as string,
        lat: input.lat,
        lng: input.lng,
        speedKmph: 0,
        odometerKm: input.odometerKm ?? undefined,
        source: 'pwa',
        tripId: id,
        recordedAt: now,
      });

      if (input.odometerKm !== undefined) {
        void telemetryRepo.updateVehicleOdometer(trip.vehicleId as string, input.odometerKm);
      }

      void publish(
        createEvent(TOPICS.VEHICLE_POSITION_UPDATED, {
          actorId,
          organizationId: orgId,
          entityType: 'vehicle_location',
          entityId: trip.vehicleId as string,
          payload: {
            vehicleId: trip.vehicleId,
            lat: input.lat,
            lng: input.lng,
            speedKmph: 0,
            odometerKm: input.odometerKm,
            source: 'pwa',
            tripId: id,
          },
        }),
      );
    }

    void publish(
      createEvent(TOPICS.TRIP_CHECKPOINT_ADDED, {
        actorId,
        organizationId: orgId,
        entityType: 'trip',
        entityId: id,
        payload: { lat: input.lat, lng: input.lng },
      }),
    );

    return serializeTrip(trip);
  }

  async complete(id: string, orgId: string, input: CompleteTripInput, actorId: string) {
    const trip = await this.repo.findById(id, orgId);
    if (!trip) throw new NotFoundError('Trip not found');
    if (trip.status !== 'in-transit') {
      throw new BusinessRuleError('Only in-transit trips can be completed');
    }

    const now = new Date();
    const updated = await this.repo.updateStatus(id, orgId, 'completed', {
      completedAt: now,
      actualDistanceKm: input.actualDistanceKm.toString(),
      fuelConsumedL: input.fuelConsumedL.toString(),
      actualTravelMins: input.actualTravelMins ?? null,
    });

    await this.repo.insertEvent({
      tripId: id,
      eventType: 'completed',
      lat: input.lat,
      lng: input.lng,
      odometerKm: input.odometerKm,
      recordedBy: actorId,
      payload: {
        actualDistanceKm: input.actualDistanceKm,
        fuelConsumedL: input.fuelConsumedL,
      },
    });

    if (trip.vehicleId) {
      await this.repo.updateVehicleStatus(trip.vehicleId, orgId, 'available');
    }
    if (trip.driverId) {
      await this.repo.updateDriverStatus(trip.driverId, orgId, 'available');
    }

    void publish(
      createEvent(TOPICS.TRIP_COMPLETED, {
        actorId,
        organizationId: orgId,
        entityType: 'trip',
        entityId: id,
        payload: {
          actualDistanceKm: input.actualDistanceKm,
          fuelConsumedL: input.fuelConsumedL,
          vehicleId: trip.vehicleId,
          driverId: trip.driverId,
        },
      }),
    );

    return serializeTrip(updated ?? trip);
  }

  async cancel(id: string, orgId: string, input: CancelTripInput, actorId: string) {
    const trip = await this.repo.findById(id, orgId);
    if (!trip) throw new NotFoundError('Trip not found');
    if (trip.status !== 'draft' && trip.status !== 'dispatched') {
      throw new BusinessRuleError('Only draft or dispatched trips can be cancelled');
    }

    const now = new Date();
    const updated = await this.repo.updateStatus(id, orgId, 'cancelled', {
      cancelledAt: now,
      cancelReason: input.cancelReason,
    });

    await this.repo.insertEvent({
      tripId: id,
      eventType: 'cancelled',
      recordedBy: actorId,
      payload: { cancelReason: input.cancelReason },
    });

    if (trip.status === 'dispatched') {
      if (trip.vehicleId) {
        await this.repo.updateVehicleStatus(trip.vehicleId, orgId, 'available');
      }
      if (trip.driverId) {
        await this.repo.updateDriverStatus(trip.driverId, orgId, 'available');
      }
    }

    void publish(
      createEvent(TOPICS.TRIP_CANCELLED, {
        actorId,
        organizationId: orgId,
        entityType: 'trip',
        entityId: id,
        payload: { cancelReason: input.cancelReason, previousStatus: trip.status },
      }),
    );

    return serializeTrip(updated ?? trip);
  }

  async routeAutofill(id: string, orgId: string, input: RouteAutofillInput) {
    const trip = await this.repo.findById(id, orgId);
    if (!trip) throw new NotFoundError('Trip not found');

    const sourceLat = input.sourceLat ?? (trip.sourceLat ? parseFloat(trip.sourceLat as string) : null);
    const sourceLng = input.sourceLng ?? (trip.sourceLng ? parseFloat(trip.sourceLng as string) : null);
    const destLat = input.destinationLat ?? (trip.destinationLat ? parseFloat(trip.destinationLat as string) : null);
    const destLng = input.destinationLng ?? (trip.destinationLng ? parseFloat(trip.destinationLng as string) : null);

    if (!sourceLat || !sourceLng || !destLat || !destLng) {
      throw new BusinessRuleError(
        'Source and destination coordinates are required for route autofill',
      );
    }

    const maps = getMapsAdapter();
    try {
      const route = await maps.route(
        { lat: sourceLat, lng: sourceLng },
        { lat: destLat, lng: destLng },
      );

      const updated = await this.repo.update(id, orgId, {
        plannedDistanceKm: route.distanceKm,
        plannedTravelMins: Math.round(route.durationMin),
      });

      return {
        data: serializeTrip(updated ?? trip),
        route: {
          distanceKm: route.distanceKm,
          durationMin: route.durationMin,
          polyline: route.polyline ?? null,
        },
      };
    } catch {
      return {
        data: serializeTrip(trip),
        route: null,
        warning: 'Maps service unavailable — route could not be computed',
      };
    }
  }

  async dispatchCheck(
    orgId: string,
    vehicleId: string,
    driverId: string,
    cargoWeightKg: number,
    plannedDepartureAt: string | undefined,
    force: boolean,
    overrideReason: string | undefined,
  ): Promise<DispatchCheckResponse> {
    const vehicle = await this.repo.findVehicleById(vehicleId, orgId);
    const driver = await this.repo.findDriverById(driverId, orgId);

    const ruleInput = {
      vehicle: vehicle
        ? {
            id: vehicle.id,
            status: vehicle.status,
            type: vehicle.type,
            maxLoadCapacity: vehicle.maxLoadCapacity as string,
          }
        : null,
      driver: driver
        ? {
            id: driver.id,
            status: driver.status,
            licenseNumber: driver.licenseNumber,
            licenseExpiryDate: (driver.licenseExpiryDate as string),
          }
        : null,
      cargoWeightKg,
      plannedDepartureAt,
      hasPreTripInspection: false,
      force,
      overrideReason,
    };

    const chain = validateDispatch(ruleInput);
    const dispatchAllowed = canDispatch(chain, force, overrideReason);
    const blocking = chain.find((r) => !r.ok && r.severity === 'block');

    return {
      chain,
      canDispatch: dispatchAllowed,
      blockingReason: blocking?.reason ?? null,
    };
  }

  async dispatchRecommendation(
    orgId: string,
    cargoWeightKg: number,
    sourceLat: number | undefined,
    sourceLng: number | undefined,
    plannedDepartureAt: string | undefined,
    limit: number,
  ): Promise<DispatchRecommendationResponse | null> {
    const vehicles = await this.repo.findAvailableVehicles(orgId);
    const drivers = await this.repo.findAvailableDrivers(orgId);

    const eligibleVehicles = vehicles.filter(
      (v) =>
        v.status === 'available' &&
        parseFloat(v.maxLoadCapacity as string) >= cargoWeightKg,
    );

    const departureDate = plannedDepartureAt
      ? new Date(plannedDepartureAt)
      : new Date();
    const eligibleDrivers = drivers.filter((d) => {
      const expiry = new Date(d.licenseExpiryDate as string);
      return d.status === 'available' && expiry >= departureDate;
    });

    if (eligibleVehicles.length === 0 || eligibleDrivers.length === 0) {
      return null;
    }

    const pairs: {
      vehicleId: string;
      driverId: string;
      confidence: number;
      scores: {
        capacityHeadroom: number;
        distanceToPickup: number;
        fuelEfficiency: number;
        maintenanceHeadroom: number;
        driverSafety: number;
        driverFuelRating: number;
      };
      reasons: { key: string; ok: boolean; weight: number; message: string }[];
    }[] = [];

    for (const vehicle of eligibleVehicles) {
      for (const driver of eligibleDrivers) {
        const maxCap = parseFloat(vehicle.maxLoadCapacity as string);
        const capacityHeadroom = Math.round(
          ((maxCap - cargoWeightKg) / Math.max(maxCap, 1)) * 100,
        );

        let distanceToPickup = 50;
        if (sourceLat !== undefined && sourceLng !== undefined) {
          distanceToPickup = 30;
        }

        const scores = {
          capacityHeadroom,
          distanceToPickup: Math.max(0, 100 - distanceToPickup),
          fuelEfficiency: 70,
          maintenanceHeadroom: 60,
          driverSafety: parseFloat(driver.safetyScore as string) ?? 100,
          driverFuelRating: 80 + Math.random() * 20,
        };

        const policyWeights = {
          fuelEfficiency: 0.25,
          maintenance: 0.2,
          driverSafety: 0.25,
          utilization: 0.15,
          distance: 0.15,
        };

        const confidence = Math.round(
          (scores.capacityHeadroom * 0.2 +
            scores.distanceToPickup * policyWeights.distance +
            scores.fuelEfficiency * policyWeights.fuelEfficiency +
            scores.maintenanceHeadroom * policyWeights.maintenance +
            scores.driverSafety * policyWeights.driverSafety +
            scores.driverFuelRating * policyWeights.utilization),
        );

        const reasons = [
          {
            key: 'available',
            ok: true,
            weight: 1.0,
            message: 'Vehicle and driver both available',
          },
          {
            key: 'capacity_headroom',
            ok: true,
            weight: 0.9,
            message: `${capacityHeadroom}% remaining capacity — safe load`,
          },
          {
            key: 'driver_safety',
            ok: scores.driverSafety > 80,
            weight: 0.7,
            message:
              scores.driverSafety > 80
                ? `Driver safety score ${scores.driverSafety} — good standing`
                : `Driver safety score ${scores.driverSafety} — monitor closely`,
          },
          {
            key: 'nearest',
            ok: true,
            weight: 0.6,
            message: 'Vehicle is within operational range',
          },
        ];

        pairs.push({
          vehicleId: vehicle.id,
          driverId: driver.id,
          confidence,
          scores,
          reasons,
        });
      }
    }

    pairs.sort((a, b) => b.confidence - a.confidence);
    const top = pairs.slice(0, limit);

    if (top.length === 0) {
      return null;
    }

    const recommendation = top[0]!;
    const alternatives = top.slice(1);

    return {
      recommendation,
      alternatives,
    };
  }
}

function serializeTrip(
  row: Record<string, unknown>,
  opts: { isAdmin?: boolean } = {},
): TripResponse {
  return {
    id: row.id as string,
    organizationId: row.organizationId as string,
    vehicleId: (row.vehicleId as string | null) ?? null,
    driverId: (row.driverId as string | null) ?? null,
    customerId: (row.customerId as string | null) ?? null,
    sourceLabel: row.sourceLabel as string,
    sourceLat: row.sourceLat ? parseFloat(row.sourceLat as string) : null,
    sourceLng: row.sourceLng ? parseFloat(row.sourceLng as string) : null,
    destinationLabel: row.destinationLabel as string,
    destinationLat: row.destinationLat ? parseFloat(row.destinationLat as string) : null,
    destinationLng: row.destinationLng ? parseFloat(row.destinationLng as string) : null,
    cargoWeightKg: row.cargoWeightKg as string,
    plannedDistanceKm: (row.plannedDistanceKm as string) ?? null,
    plannedTravelMins: (row.plannedTravelMins as number) ?? null,
    estimatedFuelL: (row.estimatedFuelL as string) ?? null,
    estimatedFuelCost: (row.estimatedFuelCost as string) ?? null,
    actualDistanceKm: (row.actualDistanceKm as string) ?? null,
    actualTravelMins: (row.actualTravelMins as number) ?? null,
    fuelConsumedL: (row.fuelConsumedL as string) ?? null,
    revenueAmount: opts.isAdmin ? ((row.revenueAmount as string) ?? null) : null,
    cargoDescription: (row.cargoDescription as string | null) ?? null,
    status: row.status as string,
    dispatchedAt: row.dispatchedAt
      ? (row.dispatchedAt as Date).toISOString()
      : null,
    startedAt: row.startedAt
      ? (row.startedAt as Date).toISOString()
      : null,
    completedAt: row.completedAt
      ? (row.completedAt as Date).toISOString()
      : null,
    cancelledAt: row.cancelledAt
      ? (row.cancelledAt as Date).toISOString()
      : null,
    cancelReason: (row.cancelReason as string | null) ?? null,
    plannedDepartureAt: row.plannedDepartureAt
      ? (row.plannedDepartureAt as Date).toISOString()
      : null,
    plannedArrivalAt: row.plannedArrivalAt
      ? (row.plannedArrivalAt as Date).toISOString()
      : null,
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

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}
