import { subscribe } from '../bus.js';
import { TOPICS } from '../topics.js';
import { db } from '../../../db/index.js';
import {
  vehicleHealthScores,
  driverScoreHistory,
  vehicles,
  drivers,
  trips,
  fuelLogs,
  maintenanceLogs,
  maintenanceSchedules,
  organizations,
} from '../../../db/schema.js';
import { eq, and, isNull, desc, gte, sql, lte } from 'drizzle-orm';
import { logger } from '../../../lib/logger.js';

const DEFAULT_WEIGHTS = {
  fuelEfficiency: 0.25,
  maintenance: 0.20,
  driverSafety: 0.25,
  utilization: 0.30,
};

export function initScoringSubscriber(): void {
  subscribe(TOPICS.TRIP_COMPLETED, async (event) => {
    try {
      const payload = event.payload as { vehicleId?: string; driverId?: string };
      if (payload.vehicleId) await computeVehicleHealth(payload.vehicleId, event.organizationId);
      if (payload.driverId) await computeDriverScore(payload.driverId, event.organizationId);
    } catch (err) {
      logger.error({ err }, 'scoring subscriber error (trip.completed)');
    }
  });

  subscribe(TOPICS.MAINTENANCE_CLOSED, async (event) => {
    try {
      const payload = event.payload as { vehicleId?: string };
      if (payload.vehicleId) await computeVehicleHealth(payload.vehicleId, event.organizationId);
    } catch (err) {
      logger.error({ err }, 'scoring subscriber error (maintenance.closed)');
    }
  });

  subscribe(TOPICS.FUEL_ANOMALY_DETECTED, async (event) => {
    try {
      const payload = event.payload as { vehicleId?: string };
      if (payload.vehicleId) await computeVehicleHealth(payload.vehicleId, event.organizationId);
    } catch (err) {
      logger.error({ err }, 'scoring subscriber error (fuel.anomaly)');
    }
  });
}

async function getOrgWeights(orgId: string) {
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!org?.settings) return DEFAULT_WEIGHTS;

  const s = org.settings as Record<string, unknown>;
  const scoring = s?.['scoring'] as Record<string, unknown> | undefined;
  const w = scoring?.['weights'] as Record<string, unknown> | undefined;

  return {
    fuelEfficiency: typeof w?.fuel_efficiency === 'number' ? w.fuel_efficiency : DEFAULT_WEIGHTS.fuelEfficiency,
    maintenance: typeof w?.maintenance === 'number' ? w.maintenance : DEFAULT_WEIGHTS.maintenance,
    driverSafety: typeof w?.driver_safety === 'number' ? w.driver_safety : DEFAULT_WEIGHTS.driverSafety,
    utilization: typeof w?.utilization === 'number' ? w.utilization : DEFAULT_WEIGHTS.utilization,
  };
}

async function computeVehicleHealth(vehicleId: string, orgId: string): Promise<void> {
  const vehicle = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!vehicle) return;

  const weights = await getOrgWeights(orgId);
  const odometerKm = parseFloat(vehicle.odometer as string) || 0;
  const fuelType = vehicle.fuelType as string;

  const fuelEfficiencyPct = await computeFuelEfficiencyPct(vehicleId, orgId, fuelType);
  const maintenancePct = await computeMaintenancePct(vehicleId, odometerKm);
  const driverSafetyPct = await computeDriverSafetyPct(vehicleId, orgId);
  const utilizationPct = await computeUtilizationSubscore(vehicleId, orgId);

  const overallScore = Math.round(
    (weights.fuelEfficiency * fuelEfficiencyPct +
      weights.maintenance * maintenancePct +
      weights.driverSafety * driverSafetyPct +
      weights.utilization * utilizationPct) * 100,
  ) / 100;

  const signals = {
    odometerKm,
    fuelType,
    weights,
    rawScores: { fuelEfficiencyPct, maintenancePct, driverSafetyPct, utilizationPct },
    computedAt: new Date().toISOString(),
  };

  await db.insert(vehicleHealthScores).values({
    vehicleId,
    computedAt: new Date(),
    fuelEfficiencyPct: fuelEfficiencyPct.toString(),
    maintenancePct: maintenancePct.toString(),
    driverSafetyPct: driverSafetyPct.toString(),
    utilizationPct: utilizationPct.toString(),
    overallScore: overallScore.toString(),
    signals,
  });

  logger.info({ vehicleId, overallScore }, 'vehicle health score computed');
}

