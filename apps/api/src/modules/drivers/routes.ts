import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getParam, getActor } from '../../lib/request.js';
import { DriverService, NotFoundError, ConflictError, ForbiddenError } from './service.js';
import { createDriverSchema, updateDriverSchema } from './dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';

const router: RouterType = Router();
const driverService = new DriverService();

router.get('/drivers', requireAuth, requireCapability('driver.read'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const result = await driverService.list(getActor(req).orgId, page);
    res.json(result);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/drivers/:id', requireAuth, requireCapability('driver.read'), async (req, res) => {
  try {
    const driver = await driverService.getById(
      getParam(req, 'id'),
      getActor(req).orgId,
      getActor(req).userId,
      getActor(req).role,
    );
    res.json({ data: driver });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/drivers', requireAuth, requireCapability('driver.create'), async (req, res) => {
  try {
    const input = createDriverSchema.parse(req.body);
    const driver = await driverService.create(input, getActor(req).orgId);
    res.status(201).json({ data: driver });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.put('/drivers/:id', requireAuth, requireCapability('driver.update'), async (req, res) => {
  try {
    const input = updateDriverSchema.parse(req.body);
    const driver = await driverService.update(
      getParam(req, 'id'),
      getActor(req).orgId,
      input,
      getActor(req).role,
    );
    res.json({ data: driver });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.delete('/drivers/:id', requireAuth, requireCapability('driver.delete'), async (req, res) => {
  try {
    await driverService.softDelete(getParam(req, 'id'), getActor(req).orgId);
    res.status(204).send();
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
  } else if (err instanceof ForbiddenError) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: err.message, trace_id: '' },
    });
  } else {
    throw err;
  }
}

export default router;
