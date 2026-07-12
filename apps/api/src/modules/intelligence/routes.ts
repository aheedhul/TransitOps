import { Router, type Router as RouterType, type Request, type Response } from 'express';
import { getActor } from '../../lib/request.js';
import { TripService, NotFoundError, BusinessRuleError } from '../trips/service.js';
import { dispatchCheckSchema, dispatchRecommendationSchema } from '../trips/dto.js';
import { requireAuth, requireCapability } from '../../middleware/auth.js';
import { ZodError } from 'zod';
import { collectFleetSignals } from '../../lib/intelligence/signals.js';
import { enhanceReportProse, buildTemplatedReportProse } from '../../lib/llm/adapter.js';

const router: RouterType = Router();
const tripService = new TripService();

router.get('/intelligence/todays-report', requireAuth, requireCapability('reports.read'), async (req, res) => {
  try {
    const fleet = await collectFleetSignals(getActor(req).orgId);
    const useLLM = req.query.llm === 'true';

    const digest = [
      { key: 'trips_completed', value: fleet.tripsCompletedToday, unit: 'trips', context: 'today' },
      { key: 'active_trips', value: fleet.activeTrips, unit: 'trips', context: 'in progress' },
      { key: 'available_vehicles', value: fleet.availableVehicles, unit: 'vehicles', context: 'ready' },
      { key: 'in_maintenance', value: fleet.inMaintenance, unit: 'vehicles', context: 'in shop' },
      { key: 'maint_requests_open', value: fleet.maintRequestsOpen, unit: 'requests', context: '' },
      { key: 'license_expiring', value: fleet.licenseExpiringIn7d, unit: 'drivers', context: 'within 7d' },
      { key: 'overdue_vehicles', value: fleet.overdueVehicles, unit: 'vehicles', context: 'maintenance overdue' },
    ];

    if (fleet.fuelCostChangePct !== null) {
      digest.push({
        key: 'fuel_cost_change_pct',
        value: fleet.fuelCostChangePct,
        unit: '%',
        context: 'vs prev day',
      });
    }

    if (fleet.fleetKpl !== null) {
      digest.push({
        key: 'fleet_kpl',
        value: fleet.fleetKpl,
        unit: 'km/L',
        context: '30d avg',
      });
    }

    digest.push({
      key: 'fleet_utilization',
      value: fleet.fleetUtilizationPct,
      unit: '%',
      context: '30d avg per vehicle',
    });

    const topAlerts: Array<{ title: string; message: string; priority: string }> = [];

    if (fleet.overdueVehicles > 0) {
      topAlerts.push({
        title: `${fleet.overdueVehicles} vehicle(s) overdue for maintenance`,
        message: 'Schedule servicing immediately to avoid downtime.',
        priority: 'red',
      });
    }

    if (fleet.licenseExpiringIn7d > 0) {
      topAlerts.push({
        title: `${fleet.licenseExpiringIn7d} license(s) expiring within 7 days`,
        message: 'Renew licenses before expiry to avoid compliance issues.',
        priority: 'orange',
      });
    }

    if (fleet.inMaintenance >= fleet.totalVehicles * 0.3) {
      topAlerts.push({
        title: `High maintenance load — ${fleet.inMaintenance} of ${fleet.totalVehicles} vehicles in shop`,
        message: '30%+ of fleet is in maintenance.',
        priority: 'orange',
      });
    }

    const recommendations = [];

    if (fleet.overdueVehicles > 0) {
      recommendations.push({
        action: 'schedule_maintenance',
        vehicle_id: null,
        when: 'this_week',
        reason: `${fleet.overdueVehicles} vehicles overdue`,
      });
    }

    if (fleet.availableVehicles < Math.ceil(fleet.activeTrips * 0.3)) {
      recommendations.push({
        action: 'rebalance_region',
        from: null,
        to: null,
        reason: 'Low vehicle availability relative to active trips',
      });
    }

    if (fleet.fuelCostChangePct !== null && fleet.fuelCostChangePct > 10) {
      recommendations.push({
        action: 'review_fuel_cost',
        reason: `Fuel cost up ${fleet.fuelCostChangePct}% vs yesterday`,
      });
    }

    const prompt = {
      asOf: fleet.asOf,
      digest: digest.map((d) => ({ key: d.key, value: d.value, unit: d.unit })),
      topAlerts,
      recommendations: recommendations.map((r) => ({ action: r.action, detail: r.reason })),
    };

    const prose = useLLM
      ? await enhanceReportProse(prompt)
      : buildTemplatedReportProse(prompt);

    res.json({
      data: {
        as_of: fleet.asOf,
        fleet_summary: {
          total_vehicles: fleet.totalVehicles,
          available_vehicles: fleet.availableVehicles,
          in_maintenance: fleet.inMaintenance,
          on_trip: fleet.onTrip,
          active_trips: fleet.activeTrips,
          pending_trips: fleet.pendingTrips,
          drivers_on_duty: fleet.driversOnDuty,
          fleet_utilization_pct: fleet.fleetUtilizationPct,
          fleet_kpl: fleet.fleetKpl,
        },
        digest,
        top_alerts: topAlerts,
        recommendations,
        prose_summary: prose,
      },
    });
  } catch (err) {
    handleError(err, req, res);
  }
});

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
