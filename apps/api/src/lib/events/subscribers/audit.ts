import { subscribe } from '../bus.js';
import { TOPICS } from '../topics.js';
import { db } from '../../../db/index.js';
import { auditLogs } from '../../../db/schema.js';

export function initAuditSubscriber(): void {
  subscribe(TOPICS.VEHICLE_CREATED, async (event) => {
    await writeAudit(event, event.topic.replace('.', ' '));
  });

  subscribe(TOPICS.VEHICLE_UPDATED, async (event) => {
    await writeAudit(event, event.topic.replace('.', ' '));
  });

  subscribe(TOPICS.VEHICLE_DELETED, async (event) => {
    await writeAudit(event, event.topic.replace('.', ' '));
  });

  subscribe(TOPICS.DRIVER_CREATED, async (event) => {
    await writeAudit(event, event.topic.replace('.', ' '));
  });

  subscribe(TOPICS.DRIVER_UPDATED, async (event) => {
    await writeAudit(event, event.topic.replace('.', ' '));
  });

  subscribe(TOPICS.DRIVER_DELETED, async (event) => {
    await writeAudit(event, event.topic.replace('.', ' '));
  });

  subscribe(TOPICS.CUSTOMER_CREATED, async (event) => {
    await writeAudit(event, event.topic.replace('.', ' '));
  });

  subscribe(TOPICS.CUSTOMER_UPDATED, async (event) => {
    await writeAudit(event, event.topic.replace('.', ' '));
  });

  subscribe(TOPICS.CUSTOMER_DELETED, async (event) => {
    await writeAudit(event, event.topic.replace('.', ' '));
  });

  subscribe(TOPICS.USER_CREATED, async (event) => {
    await writeAudit(event, event.topic.replace('.', ' '));
  });
}

async function writeAudit(event: { id: string; actorId: string | null; organizationId: string; entity: { type: string; id: string }; traceId: string }, action: string) {
  try {
    await db.insert(auditLogs).values({
      id: event.id,
      organizationId: event.organizationId,
      actorId: event.actorId,
      actorKind: event.actorId ? 'user' : 'system',
      action,
      entityType: event.entity.type,
      entityId: event.entity.id,
      eventId: event.id,
      traceId: event.traceId,
      occurredAt: new Date(),
    });
  } catch {
    // audit is best-effort — never fail the operation
  }
}
