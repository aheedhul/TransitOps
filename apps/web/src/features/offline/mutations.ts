import { enqueueMutation } from './sync-engine.js';
import { getOfflineDB } from './db.js';

export interface OfflineMutationConfig {
  type: string;
  entityId: string;
  payload: unknown;
  optimisticApply?: () => Promise<void> | void;
  optimisticRevert?: () => Promise<void> | void;
}

export async function mutateOffline(config: OfflineMutationConfig): Promise<string> {
  if (config.optimisticApply) {
    try {
      await config.optimisticApply();
    } catch {
      // optimistic apply failed silently — network call will correct
    }
  }

  const key = await enqueueMutation(config.type, config.entityId, config.payload);

  try {
    const { flushOutbox } = await import('./sync-engine.js');
    await flushOutbox();
  } catch {
    // network failure is expected and handled by sync engine retry
  }

  return key;
}

export async function cancelPendingMutation(idempotencyKey: string): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  await db.outbox
    .where('idempotencyKey')
    .equals(idempotencyKey)
    .modify({ status: 'cancelled', updatedAt: new Date().toISOString() });
}

export async function getOutboxCount(): Promise<number> {
  const db = getOfflineDB();
  if (!db) return 0;
  return db.outbox.where('status').anyOf('pending', 'in_flight').count();
}

export async function isMutationPending(entityId: string, type: string): Promise<boolean> {
  const db = getOfflineDB();
  if (!db) return false;
  const count = await db.outbox
    .where({ entityId, type })
    .and((e) => e.status === 'pending' || e.status === 'in_flight')
    .count();
  return count > 0;
}
