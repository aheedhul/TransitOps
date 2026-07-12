import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getActor } from '../../lib/request.js';
import { SyncService, NotFoundError, ConflictError, BusinessRuleError } from './service.js';
import { pushRequestSchema, pullRequestSchema } from './dto.js';
import { requireAuth } from '../../middleware/auth.js';
import { ZodError } from 'zod';

const router: RouterType = Router();
const syncService = new SyncService();

router.post('/sync/push', requireAuth, async (req, res) => {
  try {
    const input = pushRequestSchema.parse(req.body);
    const response = await syncService.processPush(
      input.mutations,
      getActor(req).orgId,
      getActor(req).userId,
    );
    res.json(response);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/sync/pull', requireAuth, async (req, res) => {
  try {
    const input = pullRequestSchema.parse(req.body);
    const response = await syncService.processPull(
      getActor(req).orgId,
      input.since,
      input.entityTypes,
    );
    res.json(response);
  } catch (err) {
    nextError(err, req, res);
  }
});

function nextError(err: unknown, _req: Request, res: Response) {
  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: err.message, trace_id: '' },
    });
  } else if (err instanceof ConflictError) {
    res.status(409).json({
      error: { code: 'CONFLICT', message: err.message, trace_id: '' },
    });
  } else if (err instanceof BusinessRuleError) {
    res.status(422).json({
      error: { code: 'BUSINESS_RULE_VIOLATION', message: err.message, trace_id: '' },
    });
  } else if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Invalid request body',
        trace_id: '',
        details: err.errors.map((e) => ({
          field: e.path.join('.'),
          code: 'INVALID',
          message: e.message,
        })),
      },
    });
  } else {
    throw err;
  }
}

export default router;
