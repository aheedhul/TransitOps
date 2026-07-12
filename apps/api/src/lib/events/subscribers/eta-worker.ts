import { subscribe } from '../bus.js';
import { TOPICS } from '../topics.js';
import { logger } from '../../logger.js';
import { db } from '../../../db/index.js';
import { trips, vehicleLocations } from '../../../db/schema.js';
import { eq, and, desc, isNull, sql as drizzleSql } from 'drizzle-orm';
import { getMapsAdapter } from '../../maps/adapter.js';

const ewmaAlphas = new Map<string, { speed: number }>();

export function initEtaWorkerSubscriber(): void {
  subscribe(TOPICS.VEHICLE_POSITION_UPDATED, async (event) => {
    try {
      const payload = event.payload as {
        vehicleId: string;
        lat: number;
        lng: number;
        speedKmph: number;
        tripId?: string;
      };

      if (!payload.tripId || payload.speedKmph < 0.1) return;

      const tripId = payload.tripId;
      const positions = await db
        .select({
          speedKmph: vehicleLocations.speedKmph,
          lat: vehicleLocations.lat,
          lng: vehicleLocations.lng,
        })
        .from(vehicleLocations)
        .where(
          and(
            eq(vehicleLocations.tripId, tripId),
            drizzleSql`${vehicleLocations.recordedAt} > now() - interval '15 minutes'`,
          ),
        )
        .orderBy(desc(vehicleLocations.recordedAt))
        .limit(10);

      const alpha = 0.3;
      const key = tripId;
      let ewma = ewmaAlphas.get(key);

      if (!ewma) {
        const speeds = positions.map((p) => Number(p.speedKmph));
        const avg = speeds.length > 0
          ? speeds.reduce((a, b) => a + b, 0) / speeds.length
          : payload.speedKmph;
        ewma = { speed: avg };
        ewmaAlphas.set(key, ewma);
      }

      ewma.speed = alpha * payload.speedKmph + (1 - alpha) * ewma.speed;
      ewmaAlphas.set(key, ewma);

      const [trip] = await db
        .select({
          id: trips.id,
          destinationLat: trips.destinationLat,
          destinationLng: trips.destinationLng,
          organizationId: trips.organizationId,
          status: trips.status,
          plannedArrivalAt: trips.plannedArrivalAt,
        })
        .from(trips)
        .where(and(eq(trips.id, tripId), isNull(trips.deletedAt)))
        .limit(1);

      if (!trip || trip.status !== 'in-transit') return;
      if (!trip.destinationLat || !trip.destinationLng) return;

      const destLat = Number(trip.destinationLat);
      const destLng = Number(trip.destinationLng);

      const maps = getMapsAdapter();
      const route = await maps.route(
        { lat: payload.lat, lng: payload.lng },
        { lat: destLat, lng: destLng },
      );

      const trafficFactor = 1.0 + Math.random() * 0.3;
      const etaMins = route.durationMin * trafficFactor;
      const estimatedArrival = new Date(Date.now() + etaMins * 60_000);

      await db
        .update(trips)
        .set({ updatedAt: new Date() })
        .where(and(eq(trips.id, tripId), isNull(trips.deletedAt)));

      if (trip.plannedArrivalAt) {
        const planned = new Date(trip.plannedArrivalAt);
        const delayMins = (estimatedArrival.getTime() - planned.getTime()) / 60_000;

        if (delayMins > 15) {
          await db
            .update(trips)
            .set({ updatedAt: new Date() })
            .where(and(eq(trips.id, tripId), isNull(trips.deletedAt)));

          void import('../bus.js').then(({ publish, createEvent }) => {
            publish(
              createEvent(TOPICS.TRIP_ETA_CHANGED, {
                actorId: event.actorId,
                organizationId: trip.organizationId ?? '',
                entityType: 'trip',
                entityId: tripId,
                payload: {
                  tripId,
                  delayMins: Math.round(delayMins),
                  estimatedArrival: estimatedArrival.toISOString(),
                  plannedArrival: trip.plannedArrivalAt,
                  ewmaSpeedKmph: Math.round(ewma.speed * 10) / 10,
                },
              }),
            );
          });
        }
      }
    } catch (err) {
      logger.error({ err }, 'eta_worker subscriber error');
    }
  });
}
