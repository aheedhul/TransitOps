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
