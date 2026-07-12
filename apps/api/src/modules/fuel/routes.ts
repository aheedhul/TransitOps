import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getParam, getActor } from '../../lib/request.js';
import { FuelService, NotFoundError, BusinessRuleError } from './service.js';
import { createFuelLogSchema, updateFuelLogSchema } from './dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';

const router: RouterType = Router();
const fuelService = new FuelService();

router.get('/fuel-logs', requireAuth, requireCapability('maintenance.read'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const vehicleId = req.query.vehicle_id as string | undefined;
    const result = await fuelService.list(getActor(req).orgId, vehicleId, page);
    res.json(result);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/fuel-logs/:id', requireAuth, requireCapability('maintenance.read'), async (req, res) => {
  try {
    const row = await fuelService.getById(getParam(req, 'id'), getActor(req).orgId);
    res.json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/fuel-logs', requireAuth, requireCapability('fuel_log.create'), async (req, res) => {
  try {
    const input = createFuelLogSchema.parse(req.body);
    const row = await fuelService.create(input, getActor(req).orgId, getActor(req).userId);
    res.status(201).json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.put('/fuel-logs/:id', requireAuth, requireCapability('fuel_log.create'), async (req, res) => {
  try {
    const input = updateFuelLogSchema.parse(req.body);
    const row = await fuelService.update(getParam(req, 'id'), getActor(req).orgId, input, getActor(req).userId);
    res.json({ data: row });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.delete('/fuel-logs/:id', requireAuth, requireCapability('fuel_log.create'), async (req, res) => {
  try {
    await fuelService.softDelete(getParam(req, 'id'), getActor(req).orgId, getActor(req).userId);
    res.status(204).send();
  } catch (err) {
    nextError(err, req, res);
  }
});

function nextError(err: unknown, _req: Request, res: Response) {
  if (err instanceof NotFoundError) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message, trace_id: '' } });
  } else if (err instanceof BusinessRuleError) {
    res.status(422).json({ error: { code: 'BUSINESS_RULE_VIOLATION', message: err.message, trace_id: '' } });
  } else {
    throw err;
  }
}

export default router;
