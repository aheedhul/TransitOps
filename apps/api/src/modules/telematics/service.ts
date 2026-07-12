import { TelematicsRepository } from './repository.js';
import type { TelematicsIngestInput, VehicleLocationResponse, FleetPositionResponse } from './dto.js';
import { publish, createEvent } from '../../lib/events/bus.js';
import { TOPICS } from '../../lib/events/topics.js';

export class TelematicsService {
  constructor(private readonly repo: TelematicsRepository = new TelematicsRepository()) {}

  async ingest(input: TelematicsIngestInput, _actorId: string) {
    const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();

    const row = await this.repo.insert({
      vehicleId: input.vehicleId,
      lat: input.lat,
      lng: input.lng,
      heading: input.heading,
      speedKmph: input.speedKmph,
      odometerKm: input.odometerKm,
      source: input.source,
      tripId: input.tripId,
      recordedAt,
    });
    if (!row) throw new Error('Failed to insert location');

    if (input.odometerKm !== undefined) {
      void this.repo.updateVehicleOdometer(input.vehicleId, input.odometerKm);
    }

    void publish(
      createEvent(TOPICS.VEHICLE_POSITION_UPDATED, {
        actorId: _actorId,
        organizationId: '',
        entityType: 'vehicle_location',
        entityId: row.id,
        payload: {
          vehicleId: input.vehicleId,
          lat: input.lat,
          lng: input.lng,
          speedKmph: input.speedKmph,
          odometerKm: input.odometerKm,
          source: input.source,
          tripId: input.tripId,
        },
      }),
    );

    return serializeLocation(row);
  }

  async ingestBatch(positions: TelematicsIngestInput[], _actorId: string) {
    const now = new Date();
    const rows = await this.repo.insertBatch(
      positions.map((p) => ({
        vehicleId: p.vehicleId,
        lat: p.lat,
        lng: p.lng,
        heading: p.heading,
        speedKmph: p.speedKmph,
        odometerKm: p.odometerKm,
        source: p.source,
        tripId: p.tripId,
        recordedAt: p.recordedAt ? new Date(p.recordedAt) : now,
      })),
    );

    for (const [i, row] of rows.entries()) {
      const pos = positions[i];
      if (!pos) continue;
      void publish(
        createEvent(TOPICS.VEHICLE_POSITION_UPDATED, {
          actorId: _actorId,
          organizationId: '',
          entityType: 'vehicle_location',
          entityId: row.id,
          payload: {
            vehicleId: pos.vehicleId,
            lat: pos.lat,
            lng: pos.lng,
            speedKmph: pos.speedKmph,
            odometerKm: pos.odometerKm,
            source: pos.source,
            tripId: pos.tripId,
          },
        }),
      );
    }

    return rows.map(serializeLocation);
  }

  async getLatestForVehicle(vehicleId: string) {
    const rows = await this.repo.findLatest(vehicleId, 1);
    const first = rows[0];
    return first ? serializeLocation(first) : null;
  }

  async getFleetPositions(orgId: string): Promise<FleetPositionResponse[]> {
    const rows = await this.repo.findLatestAll(orgId);
    return rows.map((row) => ({
      id: row.id as string,
      vehicleId: row.vehicleId as string,
      lat: Number(row.lat),
      lng: Number(row.lng),
      heading: row.heading ? Number(row.heading) : null,
      speedKmph: Number(row.speedKmph),
      odometerKm: row.odometerKm ? Number(row.odometerKm) : null,
      source: row.source as string,
      tripId: (row.tripId as string) ?? null,
      recordedAt: (row.recordedAt as Date).toISOString(),
      vehicleName: (row.vehicleName as string) ?? 'Unknown',
      vehicleStatus: (row.vehicleStatus as string) ?? 'available',
    }));
  }
}

function serializeLocation(row: Record<string, unknown>): VehicleLocationResponse {
  return {
    id: row.id as string,
    vehicleId: row.vehicleId as string,
    lat: Number(row.lat),
    lng: Number(row.lng),
    heading: row.heading ? Number(row.heading) : null,
    speedKmph: Number(row.speedKmph),
    odometerKm: row.odometerKm ? Number(row.odometerKm) : null,
    source: row.source as string,
    tripId: (row.tripId as string) ?? null,
    recordedAt: (row.recordedAt as Date).toISOString(),
  };
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
