import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  numeric,
  date,
  integer,
  jsonb,
  unique,
  index,
  check,
  inet,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================
// Phase 0
// ============================================================
export const healthz = pgTable('healthz', {
  id: varchar('id', { length: 36 }).primaryKey(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================
// Phase 1 — Core platform tables
// ============================================================

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  currencyCode: text('currency_code').notNull().default('INR'),
  locale: text('locale').notNull().default('en'),
  timezone: text('timezone').notNull().default('Asia/Kolkata'),
  unitSystem: text('unit_system').notNull().default('metric'),
  settings: jsonb('settings').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').notNull(),
    status: text('status').notNull().default('active'),
    mfaSecret: text('mfa_secret'),
    mfaRecoveryCodes: text('mfa_recovery_codes').array().notNull().default(sql`'{}'`),
    notificationPrefs: jsonb('notification_prefs').notNull().default(sql`'{}'::jsonb`),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_users_org_email').on(table.organizationId, table.email),
    index('idx_users_org_role').on(table.organizationId, table.role).where(sql`${table.deletedAt} is null`),
    check('chk_users_role', sql`${table.role} in ('admin','fleet_manager','driver','safety_officer','financial_analyst')`),
    check('chk_users_status', sql`${table.status} in ('active','invited','suspended','deactivated')`),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    familyId: uuid('family_id').notNull(),
    userAgent: text('user_agent'),
    ip: inet('ip'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    replacedBy: uuid('replaced_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_refresh_tokens_user').on(table.userId),
    index('idx_refresh_tokens_hash').on(table.tokenHash),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    actorId: uuid('actor_id').references(() => users.id),
    actorKind: text('actor_kind').notNull().default('user'),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    eventId: uuid('event_id'),
    traceId: text('trace_id'),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_org_time').on(table.organizationId, table.occurredAt.desc()),
    index('idx_audit_entity').on(table.entityType, table.entityId, table.occurredAt.desc()),
    index('idx_audit_actor').on(table.actorId, table.occurredAt.desc()),
    check('chk_audit_actor_kind', sql`${table.actorKind} in ('user','system','job')`),
  ],
);

export const eventConsumers = pgTable(
  'event_consumers',
  {
    eventId: uuid('event_id').notNull(),
    consumerId: text('consumer_id').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.consumerId] })],
);

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    registrationNumber: text('registration_number').notNull(),
    name: text('name'),
    model: text('model'),
    type: text('type').notNull(),
    maxLoadCapacity: numeric('max_load_capacity', { precision: 10, scale: 2 }).notNull(),
    odometer: numeric('odometer', { precision: 10, scale: 2 }).notNull().default('0'),
    fuelType: text('fuel_type').notNull().default('diesel'),
    acquisitionCost: numeric('acquisition_cost', { precision: 14, scale: 2 }).notNull(),
    acquisitionDate: date('acquisition_date').notNull(),
    currencyCode: text('currency_code').notNull().default('INR'),
    status: text('status').notNull().default('available'),
    retiredAt: timestamp('retired_at', { withTimezone: true }),
    homeRegionId: uuid('home_region_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_vehicle_registration').on(table.organizationId, table.registrationNumber),
    index('idx_vehicles_status').on(table.organizationId, table.status).where(sql`${table.deletedAt} is null`),
    index('idx_vehicles_type').on(table.organizationId, table.type),
    check('chk_vehicle_type', sql`${table.type} in ('truck','van','car','tractor','trailer','tanker','bus','ev','other')`),
    check('chk_vehicle_status', sql`${table.status} in ('available','on-trip','in-shop','retired')`),
    check('chk_vehicle_fuel', sql`${table.fuelType} in ('diesel','petrol','cng','electric','hybrid')`),
    check('chk_max_load', sql`${table.maxLoadCapacity} > 0`),
    check('chk_odometer', sql`${table.odometer} >= 0`),
    check('chk_acquisition_cost', sql`${table.acquisitionCost} >= 0`),
  ],
);

