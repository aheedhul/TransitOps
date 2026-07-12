import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getParam, getActor } from '../../lib/request.js';
import { NotificationService, NotFoundError } from './service.js';
import { createNotificationSchema } from './dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';

const router: RouterType = Router();
const notificationService = new NotificationService();

router.get('/notifications/unread-count', requireAuth, requireCapability('notifications.read'), async (req, res) => {
  try {
    const result = await notificationService.getUnreadCount(getActor(req).userId);
    res.json({ data: result });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/notifications/mine', requireAuth, requireCapability('notifications.read'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const result = await notificationService.getForUser(getActor(req).userId, page);
    res.json(result);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/notifications', requireAuth, requireCapability('notifications.read'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const result = await notificationService.listByOrg(getActor(req).orgId, page);
    res.json(result);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/notifications', requireAuth, requireCapability('notifications.send.test'), async (req, res) => {
  try {
    const input = createNotificationSchema.parse(req.body);
    const row = await notificationService.request({ ...input, organizationId: getActor(req).orgId });
    res.status(201).json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/notifications/:id/read', requireAuth, requireCapability('notifications.read'), async (req, res) => {
  try {
    const row = await notificationService.markRead(getParam(req, 'id'), getActor(req).userId);
    res.json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/notifications/:id/dismiss', requireAuth, requireCapability('notifications.read'), async (req, res) => {
  try {
    const row = await notificationService.dismiss(getParam(req, 'id'), getActor(req).userId);
    res.json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

function nextError(err: unknown, _req: Request, res: Response) {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message, trace_id: '' } });
  } else {
    throw err;
  }
}

export default router;
