import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getParam, getActor } from '../../lib/request.js';
import { TelematicsService, NotFoundError } from './service.js';
import { telematicsIngestSchema, telematicsBatchSchema } from './dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';
import { ZodError } from 'zod';

const router: RouterType = Router();
const telematicsService = new TelematicsService();

router.get('/telematics/fleet-positions', requireAuth, requireCapability('telematics.read'), async (req, res) => {
  try {
    const positions = await telematicsService.getFleetPositions(getActor(req).orgId);
    res.json({ data: positions });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/telematics/vehicles/:vehicleId/latest', requireAuth, requireCapability('telematics.read'), async (req, res) => {
  try {
    const location = await telematicsService.getLatestForVehicle(getParam(req, 'vehicleId'));
    res.json({ data: location });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/telematics/ingest', requireAuth, requireCapability('telematics.ingest'), async (req, res) => {
  try {
    const input = telematicsIngestSchema.parse(req.body);
    const location = await telematicsService.ingest(input, getActor(req).userId);
    res.status(201).json({ data: location });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/telematics/ingest-batch', requireAuth, requireCapability('telematics.ingest'), async (req, res) => {
  try {
    const input = telematicsBatchSchema.parse(req.body);
    const locations = await telematicsService.ingestBatch(input.positions, getActor(req).userId);
    res.status(201).json({ data: locations, meta: { count: locations.length } });
  } catch (err) {
    nextError(err, req, res);
  }
});

function nextError(err: unknown, _req: Request, res: Response) {
  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: err.message, trace_id: '' },
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
