import { db } from '../../db/index.js';
import {
  vehicles,
  drivers,
  trips,
  fuelLogs,
  fuelAnomalyFlags,
  maintenanceLogs,
  maintenanceSchedules,
  organizations,
} from '../../db/schema.js';
import { eq, and, isNull, desc, sql, gte, lte, inArray, lt } from 'drizzle-orm';

export interface TripSummary {
  id: string;
  status: string;
  distanceKm: number;
  fuelConsumedL: number;
  completedAt: string | null;
  actualKpl: number | null;
}

export interface MaintenanceSummary {
  id: string;
  type: string;
  status: string;
  serviceOdometer: number | null;
  cost: string;
  createdAt: string;
}

export interface AnomalySummary {
  id: string;
  deviationPct: number;
  severity: string;
  flaggedAt: string;
}

export interface DriverSummary {
  id: string;
  name: string;
  safetyScore: number;
  overallScore: number;
}

export interface OrgThresholds {
  'maintenance.oil_change_km_threshold'?: number;
  'maintenance.tyre_rotation_km_threshold'?: number;
  'fuel.anomaly_deviation_pct'?: number;
  'fuel.rolling_alpha'?: number;
  'fuel.rolling_min_samples'?: number;
  'license.expire_warn_days'?: number;
  'predictive_eta.max_delta_min'?: number;
  'scoring.weights.fuel_efficiency'?: number;
  'scoring.weights.maintenance'?: number;
  'scoring.weights.driver_safety'?: number;
  'scoring.weights.utilization'?: number;
}

export interface VehicleSignals {
  vehicleId: string;
  organizationId: string;
  odometerKm: number;
  status: string;
  fuelType: string;
  registrationNumber: string;
  type: string;
  maxLoadCapacity: string;
  acquisitionCost: string;
  rollingKpl: number | null;
  latestKpl: number | null;
  recentTrips: TripSummary[];
  maintenanceHistory: MaintenanceSummary[];
  lastServiceOdometer: number | null;
  anomaliesLast30d: AnomalySummary[];
  driverSummary: DriverSummary | null;
  utilizationPct: number;
  co2Kg30d: number;
  orgThresholds: OrgThresholds;
}

export interface DriverSignals {
  driverId: string;
  organizationId: string;
  name: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  safetyScore: number;
  overallScore: number;
  status: string;
  recentTrips: TripSummary[];
  tripsCount30d: number;
  lateTrips30d: number;
  avgFuelKpl30d: number | null;
}

export interface FleetSignals {
  organizationId: string;
  asOf: string;
  totalVehicles: number;
  availableVehicles: number;
  inMaintenance: number;
  onTrip: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilizationPct: number;
  fleetKpl: number | null;
  fuelCostChangePct: number | null;
  overdueVehicles: number;
  licenseExpiringIn7d: number;
  tripsCompletedToday: number;
  maintRequestsOpen: number;
}

const ALPHA = 0.3;
const MIN_SAMPLES = 5;