export const drivers = pgTable(
  'drivers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id').references(() => users.id),
    name: text('name').notNull(),
    licenseNumber: text('license_number').notNull(),
    licenseCategory: text('license_category').notNull(),
    licenseExpiryDate: date('license_expiry_date').notNull(),
    contactNumber: text('contact_number').notNull(),
    safetyScore: numeric('safety_score', { precision: 5, scale: 2 }).notNull().default('100'),
    overallScore: numeric('overall_score', { precision: 5, scale: 2 }).notNull().default('100'),
    status: text('status').notNull().default('available'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_driver_license').on(table.organizationId, table.licenseNumber),
    index('idx_drivers_status').on(table.organizationId, table.status).where(sql`${table.deletedAt} is null`),
    index('idx_drivers_license_expiry').on(table.organizationId, table.licenseExpiryDate),
    check('chk_driver_status', sql`${table.status} in ('available','on-trip','off-duty','suspended')`),
    check('chk_safety_score', sql`${table.safetyScore} between 0 and 100`),
    check('chk_overall_score', sql`${table.overallScore} between 0 and 100`),
  ],
);

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    contactName: text('contact_name'),
    contactEmail: text('contact_email'),
    contactPhone: text('contact_phone'),
    billingAddress: text('billing_address'),
    type: text('type').notNull().default('shipper'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_customer_name').on(table.organizationId, table.name),
    index('idx_customers_org').on(table.organizationId).where(sql`${table.deletedAt} is null`),
    check('chk_customer_type', sql`${table.type} in ('shipper','receiver','both')`),
  ],
);

export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id),
    driverId: uuid('driver_id').references(() => drivers.id),
    customerId: uuid('customer_id').references(() => customers.id),
    sourceLabel: text('source_label').notNull(),
    sourceLat: numeric('source_lat', { precision: 9, scale: 6 }),
    sourceLng: numeric('source_lng', { precision: 9, scale: 6 }),
    destinationLabel: text('destination_label').notNull(),
    destinationLat: numeric('destination_lat', { precision: 9, scale: 6 }),
    destinationLng: numeric('destination_lng', { precision: 9, scale: 6 }),
    cargoWeightKg: numeric('cargo_weight_kg', { precision: 10, scale: 2 }).notNull(),
    plannedDistanceKm: numeric('planned_distance_km', { precision: 10, scale: 2 }),
    plannedTravelMins: integer('planned_travel_mins'),
    estimatedFuelL: numeric('estimated_fuel_l', { precision: 10, scale: 3 }),
    estimatedFuelCost: numeric('estimated_fuel_cost', { precision: 14, scale: 2 }),
    actualDistanceKm: numeric('actual_distance_km', { precision: 10, scale: 2 }),
    actualTravelMins: integer('actual_travel_mins'),
    fuelConsumedL: numeric('fuel_consumed_l', { precision: 10, scale: 3 }),
    revenueAmount: numeric('revenue_amount', { precision: 14, scale: 2 }),
    cargoDescription: text('cargo_description'),
    status: text('status').notNull().default('draft'),
    dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),
    plannedDepartureAt: timestamp('planned_departure_at', { withTimezone: true }),
    plannedArrivalAt: timestamp('planned_arrival_at', { withTimezone: true }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_trips_org_status').on(table.organizationId, table.status).where(sql`${table.deletedAt} is null`),
    index('idx_trips_vehicle').on(table.vehicleId, table.dispatchedAt.desc()),
    index('idx_trips_driver').on(table.driverId, table.dispatchedAt.desc()),
    index('idx_trips_customer').on(table.customerId).where(sql`${table.deletedAt} is null`),
    check('chk_trip_status', sql`${table.status} in ('draft','dispatched','in-transit','completed','cancelled')`),
    check('chk_cargo_weight', sql`${table.cargoWeightKg} > 0`),
    check('chk_cancel_reason', sql`${table.cancelReason} is null or ${table.cancelReason} in ('customer','vehicle_breakdown','weather','compliance','duplicate','other')`),
  ],
);