async function computeFuelEfficiencyPct(vehicleId: string, orgId: string, fuelType: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const fuelRows = await db
    .select()
    .from(fuelLogs)
    .where(
      and(
        eq(fuelLogs.vehicleId, vehicleId),
        eq(fuelLogs.organizationId, orgId),
        isNull(fuelLogs.deletedAt),
        gte(fuelLogs.filledAt, thirtyDaysAgo),
      ),
    )
    .orderBy(desc(fuelLogs.odometerKm));

  if (fuelRows.length < 2) return 50;

  let totalKm = 0;
  let totalLiters = 0;
  const sorted = fuelRows.sort((a, b) => parseFloat(a.odometerKm as string) - parseFloat(b.odometerKm as string));
  for (let i = 1; i < sorted.length; i++) {
    const km = parseFloat(sorted[i]!.odometerKm as string) - parseFloat(sorted[i - 1]!.odometerKm as string);
    const liters = parseFloat(sorted[i]!.liters as string);
    if (km > 0 && liters > 0) {
      totalKm += km;
      totalLiters += liters;
    }
  }

  if (totalLiters <= 0) return 50;
  const recentKpl = totalKm / totalLiters;

  const bestClassKpl = getBestClassKpl(fuelType);
  const worstClassKpl = getWorstClassKpl(fuelType);

  if (bestClassKpl <= worstClassKpl) return 50;

  const pct = ((recentKpl - worstClassKpl) / (bestClassKpl - worstClassKpl)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100));
}

function getBestClassKpl(fuelType: string): number {
  switch (fuelType) {
    case 'diesel': return 4.5;
    case 'petrol': return 12.0;
    case 'cng': return 6.0;
    case 'electric': return 8.0;
    case 'hybrid': return 15.0;
    default: return 5.0;
  }
}

function getWorstClassKpl(fuelType: string): number {
  switch (fuelType) {
    case 'diesel': return 2.0;
    case 'petrol': return 6.0;
    case 'cng': return 3.0;
    case 'electric': return 3.0;
    case 'hybrid': return 8.0;
    default: return 2.0;
  }
}

async function computeMaintenancePct(vehicleId: string, odometerKm: number): Promise<number> {
  const lastService = await db
    .select()
    .from(maintenanceLogs)
    .where(and(eq(maintenanceLogs.vehicleId, vehicleId), isNull(maintenanceLogs.deletedAt)))
    .orderBy(desc(maintenanceLogs.createdAt))
    .limit(1)
    .then((r) => r[0] ?? null);

  const lastServiceOdometer = lastService?.serviceOdometer
    ? parseFloat(lastService.serviceOdometer as string)
    : 0;
  const sinceService = Math.max(0, odometerKm - lastServiceOdometer);

  const openIssues = await db
    .select({ count: sql<number>`count(*)` })
    .from(maintenanceLogs)
    .where(
      and(
        eq(maintenanceLogs.vehicleId, vehicleId),
        eq(maintenanceLogs.status, 'active'),
        isNull(maintenanceLogs.deletedAt),
      ),
    )
    .then((r) => Number(r[0]?.count ?? 0));

  const overdueSchedules = await db
    .select({ count: sql<number>`count(*)` })
    .from(maintenanceSchedules)
    .where(
      and(
        eq(maintenanceSchedules.vehicleId, vehicleId),
        eq(maintenanceSchedules.status, 'pending'),
        lte(maintenanceSchedules.predictedDueDate, new Date().toISOString().split('T')[0]!),
      ),
    )
    .then((r) => Number(r[0]?.count ?? 0));

  const daysOverduePenalty = overdueSchedules * 5;
  const openIssuePenalty = openIssues * 10;
  const kmPenalty = Math.floor(sinceService / 1000) * 5;

  const score = 100 - daysOverduePenalty - openIssuePenalty - kmPenalty;
  return Math.max(0, Math.min(100, score));
}