export async function collectVehicleSignals(
  vehicleId: string,
  orgId: string,
): Promise<VehicleSignals | null> {
  const vehicle = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.id, vehicleId), eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!vehicle) return null;

  const odometerKm = parseFloat(vehicle.odometer as string) || 0;

  const [recentTrips, maintHistory, lastService, anomalies, fuelLogsData, orgSettings] =
    await Promise.all([
      fetchRecentTrips(vehicleId, 5),
      fetchMaintenanceHistory(vehicleId, 10),
      fetchLastServiceOdometer(vehicleId),
      fetchAnomalies30d(vehicleId),
      fetchFuelLogs(vehicleId, orgId),
      fetchOrgThresholds(orgId),
    ]);

  const rollingKpl = computeRollingKpl(fuelLogsData.map((l) => ({
    odometerKm: parseFloat(l.odometerKm as string),
    liters: parseFloat(l.liters as string),
  })), vehicle.fuelType as string, orgSettings);

  const latestKpl = recentTrips.length > 0 && recentTrips[0]!.fuelConsumedL > 0
    ? recentTrips[0]!.distanceKm / recentTrips[0]!.fuelConsumedL
    : null;

  const utilizationPct = await computeUtilizationPct(vehicleId, orgId, 30);
  const co2Kg30d = await computeCo2Last30d(vehicleId, orgId);

  const driverSummary = await fetchCurrentDriver(vehicleId, orgId);

  return {
    vehicleId,
    organizationId: orgId,
    odometerKm,
    status: vehicle.status as string,
    fuelType: vehicle.fuelType as string,
    registrationNumber: vehicle.registrationNumber as string,
    type: vehicle.type as string,
    maxLoadCapacity: vehicle.maxLoadCapacity as string,
    acquisitionCost: vehicle.acquisitionCost as string,
    rollingKpl,
    latestKpl,
    recentTrips,
    maintenanceHistory: maintHistory,
    lastServiceOdometer: lastService,
    anomaliesLast30d: anomalies,
    driverSummary,
    utilizationPct,
    co2Kg30d,
    orgThresholds: orgSettings,
  };
}

export async function collectDriverSignals(
  driverId: string,
  orgId: string,
): Promise<DriverSignals | null> {
  const driver = await db
    .select()
    .from(drivers)
    .where(and(eq(drivers.id, driverId), eq(drivers.organizationId, orgId), isNull(drivers.deletedAt)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!driver) return null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTrips30d = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.driverId, driverId),
        eq(trips.organizationId, orgId),
        isNull(trips.deletedAt),
        gte(trips.completedAt, thirtyDaysAgo),
      ),
    )
    .orderBy(desc(trips.completedAt))
    .limit(50);

  const tripsCount30d = recentTrips30d.length;

  const lateTrips30d = recentTrips30d.filter((t) => {
    if (!t.plannedArrivalAt || !t.completedAt) return false;
    return new Date(t.completedAt as unknown as string) > new Date(t.plannedArrivalAt as unknown as string);
  }).length;

  let avgFuelKpl30d: number | null = null;
  const tripsWithFuel = recentTrips30d.filter(
    (t) => parseFloat(t.fuelConsumedL as string) > 0 && parseFloat(t.actualDistanceKm as string) > 0,
  );
  if (tripsWithFuel.length > 0) {
    const totalKm = tripsWithFuel.reduce((s, t) => s + parseFloat(t.actualDistanceKm as string), 0);
    const totalFuel = tripsWithFuel.reduce((s, t) => s + parseFloat(t.fuelConsumedL as string), 0);
    avgFuelKpl30d = totalFuel > 0 ? totalKm / totalFuel : null;
  }

  const recentTrips: TripSummary[] = recentTrips30d.slice(0, 5).map((t) => ({
    id: t.id as string,
    status: t.status as string,
    distanceKm: parseFloat(t.actualDistanceKm as string) || 0,
    fuelConsumedL: parseFloat(t.fuelConsumedL as string) || 0,
    completedAt: t.completedAt ? new Date(t.completedAt as unknown as string).toISOString() : null,
    actualKpl:
      parseFloat(t.fuelConsumedL as string) > 0 && parseFloat(t.actualDistanceKm as string) > 0
        ? parseFloat(t.actualDistanceKm as string) / parseFloat(t.fuelConsumedL as string)
        : null,
  }));

  return {
    driverId,
    organizationId: orgId,
    name: driver.name as string,
    licenseNumber: driver.licenseNumber as string,
    licenseExpiryDate: driver.licenseExpiryDate as string,
    safetyScore: parseFloat(driver.safetyScore as string) || 100,
    overallScore: parseFloat(driver.overallScore as string) || 100,
    status: driver.status as string,
    recentTrips,
    tripsCount30d,
    lateTrips30d,
    avgFuelKpl30d,
  };
}

