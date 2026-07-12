import { subscribe } from '../bus.js';
import { TOPICS } from '../topics.js';
import { db } from '../../../db/index.js';
import { maintenanceSchedules, maintenanceLogs, vehicles, trips } from '../../../db/schema.js';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { logger } from '../../../lib/logger.js';

const OIL_CHANGE_KM = 5000;
const TYRE_ROTATION_KM = 10000;
const DEFAULT_RUNWAY_DAYS = 3;

export function initMaintenanceScheduleSubscriber(): void {
  subscribe(TOPICS.TRIP_COMPLETED, async (event) => {
    try {
      const payload = event.payload as { vehicleId?: string };
      const vehicleId = payload.vehicleId;
      if (!vehicleId) return;
      await recomputeSchedule(vehicleId);
    } catch (err) {
      logger.error({ err }, 'maintenance_schedule subscriber error (trip.completed)');
    }
  });

  subscribe(TOPICS.MAINTENANCE_CLOSED, async (event) => {
    try {
      const payload = event.payload as { vehicleId?: string };
      const vehicleId = payload.vehicleId;
      if (!vehicleId) return;
      await recomputeSchedule(vehicleId);
    } catch (err) {
      logger.error({ err }, 'maintenance_schedule subscriber error (maintenance.closed)');
    }
  });
}

async function recomputeSchedule(vehicleId: string): Promise<void> {
  const vehicle = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), isNull(vehicles.deletedAt)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!vehicle) return;

  const currentOdometer = parseFloat(vehicle.odometer as string) || 0;

  const lastMaintenance = await db
    .select()
    .from(maintenanceLogs)
    .where(and(eq(maintenanceLogs.vehicleId, vehicleId), isNull(maintenanceLogs.deletedAt)))
    .orderBy(desc(maintenanceLogs.createdAt))
    .limit(1)
    .then((r) => r[0] ?? null);

  const lastServiceOdometer = lastMaintenance?.serviceOdometer
    ? parseFloat(lastMaintenance.serviceOdometer as string)
    : 0;

  const sinceLast = currentOdometer - lastServiceOdometer;

  const recentKm = await getRecentDailyKm(vehicleId);
  const avgDailyKm = recentKm.length > 0
    ? recentKm.reduce((sum, d) => sum + d, 0) / recentKm.length
    : 50;
  const safetyHeadroom = avgDailyKm * DEFAULT_RUNWAY_DAYS;

  const rules = [
    { type: 'oil_change', kmThreshold: OIL_CHANGE_KM },
    { type: 'tyre_rotation', kmThreshold: TYRE_ROTATION_KM },
  ];

  for (const rule of rules) {
    if (sinceLast + safetyHeadroom >= rule.kmThreshold) {
      const predictedDueOdometer = lastServiceOdometer + rule.kmThreshold;
      const predictedDueDate = estimateDueDate(avgDailyKm, sinceLast, rule.kmThreshold);

      const existingSchedule = await db
        .select()
        .from(maintenanceSchedules)
        .where(
          and(
            eq(maintenanceSchedules.vehicleId, vehicleId),
            eq(maintenanceSchedules.basisRuleId, `${rule.type}_${rule.kmThreshold}km`),
            eq(maintenanceSchedules.status, 'pending'),
          ),
        )
        .limit(1)
        .then((r) => r[0] ?? null);

      if (existingSchedule) {
        await db
          .update(maintenanceSchedules)
          .set({
            predictedDueOdometer: predictedDueOdometer.toString(),
            predictedDueDate: predictedDueDate,
            updatedAt: new Date(),
          })
          .where(eq(maintenanceSchedules.id, existingSchedule.id));
      } else {
        await db.insert(maintenanceSchedules).values({
          vehicleId,
          basisRuleId: `${rule.type}_${rule.kmThreshold}km`,
          predictedDueOdometer: predictedDueOdometer.toString(),
          predictedDueDate: predictedDueDate,
          status: 'pending',
        });
      }

      logger.info({ vehicleId, rule: rule.type, predictedDueOdometer }, 'maintenance schedule predicted');
    }
  }
}

async function getRecentDailyKm(vehicleId: string): Promise<number[]> {
  const recentTrips = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.vehicleId, vehicleId),
        eq(trips.status, 'completed'),
        isNull(trips.deletedAt),
      ),
    )
    .orderBy(desc(trips.completedAt))
    .limit(30);

  return recentTrips
    .map((t) => parseFloat(t.actualDistanceKm as string) || 0)
    .filter((d) => d > 0);
}

function estimateDueDate(avgDailyKm: number, sinceLastKm: number, thresholdKm: number): string {
  const kmRemaining = Math.max(0, thresholdKm - sinceLastKm);
  const daysRemaining = avgDailyKm > 0 ? kmRemaining / avgDailyKm : 30;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + Math.ceil(daysRemaining));
  return dueDate.toISOString().split('T')[0]!;
}
