import { subscribe } from '../bus.js';
import { TOPICS } from '../topics.js';
import { logger } from '../../../lib/logger.js';

export function initNotificationSubscriber(): void {
  subscribe(TOPICS.FUEL_ANOMALY_DETECTED, async (_event) => {
    try {
      logger.info('notification subscriber: fuel anomaly detected (placeholder)');
    } catch (err) {
      logger.error({ err }, 'notification subscriber error (fuel_anomaly)');
    }
  });

  subscribe(TOPICS.MAINTENANCE_CREATED, async (_event) => {
    try {
      logger.info('notification subscriber: maintenance created (placeholder)');
    } catch (err) {
      logger.error({ err }, 'notification subscriber error (maintenance_created)');
    }
  });

  subscribe(TOPICS.MAINTENANCE_CLOSED, async (_event) => {
    try {
      logger.info('notification subscriber: maintenance closed (placeholder)');
    } catch (err) {
      logger.error({ err }, 'notification subscriber error (maintenance_closed)');
    }
  });

  subscribe(TOPICS.TRIP_DISPATCHED, async (_event) => {
    try {
      logger.info('notification subscriber: trip dispatched (placeholder)');
    } catch (err) {
      logger.error({ err }, 'notification subscriber error (trip_dispatched)');
    }
  });

  subscribe(TOPICS.TRIP_COMPLETED, async (_event) => {
    try {
      logger.info('notification subscriber: trip completed (placeholder)');
    } catch (err) {
      logger.error({ err }, 'notification subscriber error (trip_completed)');
    }
  });
}