export const tripEvents = pgTable(
  'trip_events',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    lat: numeric('lat', { precision: 9, scale: 6 }),
    lng: numeric('lng', { precision: 9, scale: 6 }),
    odometerKm: numeric('odometer_km', { precision: 10, scale: 2 }),
    note: text('note'),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    recordedBy: uuid('recorded_by').references(() => users.id),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_trip_events_trip').on(table.tripId, table.recordedAt),
    check('chk_trip_event_type', sql`${table.eventType} in ('created','dispatched','enroute','position','checkpoint','delayed','arrived','pod-attached','completed','cancelled')`),
  ],
);

export const vehicleDocuments = pgTable(
  'vehicle_documents',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    type: text('type').notNull(),
    storageKey: text('storage_key').notNull(),
    filename: text('filename').notNull(),
    mime: text('mime').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    expiresOn: date('expires_on'),
    metadata: jsonb('metadata').notNull().default(sql`'{}'::jsonb`),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_vehicle_docs').on(table.vehicleId).where(sql`${table.deletedAt} is null`),
    index('idx_vehicle_docs_expiry').on(table.expiresOn).where(sql`${table.expiresOn} is not null`),
    check('chk_vehicle_doc_type', sql`${table.type} in ('insurance','registration','fitness','pollution','permit','photo','other')`),
  ],
);

// ============================================================
// Phase 3 — Maintenance
// ============================================================

export const maintenanceSchedules = pgTable(
  'maintenance_schedules',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    basisRuleId: text('basis_rule_id').notNull(),
    predictedDueOdometer: numeric('predicted_due_odometer', { precision: 10, scale: 2 }),
    predictedDueDate: date('predicted_due_date'),
    predictedAt: timestamp('predicted_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull().default('pending'),
    fulfilledMaintenanceId: uuid('fulfilled_maintenance_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_maint_sched_vehicle').on(table.vehicleId, table.status),
    index('idx_maint_sched_due').on(table.status, table.predictedDueDate),
    check('chk_maint_sched_status', sql`${table.status} in ('pending','scheduled','fulfilled','superseded')`),
  ],
);

export const maintenanceLogs = pgTable(
  'maintenance_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    type: text('type').notNull(),
    description: text('description').notNull(),
    serviceOdometer: numeric('service_odometer', { precision: 10, scale: 2 }),
    cost: numeric('cost', { precision: 14, scale: 2 }).notNull().default('0'),
    vendor: text('vendor'),
    status: text('status').notNull().default('active'),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    closedBy: uuid('closed_by').references(() => users.id),
    predictedScheduleId: uuid('predicted_schedule_id'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_maint_logs_org_vehicle').on(table.organizationId, table.vehicleId, table.status).where(sql`${table.deletedAt} is null`),
    index('idx_maint_logs_vehicle_time').on(table.vehicleId, table.createdAt),
    check('chk_maint_log_type', sql`${table.type} in ('oil_change','tyre','brake','service','inspection','repair','other')`),
    check('chk_maint_log_status', sql`${table.status} in ('active','closed')`),
    check('chk_maint_cost', sql`${table.cost} >= 0`),
  ],
);

// ============================================================
// Phase 3 — Fuel
// ============================================================

export const fuelLogs = pgTable(
  'fuel_logs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    tripId: uuid('trip_id').references(() => trips.id),
    liters: numeric('liters', { precision: 10, scale: 3 }).notNull(),
    cost: numeric('cost', { precision: 14, scale: 2 }).notNull(),
    odometerKm: numeric('odometer_km', { precision: 10, scale: 2 }).notNull(),
    fuelType: text('fuel_type').notNull(),
    filledStation: text('filled_station'),
    filledAt: timestamp('filled_at', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_fuel_logs_org_vehicle').on(table.organizationId, table.vehicleId, table.filledAt.desc()).where(sql`${table.deletedAt} is null`),
    index('idx_fuel_logs_trip').on(table.tripId),
    check('chk_fuel_liters', sql`${table.liters} > 0`),
    check('chk_fuel_cost', sql`${table.cost} >= 0`),
    check('chk_fuel_odometer', sql`${table.odometerKm} >= 0`),
  ],
);

