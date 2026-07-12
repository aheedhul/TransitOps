import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getParam, getActor } from '../../lib/request.js';
import { GeofenceService, NotFoundError } from './service.js';
import { createGeofenceSchema, updateGeofenceSchema } from './dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';
import { ZodError } from 'zod';

const router: RouterType = Router();
const geofenceService = new GeofenceService();

router.get('/geofences', requireAuth, requireCapability('geofence.read'), async (req, res) => {
  try {
    const kind = req.query.kind as string | undefined;
    const result = await geofenceService.list(getActor(req).orgId, kind);
    res.json(result);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/geofences/:id', requireAuth, requireCapability('geofence.read'), async (req, res) => {
  try {
    const geofence = await geofenceService.getById(getParam(req, 'id'), getActor(req).orgId);
    res.json({ data: geofence });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/geofences', requireAuth, requireCapability('geofence.create'), async (req, res) => {
  try {
    const input = createGeofenceSchema.parse(req.body);
    const geofence = await geofenceService.create(input, getActor(req).orgId, getActor(req).userId);
    res.status(201).json({ data: geofence });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.put('/geofences/:id', requireAuth, requireCapability('geofence.update'), async (req, res) => {
  try {
    const input = updateGeofenceSchema.parse(req.body);
    const geofence = await geofenceService.update(
      getParam(req, 'id'),
      getActor(req).orgId,
      input,
      getActor(req).userId,
    );
    res.json({ data: geofence });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.delete('/geofences/:id', requireAuth, requireCapability('geofence.delete'), async (req, res) => {
  try {
    await geofenceService.softDelete(getParam(req, 'id'), getActor(req).orgId, getActor(req).userId);
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
