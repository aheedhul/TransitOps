import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'license_expiring',
  'license_expired',
  'maintenance_overdue',
  'maintenance_predicted_due',
  'trip_dispatched',
  'trip_completed',
  'trip_cancelled',
  'trip_eta_changed',
  'fuel_anomaly_detected',
  'maintenance_created',
  'maintenance_closed',
  'document_expiring',
] as const;

const PRIORITIES = ['red', 'orange', 'blue', 'green'] as const;
const AUDIENCE_ROLES = ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] as const;

export const createNotificationSchema = z.object({
  type: z.string().min(1),
  priority: z.enum(PRIORITIES),
  title: z.string().min(1),
  message: z.string().min(1),
  payload: z.record(z.unknown()).default({}),
  audienceRole: z.enum(AUDIENCE_ROLES).optional(),
  actorUserId: z.string().uuid().optional(),
  fingerprint: z.string().min(1),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export interface NotificationResponse {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  payload: Record<string, unknown>;
  audienceRole: string | null;
  actorUserId: string | null;
  fingerprint: string;
  createdAt: string;
}

export interface NotificationRecipientResponse {
  id: string;
  notificationId: string;
  userId: string;
  readAt: string | null;
  dismissedAt: string | null;
  emailState: string | null;
  pushState: string | null;
  createdAt: string;
}

export interface NotificationsForUser {
  notification: NotificationResponse;
  recipient: NotificationRecipientResponse;
}

export interface UnreadCountResponse {
  count: number;
}
