import webPush from 'web-push';
import { env } from '../../lib/env.js';
import { db } from '../../db/index.js';
import { pushSubscriptions } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../lib/logger.js';

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;
  if (env.PUSH_VAPID_PUBLIC_KEY && env.PUSH_VAPID_PRIVATE_KEY) {
    webPush.setVapidDetails(
      env.PUSH_VAPID_SUBJECT,
      env.PUSH_VAPID_PUBLIC_KEY,
      env.PUSH_VAPID_PRIVATE_KEY,
    );
    vapidConfigured = true;
  }
}

interface PushPayload {
  title: string;
  message: string;
  notificationId?: string;
  route?: string;
}

export class PushService {
  async addSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent?: string) {
    const [row] = await db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent ?? null,
      })
      .onConflictDoUpdate({
        target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
        set: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: userAgent ?? null,
          lastUsedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async removeSubscription(userId: string, subscriptionId: string) {
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.id, subscriptionId), eq(pushSubscriptions.userId, userId)));
  }

  async removeByEndpoint(userId: string, endpoint: string) {
    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));
  }

  async sendToUser(userId: string, payload: PushPayload) {
    ensureVapid();
    if (!vapidConfigured) {
      logger.warn('VAPID not configured, skipping push notification');
      return;
    }

    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (subs.length === 0) return;

    const pushData = JSON.stringify({
      title: payload.title,
      message: payload.message,
      payload: {
        notificationId: payload.notificationId,
        route: payload.route,
      },
    });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        this.sendWithRetry(sub, pushData, 0)
      ),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      logger.warn({ userId, failed: failed.length }, 'Some push notifications failed');
    }
  }

  private async sendWithRetry(
    sub: typeof pushSubscriptions.$inferSelect,
    data: string,
    attempt: number,
  ): Promise<void> {
    const maxAttempts = 3;
    const baseDelay = 1000;

    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        data,
      );

      await db
        .update(pushSubscriptions)
        .set({ lastUsedAt: new Date() })
        .where(eq(pushSubscriptions.id, sub.id));
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;

      if ((statusCode === 410 || statusCode === 404) && attempt > 0) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        return;
      }

      if (attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWithRetry(sub, data, attempt + 1);
      }

      throw err;
    }
  }

  async broadcastToRole(orgId: string, role: string, payload: PushPayload) {
    const { users } = await import('../../db/schema.js');
    const usersInRole = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.organizationId, orgId),
          eq(users.role, role),
          eq(users.status, 'active'),
        ),
      );

    await Promise.allSettled(
      usersInRole.map((u) => this.sendToUser(u.id, payload)),
    );
  }
}

export const pushService = new PushService();
