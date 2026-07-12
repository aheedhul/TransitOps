import { subscribe } from '../bus.js';
import { TOPICS } from '../topics.js';
import { db } from '../../../db/index.js';
import { emissionsRecords, emissionsFactors, vehicles, trips } from '../../../db/schema.js';
import { eq, and, isNull } from 'drizzle-orm';
import { logger } from '../../../lib/logger.js';

const DEFAULT_FACTORS: Record<string, number> = {
  diesel: 2.68,
  petrol: 2.31,
  cng: 1.93,
  electric: 0.0,
  hybrid: 1.5,
};

export function initEmissionsSubscriber(): void {
  subscribe(TOPICS.TRIP_COMPLETED, async (event) => {
    try {
      const payload = event.payload as { tripId?: string; vehicleId?: string };
      const tripId = payload.tripId ?? event.entity.id;

      if (!tripId) return;

      const trip = await db
        .select()
        .from(trips)
        .where(and(eq(trips.id, tripId), eq(trips.organizationId, event.organizationId), isNull(trips.deletedAt)))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!trip || trip.status !== 'completed') return;

      const vehicle = await db
        .select()
        .from(vehicles)
        .where(and(eq(vehicles.id, trip.vehicleId!), isNull(vehicles.deletedAt)))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!vehicle) return;

      const distanceKm = parseFloat(trip.actualDistanceKm as string) || 0;
      const fuelConsumedL = parseFloat(trip.fuelConsumedL as string) || 0;
      const fuelType = vehicle.fuelType as string;

      const factor = await getEmissionFactor(fuelType);
      let co2Kg: number;
      let method: string;

      if (fuelConsumedL > 0) {
        co2Kg = fuelConsumedL * factor;
        method = 'ipcc';
      } else if (distanceKm > 0) {
        const estFuelL = distanceKm / getClassAvgKpl(fuelType);
        co2Kg = estFuelL * factor;
        method = 'estimated';
      } else {
        logger.debug({ tripId }, 'co2: no distance or fuel data, skipping');
        return;
      }

      const periodStart = trip.completedAt ? new Date(trip.completedAt as unknown as string) : new Date();
      const periodEnd = new Date(periodStart);

      await db.insert(emissionsRecords).values({
        organizationId: event.organizationId,
        vehicleId: vehicle.id,
        tripId: trip.id,
        periodStart,
        periodEnd,
        distanceKm: distanceKm.toString(),
        fuelConsumedL: fuelConsumedL > 0 ? fuelConsumedL.toString() : null,
        electricityKwh: fuelType === 'electric' ? (fuelConsumedL > 0 ? fuelConsumedL.toString() : null) : null,
        co2Kg: co2Kg.toString(),
        method,
      });

      logger.info({ tripId, co2Kg: Math.round(co2Kg * 100) / 100, method }, 'co2 emission recorded');
    } catch (err) {
      logger.error({ err }, 'co2 emission subscriber error');
    }
  });
}

async function getEmissionFactor(fuelType: string): Promise<number> {
  const row = await db
    .select()
    .from(emissionsFactors)
    .where(eq(emissionsFactors.fuelType, fuelType))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (row) return parseFloat(row.co2PerL as string);

  return DEFAULT_FACTORS[fuelType] ?? 2.68;
}

function getClassAvgKpl(fuelType: string): number {
  switch (fuelType) {
    case 'diesel': return 3.8;
    case 'petrol': return 10.0;
    case 'cng': return 5.0;
    case 'electric': return 6.0;
    case 'hybrid': return 12.0;
    default: return 5.0;
  }
}
