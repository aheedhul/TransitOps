import { eq, and, gte } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { syncIdempotency } from '../../db/schema.js';
import {
  vehicles,
  drivers,
  customers,
  trips,
  fuelLogs,
  expenses,
  maintenanceLogs,
  notifications,
} from '../../db/schema.js';
import type { Db } from '../../db/index.js';
import type { PullDelta } from './dto.js';

export class SyncRepository {
  constructor(private readonly database: Db = db) {}

  async checkIdempotencyKey(key: string): Promise<{
    exists: boolean;
    status?: string;
    result?: unknown;
    error?: unknown;
    entityId?: string;
  } | null> {
    const [row] = await this.database
      .select()
      .from(syncIdempotency)
      .where(eq(syncIdempotency.idempotencyKey, key))
      .limit(1);
    if (!row) return null;
    return {
      exists: true,
      status: row.status,
      result: row.result ?? undefined,
      error: row.error ?? undefined,
      entityId: (row.entityId as string) ?? undefined,
    };
  }

  async storeIdempotencyResult(params: {
    key: string;
    organizationId: string;
    mutationType: string;
    entityId?: string;
    status: string;
    result?: unknown;
    error?: unknown;
  }): Promise<void> {
    await this.database.insert(syncIdempotency).values({
      idempotencyKey: params.key,
      organizationId: params.organizationId,
      mutationType: params.mutationType,
      entityId: params.entityId ?? null,
      status: params.status,
      result: params.result ? JSON.parse(JSON.stringify(params.result)) : null,
      error: params.error ? JSON.parse(JSON.stringify(params.error)) : null,
    });
  }

  async pullChanges(
    orgId: string,
    since: Date,
    entityTypes: string[],
  ): Promise<PullDelta[]> {
    const deltas: PullDelta[] = [];

    const gather = (rows: Record<string, unknown>[], entityType: string) => {
      for (const row of rows) {
        const deleted = row.deletedAt != null;
        const data: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (v instanceof Date) {
            data[k] = v.toISOString();
          } else if (typeof v === 'bigint') {
            data[k] = String(v);
          } else {
            data[k] = v;
          }
        }
        deltas.push({
          type: deleted ? 'delete' : 'upsert',
          entity: entityType,
          id: (row.id as string) ?? '',
          data: deleted ? undefined : data,
          serverStamp: row.updatedAt instanceof Date
            ? row.updatedAt.toISOString()
            : new Date().toISOString(),
          deleted,
        });
      }
    };

    if (entityTypes.length === 0 || entityTypes.includes('vehicles')) {
      const rows = await this.database
        .select()
        .from(vehicles)
        .where(
          and(
            eq(vehicles.organizationId, orgId),
            gte(vehicles.updatedAt, since),
          ),
        )
        .limit(200);
      gather(rows as unknown as Record<string, unknown>[], 'vehicles');
    }

    if (entityTypes.length === 0 || entityTypes.includes('drivers')) {
      const rows = await this.database
        .select()
        .from(drivers)
        .where(
          and(
            eq(drivers.organizationId, orgId),
            gte(drivers.updatedAt, since),
          ),
        )
        .limit(200);
      gather(rows as unknown as Record<string, unknown>[], 'drivers');
    }

    if (entityTypes.length === 0 || entityTypes.includes('customers')) {
      const rows = await this.database
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.organizationId, orgId),
            gte(customers.updatedAt, since),
          ),
        )
        .limit(200);
      gather(rows as unknown as Record<string, unknown>[], 'customers');
    }

    if (entityTypes.length === 0 || entityTypes.includes('trips')) {
      const rows = await this.database
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.organizationId, orgId),
            gte(trips.updatedAt, since),
          ),
        )
        .limit(200);
      gather(rows as unknown as Record<string, unknown>[], 'trips');
    }

    if (entityTypes.length === 0 || entityTypes.includes('fuel_logs')) {
      const rows = await this.database
        .select()
        .from(fuelLogs)
        .where(
          and(
            eq(fuelLogs.organizationId, orgId),
            gte(fuelLogs.updatedAt, since),
          ),
        )
        .limit(200);
      gather(rows as unknown as Record<string, unknown>[], 'fuel_logs');
    }

    if (entityTypes.length === 0 || entityTypes.includes('expenses')) {
      const rows = await this.database
        .select()
        .from(expenses)
        .where(
          and(
            eq(expenses.organizationId, orgId),
            gte(expenses.updatedAt, since),
          ),
        )
        .limit(200);
      gather(rows as unknown as Record<string, unknown>[], 'expenses');
    }

    if (entityTypes.length === 0 || entityTypes.includes('maintenance_logs')) {
      const rows = await this.database
        .select()
        .from(maintenanceLogs)
        .where(
          and(
            eq(maintenanceLogs.organizationId, orgId),
            gte(maintenanceLogs.updatedAt, since),
          ),
        )
        .limit(200);
      gather(rows as unknown as Record<string, unknown>[], 'maintenance_logs');
    }

    if (entityTypes.length === 0 || entityTypes.includes('notifications')) {
      const rows = await this.database
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.organizationId, orgId),
            gte(notifications.createdAt, since),
          ),
        )
        .limit(200);
      gather(rows as unknown as Record<string, unknown>[], 'notifications');
    }

    return deltas;
  }
}

export type { Db };
