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

  TRIP_DISPATCHED: 'trip.dispatched',
  TRIP_COMPLETED: 'trip.completed',
  TRIP_CANCELLED: 'trip.cancelled',

  MAINTENANCE_CLOSED: 'maintenance.closed',
  FUEL_LOG_CREATED: 'fuel.log.created',

  AUDIT_LOG_WRITTEN: 'audit.log.written',
} as const;
