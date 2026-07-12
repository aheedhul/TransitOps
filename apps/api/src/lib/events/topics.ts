export const TOPICS = {
  VEHICLE_CREATED: 'vehicle.created',
  VEHICLE_UPDATED: 'vehicle.updated',
  VEHICLE_DELETED: 'vehicle.deleted',

  DRIVER_CREATED: 'driver.created',
  DRIVER_UPDATED: 'driver.updated',
  DRIVER_DELETED: 'driver.deleted',

  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',

  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  TRIP_CREATED: 'trip.created',
  TRIP_UPDATED: 'trip.updated',
  TRIP_DELETED: 'trip.deleted',
  TRIP_DISPATCHED: 'trip.dispatched',
  TRIP_STARTED: 'trip.started',
  TRIP_CHECKPOINT_ADDED: 'trip.checkpoint.added',
  TRIP_COMPLETED: 'trip.completed',
  TRIP_CANCELLED: 'trip.cancelled',

  MAINTENANCE_CREATED: 'maintenance.created',
  MAINTENANCE_UPDATED: 'maintenance.updated',
  MAINTENANCE_CLOSED: 'maintenance.closed',
  MAINTENANCE_DELETED: 'maintenance.deleted',

  MAINTENANCE_SCHEDULE_PREDICTED: 'maintenance.schedule.predicted',

  FUEL_LOG_CREATED: 'fuel.log.created',
  FUEL_LOG_UPDATED: 'fuel.log.updated',
  FUEL_LOG_DELETED: 'fuel.log.deleted',

  FUEL_ANOMALY_DETECTED: 'anomaly.fuel.detected',

  EXPENSE_CREATED: 'expense.created',
  EXPENSE_UPDATED: 'expense.updated',
  EXPENSE_DELETED: 'expense.deleted',

  NOTIFICATION_REQUESTED: 'notification.requested',
  NOTIFICATION_DELIVERED: 'notification.delivered',

  AUDIT_LOG_WRITTEN: 'audit.log.written',

  VEHICLE_SCORE_COMPUTED: 'vehicle.score.computed',
  DRIVER_SCORE_COMPUTED: 'driver.score.computed',
  CO2_EMISSION_RECORDED: 'co2.emission.recorded',
  COPILOT_VIEWED: 'copilot.viewed',
} as const;
