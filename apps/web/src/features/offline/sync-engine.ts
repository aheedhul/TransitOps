import { getOfflineDB, type OutboxEntry } from './db.js';
import { useOfflineStore } from './offline-store.js';
import { useAuthStore } from '../auth/store.js';

interface PushMutation {
  idempotencyKey: string;
  type: string;
  entityId: string;
  payload: unknown;
  occurredAt: string;
}

interface PushResult {
  idempotencyKey: string;
  status: 'applied' | 'rejected' | 'replayed';
  entity?: { type: string; id: string; etag: string; updatedAt: string };
  error?: { code: string; message: string; details?: unknown };
}

interface PushResponse {
  results: PushResult[];
  serverClock: string;
  nextCursor: string;
}

interface PullDelta {
  type: 'upsert' | 'delete';
  entity: string;
  id: string;
  data?: Record<string, unknown>;
  etag?: string;
  serverStamp: string;
  deleted: boolean;
}

interface PullResponse {
  deltas: PullDelta[];
  nextCursor: string;
  serverClock: string;
  hasMore: boolean;
}

const SYNC_PUSH_URL = '/api/v1/sync/push';
const SYNC_PULL_URL = '/api/v1/sync/pull';
const MAX_BATCH_SIZE = 50;

async function authFetch(path: string, body: unknown): Promise<unknown> {
  const { session } = useAuthStore.getState();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Sync request failed: ${res.status}`);
  return res.json();
}

export async function enqueueMutation(
  type: string,
  entityId: string,
  payload: unknown,
): Promise<string> {
  const db = getOfflineDB();
  if (!db) throw new Error('Offline DB not initialized');

  const idempotencyKey = crypto.randomUUID();
  const now = new Date().toISOString();
  const entry: OutboxEntry = {
    idempotencyKey,
    type,
    entityId,
    payload,
    applyJson: null,
    status: 'pending',
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: Date.now(),
    lastError: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.outbox.add(entry);
  updateOutboxCount();
  return idempotencyKey;
}

export async function flushOutbox(): Promise<PushResponse | null> {
  const db = getOfflineDB();
  if (!db) return null;

  const pending = await db.outbox
    .where('status')
    .anyOf('pending', 'failed')
    .filter((e: OutboxEntry) => e.nextAttemptAt <= Date.now() && e.attempts < e.maxAttempts)
    .limit(MAX_BATCH_SIZE)
    .sortBy('seq');

  if (pending.length === 0) return null;

  const mutations: PushMutation[] = pending.map((e) => ({
    idempotencyKey: e.idempotencyKey,
    type: e.type,
    entityId: e.entityId,
    payload: e.payload,
    occurredAt: e.createdAt,
  }));

  await db.outbox
    .where('idempotencyKey')
    .anyOf(pending.map((e) => e.idempotencyKey))
    .modify({ status: 'in_flight' });

  const store = useOfflineStore.getState();
  store.setSyncState('syncing');

  try {
    const response = (await authFetch(SYNC_PUSH_URL, {
      mutations,
      clientSeq: pending[0]?.seq ?? 0,
    })) as PushResponse;

    for (const result of response.results) {
      const entry = pending.find((e) => e.idempotencyKey === result.idempotencyKey);
      if (!entry) continue;

      if (result.status === 'applied' || result.status === 'replayed') {
        await db.outbox.update(entry.seq!, {
          status: 'acked',
          updatedAt: new Date().toISOString(),
        });
      } else if (result.status === 'rejected') {
        const serverError = result.error;
        await db.outbox.update(entry.seq!, {
          status: 'failed',
          lastError: serverError
            ? { code: serverError.code, message: serverError.message, retryable: false }
            : { code: 'UNKNOWN', message: 'Rejected by server', retryable: false },
          attempts: entry.attempts + 1,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await updateOutboxCount();
    await updateConflictCount();

    const remainingPending = await db.outbox.where('status').equals('pending').count();
    const remainingFailed = await db.outbox.where('status').equals('failed').count();

    if (remainingPending === 0 && remainingFailed === 0) {
      store.setSyncState('connected');
    } else if (remainingFailed > 0 && remainingPending === 0) {
      store.setSyncState('issues');
    } else if (!navigator.onLine) {
      store.setSyncState('offline');
    }

    return response;
  } catch {
    await db.outbox
      .where('idempotencyKey')
      .anyOf(pending.map((e) => e.idempotencyKey))
      .modify((entry) => {
        entry.status = 'failed';
        entry.attempts += 1;
        entry.nextAttemptAt = Date.now() + Math.min(60000, Math.pow(2, entry.attempts) * 1000);
        entry.lastError = { code: 'NETWORK', message: 'Network request failed', retryable: true };
      });

    store.setSyncState('offline');
    await updateOutboxCount();
    return null;
  }
}

export async function pullDeltas(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;

  const meta = (await db.syncMeta.get('current')) ?? null;
  const since = meta?.lastPullCursor ?? new Date(0).toISOString();

  const store = useOfflineStore.getState();
  store.setSyncState('syncing');

  try {
    const response = (await authFetch(SYNC_PULL_URL, {
      since,
      entityTypes: ['vehicles', 'drivers', 'customers', 'trips', 'fuel_logs', 'expenses', 'maintenance_logs', 'notifications'],
    })) as PullResponse;

    await applyDeltas(db, response.deltas);

    await db.syncMeta.put({
      key: 'current',
      lastPullCursor: response.nextCursor,
      lastPushAt: meta?.lastPushAt ?? null,
      schemaVersion: '20260712.1',
    });

    store.setSyncState('connected');
  } catch {
    store.setSyncState('offline');
  }
}

async function applyDeltas(db: ReturnType<typeof getOfflineDB>, deltas: PullDelta[]): Promise<void> {
  if (!db) return;

  for (const delta of deltas) {
    const now = new Date().toISOString();
    if (delta.deleted) {
      await deleteEntityFromCache(db, delta.entity, delta.id);
      continue;
    }

    if (!delta.data) continue;

    const row = { ...delta.data, clientUpdatedAt: now } as Record<string, unknown>;

    switch (delta.entity) {
      case 'vehicles':
        await db.vehicles.put(row as unknown as never);
        break;
      case 'drivers':
        await db.drivers.put(row as unknown as never);
        break;
      case 'customers':
        await db.customers.put(row as unknown as never);
        break;
      case 'trips':
        await db.trips.put(row as unknown as never);
        break;
      case 'fuel_logs':
        await db.fuelLogs.put(row as unknown as never);
        break;
      case 'expenses':
        await db.expenses.put(row as unknown as never);
        break;
      case 'maintenance_logs':
        await db.maintenanceLogs.put(row as unknown as never);
        break;
      case 'notifications':
        await db.notifications.put(row as unknown as never);
        break;
    }
  }
}

async function deleteEntityFromCache(
  db: NonNullable<ReturnType<typeof getOfflineDB>>,
  entity: string,
  id: string,
): Promise<void> {
  switch (entity) {
    case 'vehicles':
      await db.vehicles.delete(id);
      break;
    case 'drivers':
      await db.drivers.delete(id);
      break;
    case 'customers':
      await db.customers.delete(id);
      break;
    case 'trips':
      await db.trips.delete(id);
      break;
    case 'fuel_logs':
      await db.fuelLogs.delete(id);
      break;
    case 'expenses':
      await db.expenses.delete(id);
      break;
    case 'maintenance_logs':
      await db.maintenanceLogs.delete(id);
      break;
    case 'notifications':
      await db.notifications.delete(id);
      break;
  }
}

export async function seedInitialCache(data: {
  vehicles?: Record<string, unknown>[];
  drivers?: Record<string, unknown>[];
  customers?: Record<string, unknown>[];
  trips?: Record<string, unknown>[];
  fuelLogs?: Record<string, unknown>[];
  expenses?: Record<string, unknown>[];
  maintenanceLogs?: Record<string, unknown>[];
  notifications?: Record<string, unknown>[];
}): Promise<void> {
  const db = await getOfflineDB();
  if (!db) return;

  const now = new Date().toISOString();
  const withStamp = (rows: Record<string, unknown>[] | undefined) =>
    (rows ?? []).map((r) => ({ ...r, clientUpdatedAt: now } as unknown as never));

  if (data.vehicles) await db.vehicles.bulkPut(withStamp(data.vehicles as never[]));
  if (data.drivers) await db.drivers.bulkPut(withStamp(data.drivers as never[]));
  if (data.customers) await db.customers.bulkPut(withStamp(data.customers as never[]));
  if (data.trips) await db.trips.bulkPut(withStamp(data.trips as never[]));
  if (data.fuelLogs) await db.fuelLogs.bulkPut(withStamp(data.fuelLogs as never[]));
  if (data.expenses) await db.expenses.bulkPut(withStamp(data.expenses as never[]));
  if (data.maintenanceLogs) await db.maintenanceLogs.bulkPut(withStamp(data.maintenanceLogs as never[]));
  if (data.notifications) await db.notifications.bulkPut(withStamp(data.notifications as never[]));
}

export async function getConflicts(): Promise<OutboxEntry[]> {
  const db = getOfflineDB();
  if (!db) return [];
  return db.outbox.where('status').equals('failed').toArray();
}

export async function discardConflict(idempotencyKey: string): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  await db.outbox.where('idempotencyKey').equals(idempotencyKey).modify({ status: 'cancelled' });
  await updateConflictCount();
}

export async function retryConflict(idempotencyKey: string): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  await db.outbox.where('idempotencyKey').equals(idempotencyKey).modify({
    status: 'pending',
    attempts: 0,
    nextAttemptAt: Date.now(),
    lastError: null,
  });
  await updateConflictCount();
  void flushOutbox();
}

async function updateOutboxCount(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  const count = await db.outbox.where('status').anyOf('pending', 'in_flight').count();
  useOfflineStore.getState().setOutboxCount(count);
}

async function updateConflictCount(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  const count = await db.outbox.where('status').equals('failed').count();
  useOfflineStore.getState().setConflictCount(count);
}

let _onlineHandler: (() => void) | null = null;
let _offlineHandler: (() => void) | null = null;

export function startSyncListeners(): void {
  stopSyncListeners();

  _onlineHandler = () => {
    const store = useOfflineStore.getState();
    if (!store.paused) {
      void flushOutbox().then(() => pullDeltas());
    }
  };

  _offlineHandler = () => {
    useOfflineStore.getState().setSyncState('offline');
  };

  window.addEventListener('online', _onlineHandler);
  window.addEventListener('offline', _offlineHandler);

  if (!navigator.onLine) {
    useOfflineStore.getState().setSyncState('offline');
  }
}

export function stopSyncListeners(): void {
  if (_onlineHandler) {
    window.removeEventListener('online', _onlineHandler);
    _onlineHandler = null;
  }
  if (_offlineHandler) {
    window.removeEventListener('offline', _offlineHandler);
    _offlineHandler = null;
  }
}
