import { Router, type Router as RouterType } from 'express';
import { requireAuth, requireCapability } from '../../middleware/auth.js';
import { getActor } from '../../lib/request.js';
import { db } from '../../db/index.js';
import {
  vehicles,
  drivers,
  trips,
  fuelLogs,
  maintenanceLogs,
  vehicleHealthScores,
  driverScoreHistory,
  emissionsRecords,
  expenses,
} from '../../db/schema.js';
import { eq, and, isNull, desc, gte, sql, inArray, count } from 'drizzle-orm';
import { logger } from '../../lib/logger.js';

const router: RouterType = Router();

router.get('/reports/fleet-kpis', requireAuth, requireCapability('reports.read'), async (req, res) => {
  try {
    const orgId = getActor(req).orgId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalVehicles,
      availableVehicles,
      inMaintenance,
      onTrip,
      activeTrips,
      pendingTrips,
      driversOnDuty,
      completedTrips30d,
      totalFuelCost30d,
      totalMaintCost30d,
      totalExpenses30d,
    ] = await Promise.all([
      db.select({ cnt: count() }).from(vehicles)
        .where(and(eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
        .then((r) => Number(r[0]?.cnt ?? 0)),
      db.select({ cnt: count() }).from(vehicles)
        .where(and(eq(vehicles.organizationId, orgId), eq(vehicles.status, 'available'), isNull(vehicles.deletedAt)))
        .then((r) => Number(r[0]?.cnt ?? 0)),
      db.select({ cnt: count() }).from(vehicles)
        .where(and(eq(vehicles.organizationId, orgId), eq(vehicles.status, 'in-shop'), isNull(vehicles.deletedAt)))
        .then((r) => Number(r[0]?.cnt ?? 0)),
      db.select({ cnt: count() }).from(vehicles)
        .where(and(eq(vehicles.organizationId, orgId), eq(vehicles.status, 'on-trip'), isNull(vehicles.deletedAt)))
        .then((r) => Number(r[0]?.cnt ?? 0)),
      db.select({ cnt: count() }).from(trips)
        .where(and(eq(trips.organizationId, orgId), inArray(trips.status, ['dispatched', 'in-transit']), isNull(trips.deletedAt)))
        .then((r) => Number(r[0]?.cnt ?? 0)),
      db.select({ cnt: count() }).from(trips)
        .where(and(eq(trips.organizationId, orgId), eq(trips.status, 'draft'), isNull(trips.deletedAt)))
        .then((r) => Number(r[0]?.cnt ?? 0)),
      db.select({ cnt: count() }).from(drivers)
        .where(and(eq(drivers.organizationId, orgId), inArray(drivers.status, ['available', 'on-trip']), isNull(drivers.deletedAt)))
        .then((r) => Number(r[0]?.cnt ?? 0)),
      db.select({ cnt: count() }).from(trips)
        .where(and(eq(trips.organizationId, orgId), eq(trips.status, 'completed'), isNull(trips.deletedAt), gte(trips.completedAt, thirtyDaysAgo)))
        .then((r) => Number(r[0]?.cnt ?? 0)),
      db.select({ sum: sql<number>`coalesce(sum(cost),0)` }).from(fuelLogs)
        .where(and(eq(fuelLogs.organizationId, orgId), isNull(fuelLogs.deletedAt), gte(fuelLogs.filledAt, thirtyDaysAgo)))
        .then((r) => Number(r[0]?.sum ?? 0)),
      db.select({ sum: sql<number>`coalesce(sum(cost),0)` }).from(maintenanceLogs)
        .where(and(eq(maintenanceLogs.organizationId, orgId), isNull(maintenanceLogs.deletedAt), gte(maintenanceLogs.createdAt, thirtyDaysAgo)))
        .then((r) => Number(r[0]?.sum ?? 0)),
      db.select({ sum: sql<number>`coalesce(sum(amount),0)` }).from(expenses)
        .where(and(eq(expenses.organizationId, orgId), isNull(expenses.deletedAt), gte(expenses.incurredAt, thirtyDaysAgo)))
        .then((r) => Number(r[0]?.sum ?? 0)),
    ]);

    res.json({
      data: {
        as_of: now.toISOString(),
        total_vehicles: totalVehicles,
        available_vehicles: availableVehicles,
        in_maintenance: inMaintenance,
        on_trip: onTrip,
        active_trips: activeTrips,
        pending_trips: pendingTrips,
        drivers_on_duty: driversOnDuty,
        completed_trips_30d: completedTrips30d,
        fuel_cost_30d: totalFuelCost30d,
        maintenance_cost_30d: totalMaintCost30d,
        expenses_30d: totalExpenses30d,
        total_op_cost_30d: totalFuelCost30d + totalMaintCost30d + totalExpenses30d,
      },
    });
  } catch (err) {
    logger.error({ err }, 'reports/fleet-kpis error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch fleet KPIs', trace_id: '' } });
  }
});

