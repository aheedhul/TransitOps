import { z } from 'zod';

export const pushMutationSchema = z.object({
  idempotencyKey: z.string().uuid(),
  type: z.enum([
    'trip.start',
    'trip.checkpoint',
    'trip.complete',
    'trip.cancel',
    'fuel_log.create',
    'maintenance.create',
    'maintenance.close',
    'expense.create',
    'trip.dispatch',
  ]),
  entityId: z.string(),
  payload: z.record(z.unknown()),
  occurredAt: z.string().datetime(),
});

export const pushRequestSchema = z.object({
  clientSeq: z.number().int().nonnegative(),
  mutations: z.array(pushMutationSchema).min(1).max(50),
});

export const pullRequestSchema = z.object({
  since: z.string().datetime(),
  entityTypes: z.array(z.string()).optional(),
  cursor: z.string().optional(),
});

export type PushMutation = z.infer<typeof pushMutationSchema>;
export type PushRequest = z.infer<typeof pushRequestSchema>;
export type PullRequest = z.infer<typeof pullRequestSchema>;

export interface PushResult {
  idempotencyKey: string;
  status: 'applied' | 'rejected' | 'replayed';
  entity?: { type: string; id: string; etag: string; updatedAt: string };
  error?: { code: string; message: string; details?: unknown };
}

export interface PushResponse {
  results: PushResult[];
  serverClock: string;
  nextCursor: string;
}

export interface PullDelta {
  type: 'upsert' | 'delete';
  entity: string;
  id: string;
  data?: Record<string, unknown>;
  etag?: string;
  serverStamp: string;
  deleted: boolean;
}

export interface PullResponse {
  deltas: PullDelta[];
  nextCursor: string;
  serverClock: string;
  hasMore: boolean;
}