export async function collectFleetSignals(orgId: string): Promise<FleetSignals> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalVehicles,
    availableVehicles,
    inMaintenance,
    onTrip,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    tripsCompletedToday,
    maintRequestsOpen,
    overdueVehicles,
    licenseExpiringIn7d,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(vehicles)
      .where(and(eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` })
      .from(vehicles)
      .where(and(eq(vehicles.organizationId, orgId), eq(vehicles.status, 'available'), isNull(vehicles.deletedAt)))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` })
      .from(vehicles)
      .where(and(eq(vehicles.organizationId, orgId), eq(vehicles.status, 'in-shop'), isNull(vehicles.deletedAt)))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` })
      .from(vehicles)
      .where(and(eq(vehicles.organizationId, orgId), eq(vehicles.status, 'on-trip'), isNull(vehicles.deletedAt)))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(and(eq(trips.organizationId, orgId), inArray(trips.status, ['dispatched', 'in-transit']), isNull(trips.deletedAt)))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(and(eq(trips.organizationId, orgId), eq(trips.status, 'draft'), isNull(trips.deletedAt)))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` })
      .from(drivers)
      .where(and(eq(drivers.organizationId, orgId), inArray(drivers.status, ['available', 'on-trip']), isNull(drivers.deletedAt)))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` })
      .from(trips)
      .where(
        and(
          eq(trips.organizationId, orgId),
          eq(trips.status, 'completed'),
          isNull(trips.deletedAt),
          gte(trips.completedAt, today),
        ),
      )
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` })
      .from(maintenanceLogs)
      .where(and(eq(maintenanceLogs.organizationId, orgId), eq(maintenanceLogs.status, 'active'), isNull(maintenanceLogs.deletedAt)))
      .then((r) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` })
      .from(maintenanceSchedules)
      .innerJoin(vehicles, eq(maintenanceSchedules.vehicleId, vehicles.id))
      .where(
        and(
          eq(vehicles.organizationId, orgId),
          eq(maintenanceSchedules.status, 'pending'),
          sql`${maintenanceSchedules.predictedDueDate} <= ${today.toISOString().split('T')[0]!}::date`,
        ),
      )
      .then((r: Array<{ count: number }>) => Number(r[0]?.count ?? 0)),
    db.select({ count: sql<number>`count(*)` })
      .from(drivers)
      .where(
        and(
          eq(drivers.organizationId, orgId),
          isNull(drivers.deletedAt),
          gte(drivers.licenseExpiryDate, today.toISOString().split('T')[0]!),
          lte(drivers.licenseExpiryDate, sevenDaysFromNow.toISOString().split('T')[0]!),
        ),
      )
      .then((r) => Number(r[0]?.count ?? 0)),
  ]);

  const utilizationPct = await computeFleetUtilization(orgId, 30);

  const fleetKpl = await computeFleetKpl(orgId, thirtyDaysAgo);

  const fuelCostYesterday = await computeDailyFuelCost(orgId, new Date(Date.now() - 86400000));
  const fuelCostBeforeYesterday = await computeDailyFuelCost(orgId, new Date(Date.now() - 2 * 86400000));
  const fuelCostChangePct =
    fuelCostYesterday !== null && fuelCostBeforeYesterday !== null && fuelCostBeforeYesterday > 0
      ? Math.round(((fuelCostYesterday - fuelCostBeforeYesterday) / fuelCostBeforeYesterday) * 100)
      : null;

  return {
    organizationId: orgId,
    asOf: new Date().toISOString(),
    totalVehicles,
    availableVehicles,
    inMaintenance,
    onTrip,
    activeTrips,
    pendingTrips,
    driversOnDuty,
    fleetUtilizationPct: utilizationPct,
    fleetKpl,
    fuelCostChangePct,
    overdueVehicles,
    licenseExpiringIn7d,
    tripsCompletedToday,
    maintRequestsOpen,
  };
}

async function fetchRecentTrips(vehicleId: string, limit: number): Promise<TripSummary[]> {
  const rows = await db
    .select()
    .from(trips)
    .where(and(eq(trips.vehicleId, vehicleId), isNull(trips.deletedAt)))
    .orderBy(desc(trips.completedAt))
    .limit(limit);

  return rows.map((t) => ({
    id: t.id as string,
    status: t.status as string,
    distanceKm: parseFloat(t.actualDistanceKm as string) || 0,
    fuelConsumedL: parseFloat(t.fuelConsumedL as string) || 0,
    completedAt: t.completedAt ? new Date(t.completedAt as unknown as string).toISOString() : null,
    actualKpl:
      parseFloat(t.fuelConsumedL as string) > 0 && parseFloat(t.actualDistanceKm as string) > 0
        ? parseFloat(t.actualDistanceKm as string) / parseFloat(t.fuelConsumedL as string)
        : null,
  }));
}

async function fetchMaintenanceHistory(vehicleId: string, limit: number): Promise<MaintenanceSummary[]> {
  const rows = await db
    .select()
    .from(maintenanceLogs)
    .where(and(eq(maintenanceLogs.vehicleId, vehicleId), isNull(maintenanceLogs.deletedAt)))
    .orderBy(desc(maintenanceLogs.createdAt))
    .limit(limit);

  return rows.map((m) => ({
    id: m.id as string,
    type: m.type as string,
    status: m.status as string,
    serviceOdometer: m.serviceOdometer ? parseFloat(m.serviceOdometer as string) : null,
    cost: m.cost as string,
    createdAt: new Date(m.createdAt as unknown as string).toISOString(),
  }));
}

async function fetchLastServiceOdometer(vehicleId: string): Promise<number | null> {
  const lastMaintenance = await db
    .select()
    .from(maintenanceLogs)
    .where(and(eq(maintenanceLogs.vehicleId, vehicleId), isNull(maintenanceLogs.deletedAt)))
    .orderBy(desc(maintenanceLogs.createdAt))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!lastMaintenance?.serviceOdometer) return null;
  return parseFloat(lastMaintenance.serviceOdometer as string);
}

async function fetchAnomalies30d(vehicleId: string): Promise<AnomalySummary[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db
    .select()
    .from(fuelAnomalyFlags)
    .where(
      and(
        eq(fuelAnomalyFlags.vehicleId, vehicleId),
        gte(fuelAnomalyFlags.flaggedAt, thirtyDaysAgo),
      ),
    )
    .orderBy(desc(fuelAnomalyFlags.flaggedAt));

  return rows.map((a) => ({
    id: a.id as string,
    deviationPct: parseFloat(a.deviationPct as string),
    severity: a.severity as string,
    flaggedAt: new Date(a.flaggedAt as unknown as string).toISOString(),
  }));
}

async function fetchFuelLogs(vehicleId: string, orgId: string) {
  return db
    .select()
    .from(fuelLogs)
    .where(
      and(
        eq(fuelLogs.vehicleId, vehicleId),
        eq(fuelLogs.organizationId, orgId),
        isNull(fuelLogs.deletedAt),
      ),
    )
    .orderBy(desc(fuelLogs.filledAt))
    .limit(50);
}

function computeRollingKpl(
  fills: { odometerKm: number; liters: number }[],
  fuelType: string,
  thresholds: OrgThresholds,
): number | null {
  const alpha = thresholds['fuel.rolling_alpha'] ?? ALPHA;
  const minSamples = thresholds['fuel.rolling_min_samples'] ?? MIN_SAMPLES;

  const validFills = fills
    .sort((a, b) => a.odometerKm - b.odometerKm)
    .filter(() => true);

  const intervals: number[] = [];
  for (let i = 1; i < validFills.length; i++) {
    const km = validFills[i]!.odometerKm - validFills[i - 1]!.odometerKm;
    const liters = validFills[i]!.liters;
    if (km > 0 && liters > 0) {
      intervals.push(km / liters);
    }
  }

  if (intervals.length === 0) return null;

  if (intervals.length < minSamples) {
    return getClassDefaultKpl(fuelType);
  }

  let ewma = intervals[0]!;
  for (let i = 1; i < intervals.length; i++) {
    ewma = alpha * intervals[i]! + (1 - alpha) * ewma;
  }
  return ewma;
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

async function computeUtilizationPct(vehicleId: string, orgId: string, days: number): Promise<number> {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - days);
  const periodSeconds = days * 24 * 3600;

  const tripRows = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.vehicleId, vehicleId),
        eq(trips.organizationId, orgId),
        isNull(trips.deletedAt),
        gte(trips.completedAt, periodStart),
        inArray(trips.status, ['completed', 'in-transit', 'dispatched']),
      ),
    );

  let totalActiveSeconds = 0;
  for (const t of tripRows) {
    if (!t.dispatchedAt) continue;
    const start = new Date(t.dispatchedAt as unknown as string).getTime();
    const end = t.completedAt
      ? new Date(t.completedAt as unknown as string).getTime()
      : Date.now();
    const activeMs = Math.max(0, end - start);
    totalActiveSeconds += activeMs / 1000;
  }

  const clampedPct = Math.min(100, (totalActiveSeconds / periodSeconds) * 100);
  return Math.round(clampedPct * 100) / 100;
}

async function computeCo2Last30d(vehicleId: string, orgId: string): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.vehicleId, vehicleId),
        eq(trips.organizationId, orgId),
        eq(trips.status, 'completed'),
        isNull(trips.deletedAt),
        gte(trips.completedAt, thirtyDaysAgo),
      ),
    );

  let totalCo2 = 0;
  for (const t of rows) {
    const fuelL = parseFloat(t.fuelConsumedL as string) || 0;
    const distKm = parseFloat(t.actualDistanceKm as string) || 0;
    if (fuelL > 0) {
      totalCo2 += fuelL * 2.68;
    } else if (distKm > 0) {
      totalCo2 += distKm * 0.085;
    }
  }
  return Math.round(totalCo2 * 1000) / 1000;
}

async function fetchCurrentDriver(vehicleId: string, orgId: string): Promise<DriverSummary | null> {
  const lastTrip = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.vehicleId, vehicleId),
        eq(trips.organizationId, orgId),
        isNull(trips.deletedAt),
      ),
    )
    .orderBy(desc(trips.dispatchedAt))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!lastTrip?.driverId) return null;

  const driver = await db
    .select()
    .from(drivers)
    .where(and(eq(drivers.id, lastTrip.driverId), isNull(drivers.deletedAt)))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!driver) return null;

  return {
    id: driver.id as string,
    name: driver.name as string,
    safetyScore: parseFloat(driver.safetyScore as string) || 100,
    overallScore: parseFloat(driver.overallScore as string) || 100,
  };
}

async function fetchOrgThresholds(orgId: string): Promise<OrgThresholds> {
  const org = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (!org?.settings) return {};
  const s = org.settings as Record<string, unknown>;
  const thresholds: OrgThresholds = {};
  if (typeof s?.['maintenance'] === 'object' && s['maintenance']) {
    const m = s['maintenance'] as Record<string, unknown>;
    if (typeof m.oil_change_km_threshold === 'number') thresholds['maintenance.oil_change_km_threshold'] = m.oil_change_km_threshold;
    if (typeof m.tyre_rotation_km_threshold === 'number') thresholds['maintenance.tyre_rotation_km_threshold'] = m.tyre_rotation_km_threshold;
  }
  if (typeof s?.['fuel'] === 'object' && s['fuel']) {
    const f = s['fuel'] as Record<string, unknown>;
    if (typeof f.anomaly_deviation_pct === 'number') thresholds['fuel.anomaly_deviation_pct'] = f.anomaly_deviation_pct;
    if (typeof f.rolling_alpha === 'number') thresholds['fuel.rolling_alpha'] = f.rolling_alpha;
    if (typeof f.rolling_min_samples === 'number') thresholds['fuel.rolling_min_samples'] = f.rolling_min_samples;
  }
  if (typeof s?.['license'] === 'object' && s['license']) {
    const l = s['license'] as Record<string, unknown>;
    if (typeof l.expire_warn_days === 'number') thresholds['license.expire_warn_days'] = l.expire_warn_days;
  }
  if (typeof s?.['predictive_eta'] === 'object' && s['predictive_eta']) {
    const p = s['predictive_eta'] as Record<string, unknown>;
    if (typeof p.max_delta_min === 'number') thresholds['predictive_eta.max_delta_min'] = p.max_delta_min;
  }
  if (typeof s?.['scoring'] === 'object' && s['scoring'] && typeof (s['scoring'] as Record<string, unknown>).weights === 'object') {
    const w = (s['scoring'] as Record<string, unknown>).weights as Record<string, unknown>;
    if (typeof w.fuel_efficiency === 'number') thresholds['scoring.weights.fuel_efficiency'] = w.fuel_efficiency;
    if (typeof w.maintenance === 'number') thresholds['scoring.weights.maintenance'] = w.maintenance;
    if (typeof w.driver_safety === 'number') thresholds['scoring.weights.driver_safety'] = w.driver_safety;
    if (typeof w.utilization === 'number') thresholds['scoring.weights.utilization'] = w.utilization;
  }
  return thresholds;
}

async function computeFleetUtilization(orgId: string, days: number): Promise<number> {
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - days);
  const periodSeconds = days * 24 * 3600;

  const vehicleCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(vehicles)
    .where(and(eq(vehicles.organizationId, orgId), isNull(vehicles.deletedAt)))
    .then((r) => Number(r[0]?.count ?? 0));

  if (vehicleCount === 0) return 0;

  const tripRows = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.organizationId, orgId),
        isNull(trips.deletedAt),
        gte(trips.completedAt, periodStart),
        inArray(trips.status, ['completed', 'in-transit', 'dispatched']),
      ),
    );

  let totalActiveSeconds = 0;
  for (const t of tripRows) {
    if (!t.dispatchedAt) continue;
    const start = new Date(t.dispatchedAt as unknown as string).getTime();
    const end = t.completedAt
      ? new Date(t.completedAt as unknown as string).getTime()
      : Date.now();
    totalActiveSeconds += Math.max(0, (end - start) / 1000);
  }

  const totalAvailableSeconds = vehicleCount * periodSeconds;
  return totalAvailableSeconds > 0
    ? Math.min(100, Math.round((totalActiveSeconds / totalAvailableSeconds) * 10000) / 100)
    : 0;
}

async function computeFleetKpl(orgId: string, since: Date): Promise<number | null> {
  const rows = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.organizationId, orgId),
        isNull(trips.deletedAt),
        eq(trips.status, 'completed'),
        gte(trips.completedAt, since),
      ),
    );

  let totalKm = 0;
  let totalFuel = 0;
  for (const t of rows) {
    totalKm += parseFloat(t.actualDistanceKm as string) || 0;
    totalFuel += parseFloat(t.fuelConsumedL as string) || 0;
  }
  return totalFuel > 0 ? Math.round((totalKm / totalFuel) * 100) / 100 : null;
}

async function computeDailyFuelCost(orgId: string, day: Date): Promise<number | null> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const rows = await db
    .select()
    .from(fuelLogs)
    .where(
      and(
        eq(fuelLogs.organizationId, orgId),
        isNull(fuelLogs.deletedAt),
        gte(fuelLogs.filledAt, start),
        lt(fuelLogs.filledAt, end),
      ),
    );

  if (rows.length === 0) return null;

  return rows.reduce((sum, r) => sum + parseFloat(r.cost as string), 0);
}
