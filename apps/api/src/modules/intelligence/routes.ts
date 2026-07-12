import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getActor } from '../../lib/request.js';
import { TripService, NotFoundError, BusinessRuleError } from '../trips/service.js';
import { dispatchCheckSchema, dispatchRecommendationSchema } from '../trips/dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';
import { ZodError } from 'zod';

const router: RouterType = Router();
const tripService = new TripService();

router.post(
  '/intelligence/dispatch-check',
  requireAuth,
  requireCapability('trip.dispatch'),
  async (req, res) => {
    try {
      const input = dispatchCheckSchema.parse(req.body);
      const result = await tripService.dispatchCheck(
        getActor(req).orgId,
        input.vehicleId,
        input.driverId,
        input.cargoWeightKg,
        input.plannedDepartureAt,
        input.force,
        input.overrideReason,
      );
      res.json({ data: result });
    } catch (err) {
      handleError(err, req, res);
    }
  },
);

router.post(
  '/intelligence/dispatch-recommendation',
  requireAuth,
  requireCapability('trip.dispatch'),
  async (req, res) => {
    try {
      const input = dispatchRecommendationSchema.parse(req.body);
      const result = await tripService.dispatchRecommendation(
        getActor(req).orgId,
        input.cargoWeightKg,
        input.sourceLat,
        input.sourceLng,
        input.plannedDepartureAt,
        input.limit,
      );

      if (!result) {
        res.json({
          data: {
            recommendation: null,
            alternatives: [],
            message: 'No eligible vehicle-driver pairs found',
          },
        });
        return;
      }

      res.json({ data: result });
    } catch (err) {
      handleError(err, req, res);
    }
  },
);

function handleError(err: unknown, _req: Request, res: Response) {
  if (err instanceof NotFoundError) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: err.message, trace_id: '' },
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
