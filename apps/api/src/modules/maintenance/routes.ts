import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getParam, getActor } from '../../lib/request.js';
import { MaintenanceService, NotFoundError, ConflictError } from './service.js';
import { createMaintenanceSchema, updateMaintenanceSchema } from './dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';

const router: RouterType = Router();
const maintenanceService = new MaintenanceService();

router.get('/maintenance', requireAuth, requireCapability('maintenance.read'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const vehicleId = req.query.vehicle_id as string | undefined;
    const result = await maintenanceService.list(getActor(req).orgId, vehicleId, page);
    res.json(result);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/maintenance/:id', requireAuth, requireCapability('maintenance.read'), async (req, res) => {
  try {
    const row = await maintenanceService.getById(getParam(req, 'id'), getActor(req).orgId);
    res.json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/maintenance', requireAuth, requireCapability('maintenance.create'), async (req, res) => {
  try {
    const input = createMaintenanceSchema.parse(req.body);
    const row = await maintenanceService.create(input, getActor(req).orgId, getActor(req).userId);
    res.status(201).json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.put('/maintenance/:id', requireAuth, requireCapability('maintenance.create'), async (req, res) => {
  try {
    const input = updateMaintenanceSchema.parse(req.body);
    const row = await maintenanceService.update(getParam(req, 'id'), getActor(req).orgId, input, getActor(req).userId);
    res.json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/maintenance/:id/close', requireAuth, requireCapability('maintenance.close'), async (req, res) => {
  try {
    const row = await maintenanceService.close(getParam(req, 'id'), getActor(req).orgId, getActor(req).userId);
    res.json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.delete('/maintenance/:id', requireAuth, requireCapability('maintenance.create'), async (req, res) => {
  try {
    await maintenanceService.softDelete(getParam(req, 'id'), getActor(req).orgId, getActor(req).userId);
    res.status(204).send();
  } catch (err) {
    nextError(err, req, res);
  }
});

function nextError(err: unknown, _req: Request, res: Response) {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message, trace_id: '' } });
  } else if (err instanceof ConflictError) {
    res.status(409).json({ error: { code: 'CONFLICT', message: err.message, trace_id: '' } });
  } else {
    throw err;
  }
}

export default router;