async function computeDriverSafetyPct(vehicleId: string, orgId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTrips = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.vehicleId, vehicleId),
        eq(trips.organizationId, orgId),
        isNull(trips.deletedAt),
        gte(trips.completedAt, thirtyDaysAgo),
      ),
    );

  if (recentTrips.length === 0) return 75;

  let totalScores = 0;
  let driverCount = 0;
  const seenDrivers = new Set<string>();

  for (const t of recentTrips) {
    if (!t.driverId || seenDrivers.has(t.driverId as unknown as string)) continue;
    seenDrivers.add(t.driverId as unknown as string);

    const driver = await db
      .select()
      .from(drivers)
      .where(and(eq(drivers.id, t.driverId), isNull(drivers.deletedAt)))
      .limit(1)
      .then((r) => r[0] ?? null);

    if (driver) {
      totalScores += parseFloat(driver.safetyScore as string) || 75;
      driverCount++;
    }
  }

  return driverCount > 0
    ? Math.round((totalScores / driverCount) * 100) / 100
    : 75;
}

async function computeUtilizationSubscore(vehicleId: string, orgId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const periodSeconds = 30 * 24 * 3600;

  const tripRows = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.vehicleId, vehicleId),
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

  const pct = Math.min(100, (activeSeconds / periodSeconds) * 100);
  return Math.round(pct * 100) / 100;
}

async function computeDriverScore(driverId: string, orgId: string): Promise<void> {
  const driver = await db
    .select()
    .from(drivers)
    .where(and(eq(drivers.id, driverId), eq(drivers.organizationId, orgId), isNull(drivers.deletedAt)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!driver) return;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTrips = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.driverId, driverId),
        eq(trips.organizationId, orgId),
        isNull(trips.deletedAt),
        gte(trips.completedAt, thirtyDaysAgo),
        eq(trips.status, 'completed'),
      ),
    );

  const tripsCount = recentTrips.length;

  const lateTrips = recentTrips.filter((t) => {
    if (!t.plannedArrivalAt || !t.completedAt) return false;
    return new Date(t.completedAt as unknown as string) > new Date(t.plannedArrivalAt as unknown as string);
  }).length;

  let safetyScore = 100;
  if (tripsCount > 0) {
    const latePct = lateTrips / tripsCount;
    if (latePct > 0.25) safetyScore -= 20;
    else if (latePct > 0.1) safetyScore -= 10;
  }
  safetyScore = Math.max(0, safetyScore);

  let fuelRating = 50;
  const tripsWithFuel = recentTrips.filter(
    (t) => parseFloat(t.fuelConsumedL as string) > 0 && parseFloat(t.actualDistanceKm as string) > 0,
  );
  if (tripsWithFuel.length > 0) {
    const totalKm = tripsWithFuel.reduce((s, t) => s + parseFloat(t.actualDistanceKm as string), 0);
    const totalFuel = tripsWithFuel.reduce((s, t) => s + parseFloat(t.fuelConsumedL as string), 0);
    const avgKpl = totalFuel > 0 ? totalKm / totalFuel : 0;
    fuelRating = Math.max(0, Math.min(100, avgKpl * 10));
  }

  const overallScore = Math.round(
    (0.6 * safetyScore + 0.4 * fuelRating) * 100,
  ) / 100;

  const today = new Date();
  const periodStart = new Date(today);
  periodStart.setDate(periodStart.getDate() - 30);

  await db.insert(driverScoreHistory).values({
    driverId,
    computedAt: new Date(),
    periodStart: periodStart.toISOString().split('T')[0]!,
    periodEnd: today.toISOString().split('T')[0]!,
    tripsCount,
    lateTrips,
    safetyScore: safetyScore.toString(),
    fuelRating: fuelRating.toString(),
    overallScore: overallScore.toString(),
    note: lateTrips > 0 ? `${lateTrips} late trips in 30 days` : null,
  });

  await db
    .update(drivers)
    .set({
      safetyScore: safetyScore.toString(),
      overallScore: overallScore.toString(),
    })
    .where(and(eq(drivers.id, driverId)));

  logger.info({ driverId, overallScore, tripsCount }, 'driver score computed');
}
