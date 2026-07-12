import { subscribe } from '../bus.js';
import { TOPICS } from '../topics.js';
import { logger } from '../../logger.js';

let positionHandler: ((data: {
  vehicleId: string;
  lat: number;
  lng: number;
  speedKmph: number;
  heading?: number;
  source: string;
  tripId?: string;
}) => void) | null = null;

export function setPositionHandler(handler: typeof positionHandler) {
  positionHandler = handler;
}

export function initGeofenceBroadcastSubscriber(): void {
  subscribe(TOPICS.VEHICLE_POSITION_UPDATED, async (event) => {
    try {
      if (!positionHandler) return;

      const payload = event.payload as {
        vehicleId: string;
        lat: number;
        lng: number;
        speedKmph: number;
        heading?: number;
        odometerKm?: number;
        source: string;
        tripId?: string;
      };

      positionHandler({
        vehicleId: payload.vehicleId,
        lat: payload.lat,
        lng: payload.lng,
        speedKmph: payload.speedKmph,
        heading: payload.heading,
        source: payload.source,
        tripId: payload.tripId,
      });
    } catch (err) {
      logger.error({ err }, 'geofence_broadcast subscriber error');
    }
  });
}
