import { eq, and, isNull, desc, sql as drizzleSql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { notifications, notificationRecipients, users } from '../../db/schema.js';
import type { Db } from '../../db/index.js';
import type { CreateNotificationInput } from './dto.js';

export class NotificationRepository {
  constructor(private readonly database: Db = db) {}

  async upsertByFingerprint(input: CreateNotificationInput & { organizationId: string }) {
    const existing = await this.database
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, input.organizationId),
          eq(notifications.fingerprint, input.fingerprint),
        ),
      )
      .limit(1)
      .then((r) => r[0] ?? null);

    if (existing && !existing.deletedAt) {
      return existing;
    }

    if (existing?.deletedAt) {
      const [restored] = await this.database
        .update(notifications)
        .set({ deletedAt: null })
        .where(eq(notifications.id, existing.id))
        .returning();
      if (restored) return restored;
    }

    const [row] = await this.database
      .insert(notifications)
      .values({
        organizationId: input.organizationId,
        type: input.type,
        priority: input.priority,
        title: input.title,
        message: input.message,
        payload: input.payload as Record<string, unknown>,
        audienceRole: input.audienceRole ?? null,
        actorUserId: input.actorUserId ?? null,
        fingerprint: input.fingerprint,
      })
      .returning();
    if (!row) throw new Error('Failed to create notification');
    return row;
  }

  async findById(id: string, orgId: string) {
    const [row] = await this.database
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.organizationId, orgId), isNull(notifications.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async findByOrg(orgId: string, limit = 50, offset = 0) {
    return this.database
      .select()
      .from(notifications)
      .where(and(eq(notifications.organizationId, orgId), isNull(notifications.deletedAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getRecipientsByNotification(notificationId: string) {
    return this.database
      .select()
      .from(notificationRecipients)
      .where(eq(notificationRecipients.notificationId, notificationId));
  }

  async createRecipients(rows: { notificationId: string; userId: string }[]) {
    if (rows.length === 0) return;
    return this.database.insert(notificationRecipients).values(rows).onConflictDoNothing();
  }

  async findRecipientsForUser(userId: string, limit = 50, offset = 0) {
    return this.database
      .select({
        notification: {
          id: notifications.id,
          type: notifications.type,
          priority: notifications.priority,
          title: notifications.title,
          message: notifications.message,
          payload: notifications.payload,
          audienceRole: notifications.audienceRole,
          actorUserId: notifications.actorUserId,
          fingerprint: notifications.fingerprint,
          createdAt: notifications.createdAt,
        },
        recipient: {
          id: notificationRecipients.id,
          notificationId: notificationRecipients.notificationId,
          userId: notificationRecipients.userId,
          readAt: notificationRecipients.readAt,
          dismissedAt: notificationRecipients.dismissedAt,
          emailState: notificationRecipients.emailState,
          pushState: notificationRecipients.pushState,
          createdAt: notificationRecipients.createdAt,
        },
      })
      .from(notificationRecipients)
      .innerJoin(notifications, and(eq(notifications.id, notificationRecipients.notificationId), isNull(notifications.deletedAt)))
      .where(eq(notificationRecipients.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async markRead(notificationId: string, userId: string) {
    const [row] = await this.database
      .update(notificationRecipients)
      .set({ readAt: new Date() })
      .where(
        and(eq(notificationRecipients.notificationId, notificationId), eq(notificationRecipients.userId, userId)),
      )
      .returning();
    return row ?? null;
  }

  async dismiss(notificationId: string, userId: string) {
    const [row] = await this.database
      .update(notificationRecipients)
      .set({ dismissedAt: new Date() })
      .where(
        and(eq(notificationRecipients.notificationId, notificationId), eq(notificationRecipients.userId, userId)),
      )
      .returning();
    return row ?? null;
  }

  async getUnreadCount(userId: string) {
    const [result] = await this.database
      .select({ count: drizzleSql<number>`count(*)` })
      .from(notificationRecipients)
      .where(and(eq(notificationRecipients.userId, userId), isNull(notificationRecipients.readAt)));
    return result?.count ?? 0;
  }

  async getUsersByRole(orgId: string, role: string) {
    return this.database
      .select()
      .from(users)
      .where(
        and(
          eq(users.organizationId, orgId),
          eq(users.role, role),
          eq(users.status, 'active'),
          isNull(users.deletedAt),
        ),
      );
  }
}
