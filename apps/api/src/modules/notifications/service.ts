import { NotificationRepository } from './repository.js';
import type {
  CreateNotificationInput,
  NotificationResponse,
  NotificationRecipientResponse,
  NotificationsForUser,
} from './dto.js';

export class NotificationService {
  constructor(private readonly repo: NotificationRepository = new NotificationRepository()) {}

  async request(input: CreateNotificationInput & { organizationId: string }) {
    const notification = await this.repo.upsertByFingerprint(input);

    const existingRecipients = await this.repo.getRecipientsByNotification(notification.id);
    if (existingRecipients.length > 0) {
      return serializeNotification(notification);
    }

    if (input.audienceRole) {
      const users = await this.repo.getUsersByRole(input.organizationId, input.audienceRole);
      if (users.length > 0) {
        await this.repo.createRecipients(
          users.map((u) => ({ notificationId: notification.id, userId: u.id as string })),
        );
      }
    }

    return serializeNotification(notification);
  }

  async listByOrg(orgId: string, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const rows = await this.repo.findByOrg(orgId, pageSize, offset);
    return {
      data: rows.map((r) => serializeNotification(r)),
      meta: { page, page_size: pageSize },
    };
  }

  async getForUser(userId: string, page = 1, pageSize = 50) {
    const offset = (page - 1) * pageSize;
    const rows = await this.repo.findRecipientsForUser(userId, pageSize, offset);
    return {
      data: rows.map((r) => serializeForUser(r)),
      meta: { page, page_size: pageSize },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.repo.getUnreadCount(userId);
    return { count };
  }

  async markRead(notificationId: string, userId: string) {
    const row = await this.repo.markRead(notificationId, userId);
    if (!row) throw new NotFoundError('Recipient record not found');
    return serializeRecipient(row);
  }

  async dismiss(notificationId: string, userId: string) {
    const row = await this.repo.dismiss(notificationId, userId);
    if (!row) throw new NotFoundError('Recipient record not found');
    return serializeRecipient(row);
  }
}

function serializeNotification(row: Record<string, unknown>): NotificationResponse {
  return {
    id: row.id as string,
    type: row.type as string,
    priority: row.priority as string,
    title: row.title as string,
    message: row.message as string,
    payload: (row.payload as Record<string, unknown>) ?? {},
    audienceRole: (row.audienceRole as string | null) ?? null,
    actorUserId: (row.actorUserId as string | null) ?? null,
    fingerprint: row.fingerprint as string,
    createdAt: (row.createdAt as Date).toISOString(),
  };
}

function serializeRecipient(row: Record<string, unknown>): NotificationRecipientResponse {
  return {
    id: row.id as string,
    notificationId: row.notificationId as string,
    userId: row.userId as string,
    readAt: row.readAt ? (row.readAt as Date).toISOString() : null,
    dismissedAt: row.dismissedAt ? (row.dismissedAt as Date).toISOString() : null,
    emailState: (row.emailState as string | null) ?? null,
    pushState: (row.pushState as string | null) ?? null,
    createdAt: (row.createdAt as Date).toISOString(),
  };
}

function serializeForUser(row: {
  notification: Record<string, unknown>;
  recipient: Record<string, unknown>;
}): NotificationsForUser {
  return {
    notification: serializeNotification(row.notification),
    recipient: serializeRecipient(row.recipient),
  };
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
