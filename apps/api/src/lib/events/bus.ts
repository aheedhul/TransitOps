import { randomUUID } from 'node:crypto';

export interface DomainEvent<T = unknown> {
  id: string;
  topic: string;
  occurredAt: string;
  actorId: string | null;
  organizationId: string;
  entity: { type: string; id: string };
  payload: T;
  traceId: string;
}

type EventHandler = (event: DomainEvent) => void | Promise<void>;

const subscribers = new Map<string, EventHandler[]>();

export function subscribe(topic: string, handler: EventHandler): () => void {
  const existing = subscribers.get(topic) ?? [];
  existing.push(handler);
  subscribers.set(topic, existing);

  return () => {
    const idx = existing.indexOf(handler);
    if (idx !== -1) existing.splice(idx, 1);
  };
}

export async function publish<T>(event: DomainEvent<T>): Promise<void> {
  const handlers = subscribers.get(event.topic) ?? [];
  const promises = handlers.map((handler) =>
    Promise.resolve(handler(event)).catch(() => {
      // swallow subscriber errors — they must never break the publisher
    }),
  );
  await Promise.all(promises);
}

export function createEvent<T>(
  topic: string,
  data: {
    actorId: string | null;
    organizationId: string;
    entityType: string;
    entityId: string;
    payload: T;
    traceId?: string;
  },
): DomainEvent<T> {
  return {
    id: randomUUID(),
    topic,
    occurredAt: new Date().toISOString(),
    actorId: data.actorId,
    organizationId: data.organizationId,
    entity: { type: data.entityType, id: data.entityId },
    payload: data.payload,
    traceId: data.traceId ?? '',
  };
}
