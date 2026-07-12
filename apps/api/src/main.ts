import { createServer as createHttpServer } from 'node:http';
import { createServer } from './app.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { initAuditSubscriber } from './lib/events/subscribers/audit.js';
import { initFuelAnomalySubscriber } from './lib/events/subscribers/fuel-anomaly.js';
import { initMaintenanceScheduleSubscriber } from './lib/events/subscribers/maintenance-schedule.js';
import { initNotificationSubscriber } from './lib/events/subscribers/notifications.js';
import { initScoringSubscriber } from './lib/events/subscribers/scoring.js';
import { initEmissionsSubscriber } from './lib/events/subscribers/emissions.js';
import { initGeofenceMatcherSubscriber } from './lib/events/subscribers/geofence-matcher.js';
import { initEtaWorkerSubscriber } from './lib/events/subscribers/eta-worker.js';
import { initGeofenceBroadcastSubscriber, setPositionHandler } from './lib/events/subscribers/geofence-broadcast.js';
import { createRealtimeServer, broadcastFleetUpdate } from './lib/realtime/ws-server.js';

initAuditSubscriber();
initFuelAnomalySubscriber();
initMaintenanceScheduleSubscriber();
initNotificationSubscriber();
initScoringSubscriber();
initEmissionsSubscriber();
initGeofenceMatcherSubscriber();
initEtaWorkerSubscriber();
initGeofenceBroadcastSubscriber();

const app = createServer();
const httpServer = createHttpServer(app);

createRealtimeServer(httpServer);

setPositionHandler((data) => {
  broadcastFleetUpdate('', {
    type: 'position_update',
    payload: {
      vehicleId: data.vehicleId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading ?? null,
      speedKmph: data.speedKmph,
      source: data.source,
      tripId: data.tripId ?? null,
    },
  });
});

const server = httpServer.listen(env.API_PORT, () => {
  logger.info({ port: env.API_PORT }, 'api listening');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down');
  server.close(() => process.exit(0));
});