export const fuelAnomalyFlags = pgTable(
  'fuel_anomaly_flags',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    fuelLogId: uuid('fuel_log_id')
      .notNull()
      .references(() => fuelLogs.id, { onDelete: 'cascade' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    expectedConsumptionL: numeric('expected_consumption_l', { precision: 10, scale: 3 }).notNull(),
    actualConsumptionL: numeric('actual_consumption_l', { precision: 10, scale: 3 }).notNull(),
    expectedKpl: numeric('expected_kpl', { precision: 8, scale: 3 }).notNull(),
    actualKpl: numeric('actual_kpl', { precision: 8, scale: 3 }).notNull(),
    deviationPct: numeric('deviation_pct', { precision: 6, scale: 2 }).notNull(),
    thresholdPct: numeric('threshold_pct', { precision: 6, scale: 2 }).notNull(),
    severity: text('severity').notNull(),
    flaggedAt: timestamp('flagged_at', { withTimezone: true }).notNull().defaultNow(),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    acknowledgedBy: uuid('acknowledged_by').references(() => users.id),
    resolution: text('resolution'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('uq_fuel_anomaly_log').on(table.fuelLogId),
    index('idx_fuel_anomaly_vehicle').on(table.vehicleId, table.flaggedAt.desc()),
    check('chk_anomaly_severity', sql`${table.severity} in ('low','medium','high')`),
  ],
);

// ============================================================
// Phase 3 — Expenses
// ============================================================

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id),
    tripId: uuid('trip_id').references(() => trips.id),
    type: text('type').notNull(),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    incurredAt: timestamp('incurred_at', { withTimezone: true }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_expenses_org_vehicle').on(table.organizationId, table.vehicleId, table.incurredAt).where(sql`${table.deletedAt} is null`),
    check('chk_expense_type', sql`${table.type} in ('toll','parking','repair','misc','document')`),
    check('chk_expense_amount', sql`${table.amount} >= 0`),
  ],
);

// ============================================================
// Phase 3 — Notifications
// ============================================================

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    type: text('type').notNull(),
    priority: text('priority').notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    audienceRole: text('audience_role'),
    actorUserId: uuid('actor_user_id').references(() => users.id),
    fingerprint: text('fingerprint').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    unique('uq_notification_fingerprint').on(table.organizationId, table.fingerprint),
    index('idx_notifications_org_time').on(table.organizationId, table.createdAt.desc()).where(sql`${table.deletedAt} is null`),
    index('idx_notifications_role').on(table.audienceRole).where(sql`${table.deletedAt} is null`),
    check('chk_notification_priority', sql`${table.priority} in ('red','orange','blue','green')`),
    check('chk_notification_audience_role', sql`${table.audienceRole} is null or ${table.audienceRole} in ('admin','fleet_manager','driver','safety_officer','financial_analyst')`),
  ],
);

export const notificationRecipients = pgTable(
  'notification_recipients',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    readAt: timestamp('read_at', { withTimezone: true }),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    emailState: text('email_state'),
    pushState: text('push_state'),
    pushReceipt: text('push_receipt'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_notif_recipients_user_unread').on(table.userId, table.createdAt.desc()).where(sql`${table.readAt} is null`),
    unique('uq_notif_recipient').on(table.notificationId, table.userId),
    check('chk_notif_email_state', sql`${table.emailState} is null or ${table.emailState} in ('pending','sent','failed','skipped')`),
    check('chk_notif_push_state', sql`${table.pushState} is null or ${table.pushState} in ('pending','sent','failed','skipped')`),
  ],
);

// ============================================================
// Phase 4 — Offline Sync
// ============================================================

export const syncIdempotency = pgTable(
  'sync_idempotency',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    idempotencyKey: text('idempotency_key').notNull().unique(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    mutationType: text('mutation_type').notNull(),
    entityId: uuid('entity_id'),
    status: text('status').notNull(),
    result: jsonb('result'),
    error: jsonb('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_sync_idempotency_key').on(table.idempotencyKey),
    index('idx_sync_idempotency_org').on(table.organizationId, table.createdAt.desc()),
  ],
);
