import { subscribe } from '../bus.js';
import { TOPICS } from '../topics.js';
import { db } from '../../../db/index.js';
import { fuelLogs, fuelAnomalyFlags } from '../../../db/schema.js';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { logger } from '../../../lib/logger.js';

const ALPHA = 0.3;
const DEFAULT_DEVIATION_THRESHOLD = 15;

export function initFuelAnomalySubscriber(): void {
  subscribe(TOPICS.FUEL_LOG_CREATED, async (event) => {
    try {
      const fuelLogId = event.entity.id;
      const payload = event.payload as { vehicleId: string; liters: number; odometerKm: number };
      const vehicleId = payload.vehicleId;
      const orgId = event.organizationId;

      const currentLog = await db
        .select()
        .from(fuelLogs)
        .where(and(eq(fuelLogs.id, fuelLogId), isNull(fuelLogs.deletedAt)))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!currentLog) return;

      const currentOdometer = parseFloat(currentLog.odometerKm as string);
      const currentLiters = parseFloat(currentLog.liters as string);

      const previousLog = await db
        .select()
        .from(fuelLogs)
        .where(and(eq(fuelLogs.vehicleId, vehicleId), eq(fuelLogs.organizationId, orgId), isNull(fuelLogs.deletedAt)))
        .orderBy(desc(fuelLogs.odometerKm))
        .limit(2)
        .then((rows) => rows.find((r) => r.id !== fuelLogId) ?? null);

      if (!previousLog) {
        logger.debug({ vehicleId }, 'fuel_anomaly: no previous log, skipping');
        return;
      }

      const prevOdometer = parseFloat(previousLog.odometerKm as string);
      const kmDriven = currentOdometer - prevOdometer;
      if (kmDriven <= 0) {
        logger.debug({ vehicleId, kmDriven }, 'fuel_anomaly: non-positive km driven, skipping');
        return;
      }

      const actualKpl = kmDriven / currentLiters;

      const existingFlags = await db
        .select()
        .from(fuelAnomalyFlags)
        .where(eq(fuelAnomalyFlags.fuelLogId, fuelLogId))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (existingFlags) return;

      const allPreviousLogs = await db
        .select()
        .from(fuelLogs)
        .where(and(eq(fuelLogs.vehicleId, vehicleId), eq(fuelLogs.organizationId, orgId), isNull(fuelLogs.deletedAt)))
        .orderBy(desc(fuelLogs.odometerKm));

      let rollingKpl: number;
      const sampleCount = allPreviousLogs.length;

      if (sampleCount < 5) {
        rollingKpl = getClassDefaultKpl(currentLog.fuelType as string);
      } else {
        let ewma = getClassDefaultKpl(currentLog.fuelType as string);
        let first = true;
        const orderedLogs = [...allPreviousLogs].reverse();
        for (let i = 1; i < orderedLogs.length; i++) {
          const curr = orderedLogs[i]!;
          const prev = orderedLogs[i - 1]!;
          const km = parseFloat(curr.odometerKm as string) - parseFloat(prev.odometerKm as string);
          const liters = parseFloat(curr.liters as string);
          if (km > 0 && liters > 0) {
            const kpl = km / liters;
            if (first) {
              ewma = kpl;
              first = false;
            } else {
              ewma = ALPHA * kpl + (1 - ALPHA) * ewma;
            }
          }
        }
        rollingKpl = ewma;
      }

      if (rollingKpl <= 0) {
        logger.debug({ vehicleId }, 'fuel_anomaly: rolling KPL is zero, skipping');
        return;
      }

      const expectedConsumptionL = kmDriven / rollingKpl;
      const deviationPct = ((rollingKpl - actualKpl) / rollingKpl) * 100;

      const thresholdPct = DEFAULT_DEVIATION_THRESHOLD;

      if (Math.abs(deviationPct) < thresholdPct) {
        return;
      }

      let severity: string;
      const absDev = Math.abs(deviationPct);
      if (absDev > 30) severity = 'high';
      else if (absDev > 20) severity = 'medium';
      else severity = 'low';

      if (deviationPct < 0 && severity === 'low') {
        logger.debug({ vehicleId, deviationPct }, 'fuel_anomaly: unusually good consumption (negative deviation), skipping flag');
        return;
      }

      await db.insert(fuelAnomalyFlags).values({
        fuelLogId,
        vehicleId,
        expectedConsumptionL: expectedConsumptionL.toString(),
        actualConsumptionL: currentLiters.toString(),
        expectedKpl: rollingKpl.toString(),
        actualKpl: actualKpl.toString(),
        deviationPct: deviationPct.toString(),
        thresholdPct: thresholdPct.toString(),
        severity,
      });

      logger.info({ vehicleId, fuelLogId, deviationPct, severity }, 'fuel anomaly detected');
    } catch (err) {
      logger.error({ err }, 'fuel_anomaly subscriber error');
    }
  });
}

function getClassDefaultKpl(fuelType: string): number {
  switch (fuelType) {
    case 'diesel': return 3.8;
    case 'petrol': return 10.0;
    case 'cng': return 5.0;
    case 'electric': return 6.0;
    case 'hybrid': return 12.0;
    default: return 5.0;
  }
}
