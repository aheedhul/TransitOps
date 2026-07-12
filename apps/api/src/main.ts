import { createServer } from './app.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { initAuditSubscriber } from './lib/events/subscribers/audit.js';
import { initFuelAnomalySubscriber } from './lib/events/subscribers/fuel-anomaly.js';
import { initMaintenanceScheduleSubscriber } from './lib/events/subscribers/maintenance-schedule.js';
import { initNotificationSubscriber } from './lib/events/subscribers/notifications.js';

initAuditSubscriber();
initFuelAnomalySubscriber();
initMaintenanceScheduleSubscriber();
initNotificationSubscriber();

const app = createServer();

const server = app.listen(env.API_PORT, () => {
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
