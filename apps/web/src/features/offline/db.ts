import { Dexie } from 'dexie';
import type { Table } from 'dexie';
import { useAuthStore } from '../auth/store.js';

export interface DexieVehicle {
  id: string;
  organizationId: string;
  registrationNumber: string;
  name: string | null;
  model: string | null;
  type: string;
  maxLoadCapacity: string;
  odometer: string;
  fuelType: string;
  acquisitionCost: string;
  acquisitionDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  clientUpdatedAt: string;
}

export interface DexieDriver {
  id: string;
  organizationId: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: string;
  overallScore: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  clientUpdatedAt: string;
}

export interface DexieCustomer {
  id: string;
  organizationId: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingAddress: string | null;
  type: string;
  createdAt: string;
  updatedAt: string;
  clientUpdatedAt: string;
}

export interface DexieTrip {
  id: string;
  organizationId: string;
  vehicleId: string | null;
  driverId: string | null;
  customerId: string | null;
  sourceLabel: string;
  sourceLat: string | null;
  sourceLng: string | null;
  destinationLabel: string;
  destinationLat: string | null;
  destinationLng: string | null;
  cargoWeightKg: string;
  plannedDistanceKm: string | null;
  plannedTravelMins: number | null;
  estimatedFuelL: string | null;
  estimatedFuelCost: string | null;
  actualDistanceKm: string | null;
  actualTravelMins: number | null;
  fuelConsumedL: string | null;
  revenueAmount: string | null;
  cargoDescription: string | null;
  status: string;
  dispatchedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  plannedDepartureAt: string | null;
  plannedArrivalAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  clientUpdatedAt: string;
}

export interface DexieFuelLog {
  id: string;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  liters: string;
  cost: string;
  odometerKm: string;
  fuelType: string;
  filledStation: string | null;
  filledAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  clientUpdatedAt: string;
}

export interface DexieExpense {
  id: string;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  type: string;
  amount: string;
  incurredAt: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  clientUpdatedAt: string;
}

export interface DexieMaintenanceLog {
  id: string;
  organizationId: string;
  vehicleId: string;
  type: string;
  description: string;
  serviceOdometer: string | null;
  cost: string;
  vendor: string | null;
  status: string;
  closedAt: string | null;
  closedBy: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  clientUpdatedAt: string;
}

export interface DexieNotification {
  id: string;
  organizationId: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  payload: string;
  audienceRole: string | null;
  createdAt: string;
  readAt: string | null;
  clientUpdatedAt: string;
}

export interface OutboxEntry {
  seq?: number;
  idempotencyKey: string;
  type: string;
  entityId: string;
  payload: unknown;
  applyJson: unknown | null;
  status: 'pending' | 'in_flight' | 'acked' | 'failed' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: number;
  lastError: { code: string; message: string; retryable: boolean } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncMeta {
  key: string;
  lastPullCursor: string | null;
  lastPushAt: string | null;
  schemaVersion: string;
}

export interface BlobEntry {
  id?: number;
  kind: string;
  refId: string;
  data: string;
  mime: string;
  part: number;
  pending: boolean;
  createdAt: string;
}

export interface TransitOpsDB {
  name: string;
  vehicles: Table<DexieVehicle, string>;
  drivers: Table<DexieDriver, string>;
  customers: Table<DexieCustomer, string>;
  trips: Table<DexieTrip, string>;
  fuelLogs: Table<DexieFuelLog, string>;
  expenses: Table<DexieExpense, string>;
  maintenanceLogs: Table<DexieMaintenanceLog, string>;
  notifications: Table<DexieNotification, string>;
  outbox: Table<OutboxEntry, number>;
  syncMeta: Table<SyncMeta, string>;
  blobs: Table<BlobEntry, number>;
  open(): Promise<void>;
  close(): void;
  delete(): Promise<void>;
}

let _db: TransitOpsDB | null = null;

export function getOfflineDB(): TransitOpsDB | null {
  return _db;
}

export async function initOfflineDB(): Promise<TransitOpsDB> {
  const { session } = useAuthStore.getState();
  const userId = session?.userId;
  if (!userId) throw new Error('Cannot init offline DB without authenticated user');

  if (_db) {
    if (_db.name === `transitops_${userId}`) return _db;
    _db.close();
    _db = null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = new (Dexie as unknown as new (name: string) => any)(`transitops_${userId}`) as unknown as TransitOpsDB & {
    version(n: number): { stores(s: Record<string, string>): void };
  };
  raw.version(1).stores({
    vehicles: 'id, status, type',
    drivers: 'id, status',
    customers: 'id',
    trips: 'id, status, vehicleId, driverId, dispatchedAt',
    fuelLogs: 'id, vehicleId, filledAt',
    expenses: 'id, vehicleId, incurredAt',
    maintenanceLogs: 'id, vehicleId, status',
    notifications: 'id, createdAt',
    outbox: '++seq, idempotencyKey, status, nextAttemptAt',
    syncMeta: 'key',
    blobs: '++id, kind, refId',
  });

  _db = raw as TransitOpsDB;
  await _db.open();
  return _db;
}

export async function teardownOfflineDB(): Promise<void> {
  if (_db) {
    _db.close();
    _db = null;
  }
}
