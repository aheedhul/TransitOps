import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getParam, getActor } from '../../lib/request.js';
import {
  TripService,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from './service.js';
import {
  createTripSchema,
  updateTripSchema,
  dispatchTripSchema,
  startTripSchema,
  checkpointSchema,
  completeTripSchema,
  cancelTripSchema,
  routeAutofillSchema,
} from './dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';
import { ZodError } from 'zod';

const router: RouterType = Router();
const tripService = new TripService();

router.get('/trips', requireAuth, requireCapability('trip.read'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const result = await tripService.list(getActor(req).orgId, page);
    res.json(result);
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/trips/:id', requireAuth, requireCapability('trip.read'), async (req, res) => {
  try {
    const trip = await tripService.getById(
      getParam(req, 'id'),
      getActor(req).orgId,
      getActor(req).role,
    );
    res.json({ data: trip });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.get('/trips/:id/events', requireAuth, requireCapability('trip.read'), async (req, res) => {
  try {
    const events = await tripService.getEvents(getParam(req, 'id'), getActor(req).orgId);
    res.json({ data: events });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/trips', requireAuth, requireCapability('trip.create'), async (req, res) => {
  try {
    const input = createTripSchema.parse(req.body);
    const trip = await tripService.create(input, getActor(req).orgId, getActor(req).userId);
    res.status(201).json({ data: trip });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.put('/trips/:id', requireAuth, requireCapability('trip.create'), async (req, res) => {
  try {
    const input = updateTripSchema.parse(req.body);
    const trip = await tripService.update(
      getParam(req, 'id'),
      getActor(req).orgId,
      input,
      getActor(req).userId,
    );
    res.json({ data: trip });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.delete('/trips/:id', requireAuth, requireCapability('trip.create'), async (req, res) => {
  try {
    await tripService.softDelete(getParam(req, 'id'), getActor(req).orgId, getActor(req).userId);
    res.status(204).send();
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/trips/:id/dispatch', requireAuth, requireCapability('trip.dispatch'), async (req, res) => {
  try {
    const input = dispatchTripSchema.parse(req.body);
    const result = await tripService.dispatch(
      getParam(req, 'id'),
      getActor(req).orgId,
      input,
      getActor(req).userId,
    );

    const chain = result.chain.filter((r) => !r.ok);
    if (chain.length > 0) {
      res.status(422).json({
        error: {
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'Cannot dispatch trip: blocking rules failed',
          trace_id: '',
          details: chain,
        },
      });
      return;
    }

    res.json({ data: result.data });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/trips/:id/start', requireAuth, requireCapability('trip.start'), async (req, res) => {
  try {
    const input = startTripSchema.parse(req.body);
    const trip = await tripService.start(getParam(req, 'id'), getActor(req).orgId, input, getActor(req).userId);
    res.json({ data: trip });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/trips/:id/checkpoint', requireAuth, requireCapability('trip.checkpoint'), async (req, res) => {
  try {
    const input = checkpointSchema.parse(req.body);
    const trip = await tripService.addCheckpoint(
      getParam(req, 'id'),
      getActor(req).orgId,
      input,
      getActor(req).userId,
    );
    res.json({ data: trip });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/trips/:id/complete', requireAuth, requireCapability('trip.complete'), async (req, res) => {
  try {
    const input = completeTripSchema.parse(req.body);
    const trip = await tripService.complete(
      getParam(req, 'id'),
      getActor(req).orgId,
      input,
      getActor(req).userId,
    );
    res.json({ data: trip });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/trips/:id/cancel', requireAuth, requireCapability('trip.cancel'), async (req, res) => {
  try {
    const input = cancelTripSchema.parse(req.body);
    const trip = await tripService.cancel(getParam(req, 'id'), getActor(req).orgId, input, getActor(req).userId);
    res.json({ data: trip });
  } catch (err) {
    nextError(err, req, res);
  }
});

router.post('/trips/:id/route-autofill', requireAuth, requireCapability('trip.create'), async (req, res) => {
  try {
    const input = routeAutofillSchema.parse(req.body);
    const result = await tripService.routeAutofill(getParam(req, 'id'), getActor(req).orgId, input);
    res.json(result);
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