router.get('/reports/vehicle-health', requireAuth, requireCapability('reports.read'), async (req, res) => {
  try {
    const orgId = getActor(req).orgId;

    const subquery = db
      .select({
        vehicleId: vehicleHealthScores.vehicleId,
        maxComputed: sql<string>`max(${vehicleHealthScores.computedAt})`.as('max_computed'),
      })
      .from(vehicleHealthScores)
      .groupBy(vehicleHealthScores.vehicleId)
      .as('latest');

    const rows = await db
      .select()
      .from(vehicleHealthScores)
      .innerJoin(subquery, and(
        eq(vehicleHealthScores.vehicleId, subquery.vehicleId),
        eq(vehicleHealthScores.computedAt, subquery.maxComputed),
      ))
      .innerJoin(vehicles, eq(vehicleHealthScores.vehicleId, vehicles.id))
      .where(and(eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)));

    res.json({
      data: rows.map(({ vehicle_health_scores, vehicles: v }) => ({
        vehicle_id: v.id,
        registration: v.registrationNumber,
        type: v.type,
        fuel_efficiency_pct: parseFloat(vehicle_health_scores.fuelEfficiencyPct as string),
        maintenance_pct: parseFloat(vehicle_health_scores.maintenancePct as string),
        driver_safety_pct: parseFloat(vehicle_health_scores.driverSafetyPct as string),
        utilization_pct: parseFloat(vehicle_health_scores.utilizationPct as string),
        overall_score: parseFloat(vehicle_health_scores.overallScore as string),
        computed_at: vehicle_health_scores.computedAt,
        signals: vehicle_health_scores.signals,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'reports/vehicle-health error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch vehicle health', trace_id: '' } });
  }
});

router.get('/reports/driver-scores', requireAuth, requireCapability('reports.read'), async (req, res) => {
  try {
    const orgId = getActor(req).orgId;

    const subquery = db
      .select({
        driverId: driverScoreHistory.driverId,
        maxComputed: sql<string>`max(${driverScoreHistory.computedAt})`.as('max_computed'),
      })
      .from(driverScoreHistory)
      .groupBy(driverScoreHistory.driverId)
      .as('latest');

    const rows = await db
      .select()
      .from(driverScoreHistory)
      .innerJoin(subquery, and(
        eq(driverScoreHistory.driverId, subquery.driverId),
        eq(driverScoreHistory.computedAt, subquery.maxComputed),
      ))
      .innerJoin(drivers, eq(driverScoreHistory.driverId, drivers.id))
      .where(and(eq(drivers.organizationId, orgId), isNull(drivers.deletedAt)));

    res.json({
      data: rows.map(({ driver_score_history: dsh, drivers: d }) => ({
        driver_id: d.id,
        name: d.name,
        trips_count: dsh.tripsCount,
        late_trips: dsh.lateTrips,
        safety_score: parseFloat(dsh.safetyScore as string),
        fuel_rating: parseFloat(dsh.fuelRating as string),
        overall_score: parseFloat(dsh.overallScore as string),
        computed_at: dsh.computedAt,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'reports/driver-scores error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch driver scores', trace_id: '' } });
  }
});

router.get('/reports/emissions', requireAuth, requireCapability('reports.read'), async (req, res) => {
  try {
    const orgId = getActor(req).orgId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rows = await db
      .select()
      .from(emissionsRecords)
      .innerJoin(vehicles, eq(emissionsRecords.vehicleId, vehicles.id))
      .where(and(eq(emissionsRecords.organizationId, orgId), gte(emissionsRecords.periodStart, thirtyDaysAgo)))
      .orderBy(desc(emissionsRecords.periodStart));

    const perVehicle = new Map<string, { registration: string; co2Kg: number; distanceKm: number; tripCount: number }>();
    for (const { emissions_records: er, vehicles: v } of rows) {
      const existing = perVehicle.get(v.id) ?? { registration: v.registrationNumber as string, co2Kg: 0, distanceKm: 0, tripCount: 0 };
      existing.co2Kg += parseFloat(er.co2Kg as string) || 0;
      existing.distanceKm += parseFloat(er.distanceKm as string) || 0;
      existing.tripCount++;
      perVehicle.set(v.id, existing);
    }

    res.json({
      data: {
        period_days: 30,
        total_co2_kg: Array.from(perVehicle.values()).reduce((s, v) => s + v.co2Kg, 0),
        total_distance_km: Array.from(perVehicle.values()).reduce((s, v) => s + v.distanceKm, 0),
        vehicles: Array.from(perVehicle.entries()).map(([id, data]) => ({
          vehicle_id: id,
          registration: data.registration,
          co2_kg: Math.round(data.co2Kg * 1000) / 1000,
          distance_km: data.distanceKm,
          trip_count: data.tripCount,
        })),
      },
    });
  } catch (err) {
    logger.error({ err }, 'reports/emissions error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch emissions', trace_id: '' } });
  }
});

router.get('/reports/utilization', requireAuth, requireCapability('reports.read'), async (req, res) => {
  try {
    const orgId = getActor(req).orgId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const vehicleList = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)));

    const periodSeconds = 30 * 24 * 3600;
    const results = [];

    for (const v of vehicleList) {
      const tripRows = await db
        .select()
        .from(trips)
        .where(
          and(
            eq(trips.vehicleId, v.id),
            eq(trips.organizationId, orgId),
            isNull(trips.deletedAt),
            gte(trips.completedAt, thirtyDaysAgo),
          ),
        );

      let activeSeconds = 0;
      for (const t of tripRows) {
        if (!t.dispatchedAt) continue;
        const start = new Date(t.dispatchedAt as unknown as string).getTime();
        const end = t.completedAt
          ? new Date(t.completedAt as unknown as string).getTime()
          : Date.now();
        activeSeconds += Math.max(0, (end - start) / 1000);
      }

      const utilPct = Math.min(100, Math.round((activeSeconds / periodSeconds) * 10000) / 100);

      results.push({
        vehicle_id: v.id,
        registration: v.registrationNumber,
        type: v.type,
        utilization_pct: utilPct,
        trip_count: tripRows.length,
      });
    }

    results.sort((a, b) => b.utilization_pct - a.utilization_pct);

    res.json({ data: results });
  } catch (err) {
    logger.error({ err }, 'reports/utilization error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch utilization', trace_id: '' } });
  }
});

function buildCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((c) => {
    const v = String(row[c] ?? '');
    return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(','));
  return [header, ...body].join('\n');
}

router.get('/reports/export/:type', requireAuth, requireCapability('reports.export'), async (req, res) => {
  try {
    const orgId = getActor(req).orgId;
    const reportType = req.params.type;

    let csv: string;
    let filename: string;

    switch (reportType) {
      case 'fleet-kpis': {
        // Reuse the same query logic briefly
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [totalVehicles, availableVehicles, inMaintenance, onTrip, activeTrips, completedTrips30d, totalFuelCost30d, totalMaintCost30d, totalExpenses30d] =
          await Promise.all([
            db.select({ cnt: count() }).from(vehicles).where(and(eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt))).then((r) => Number(r[0]?.cnt ?? 0)),
            db.select({ cnt: count() }).from(vehicles).where(and(eq(vehicles.organizationId, orgId), eq(vehicles.status, 'available'), isNull(vehicles.deletedAt))).then((r) => Number(r[0]?.cnt ?? 0)),
            db.select({ cnt: count() }).from(vehicles).where(and(eq(vehicles.organizationId, orgId), eq(vehicles.status, 'in-shop'), isNull(vehicles.deletedAt))).then((r) => Number(r[0]?.cnt ?? 0)),
            db.select({ cnt: count() }).from(vehicles).where(and(eq(vehicles.organizationId, orgId), eq(vehicles.status, 'on-trip'), isNull(vehicles.deletedAt))).then((r) => Number(r[0]?.cnt ?? 0)),
            db.select({ cnt: count() }).from(trips).where(and(eq(trips.organizationId, orgId), inArray(trips.status, ['dispatched', 'in-transit']), isNull(trips.deletedAt))).then((r) => Number(r[0]?.cnt ?? 0)),
            db.select({ cnt: count() }).from(trips).where(and(eq(trips.organizationId, orgId), eq(trips.status, 'completed'), isNull(trips.deletedAt), gte(trips.completedAt, thirtyDaysAgo))).then((r) => Number(r[0]?.cnt ?? 0)),
            db.select({ sum: sql<number>`coalesce(sum(cost),0)` }).from(fuelLogs).where(and(eq(fuelLogs.organizationId, orgId), isNull(fuelLogs.deletedAt), gte(fuelLogs.filledAt, thirtyDaysAgo))).then((r) => Number(r[0]?.sum ?? 0)),
            db.select({ sum: sql<number>`coalesce(sum(cost),0)` }).from(maintenanceLogs).where(and(eq(maintenanceLogs.organizationId, orgId), isNull(maintenanceLogs.deletedAt), gte(maintenanceLogs.createdAt, thirtyDaysAgo))).then((r) => Number(r[0]?.sum ?? 0)),
            db.select({ sum: sql<number>`coalesce(sum(amount),0)` }).from(expenses).where(and(eq(expenses.organizationId, orgId), isNull(expenses.deletedAt), gte(expenses.incurredAt, thirtyDaysAgo))).then((r) => Number(r[0]?.sum ?? 0)),
          ]);

        csv = buildCsv(
          ['total_vehicles', 'available', 'in_maintenance', 'on_trip', 'active_trips', 'completed_30d', 'fuel_cost_30d', 'maint_cost_30d', 'expenses_30d'],
          [{ total_vehicles: totalVehicles, available: availableVehicles, in_maintenance: inMaintenance, on_trip: onTrip, active_trips: activeTrips, completed_30d: completedTrips30d, fuel_cost_30d: totalFuelCost30d, maint_cost_30d: totalMaintCost30d, expenses_30d: totalExpenses30d }],
        );
        filename = 'fleet-kpis.csv';
        break;
      }

      case 'emissions': {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const rows = await db
          .select()
          .from(emissionsRecords)
          .innerJoin(vehicles, eq(emissionsRecords.vehicleId, vehicles.id))
          .where(and(eq(emissionsRecords.organizationId, orgId), gte(emissionsRecords.periodStart, thirtyDaysAgo)));

        csv = buildCsv(
          ['id', 'vehicle_id', 'registration', 'distance_km', 'fuel_consumed_l', 'co2_kg', 'method', 'period_start'],
          rows.map(({ emissions_records: er, vehicles: v }) => ({
            id: er.id,
            vehicle_id: v.id,
            registration: v.registrationNumber,
            distance_km: er.distanceKm,
            fuel_consumed_l: er.fuelConsumedL ?? '',
            co2_kg: er.co2Kg,
            method: er.method,
            period_start: er.periodStart,
          })),
        );
        filename = 'emissions.csv';
        break;
      }

      default:
        res.status(400).json({ error: { code: 'INVALID_REPORT_TYPE', message: `Unknown report type: ${reportType}`, trace_id: '' } });
        return;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    logger.error({ err }, 'reports/export error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to export report', trace_id: '' } });
  }
});

export default router;
