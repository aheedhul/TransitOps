import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getParam, getActor } from '../../lib/request.js';
import { VehicleService, NotFoundError, ConflictError } from './service.js';
import { createVehicleSchema, updateVehicleSchema } from './dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';
import { buildCopilotResponse } from './copilot.js';

const router: RouterType = Router();
const vehicleService = new VehicleService();

router.get('/vehicles/:id/copilot', requireAuth, requireCapability('vehicle.read'), async (req, res) => {
  try {
    const useLLM = req.query.llm === 'true';
    const result = await buildCopilotResponse(
      getParam(req, 'id'),
      getActor(req).orgId,
      useLLM,
    );

    if (!result) {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Vehicle not found', trace_id: '' },
      });
      return;
    }

    res.json({ data: result });
  } catch (err) {
    throw err;
  }
});

router.get('/vehicles', requireAuth, requireCapability('vehicle.read'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const result = await vehicleService.list(getActor(req).orgId, page);
    res.json(result);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/vehicles/:id', requireAuth, requireCapability('vehicle.read'), async (req, res) => {
  try {
    const vehicle = await vehicleService.getById(getParam(req, 'id'), getActor(req).orgId, getActor(req).role);
    res.json({ data: vehicle });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/vehicles', requireAuth, requireCapability('vehicle.create'), async (req, res) => {
  try {
    const input = createVehicleSchema.parse(req.body);
    const vehicle = await vehicleService.create(input, getActor(req).orgId, getActor(req).userId);
    res.status(201).json({ data: vehicle });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.put('/vehicles/:id', requireAuth, requireCapability('vehicle.update'), async (req, res) => {
  try {
    const input = updateVehicleSchema.parse(req.body);
    const vehicle = await vehicleService.update(getParam(req, 'id'), getActor(req).orgId, input, getActor(req).userId);
    res.json({ data: vehicle });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.delete('/vehicles/:id', requireAuth, requireCapability('vehicle.delete'), async (req, res) => {
  try {
    await vehicleService.softDelete(getParam(req, 'id'), getActor(req).orgId, getActor(req).userId);
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
  } else {
    throw err;
  }
}

export default router;
