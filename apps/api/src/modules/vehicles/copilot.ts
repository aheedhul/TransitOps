import { collectVehicleSignals, type VehicleSignals } from '../../lib/intelligence/signals.js';
import { enhanceCopilotProse, buildTemplatedCopilotProse } from '../../lib/llm/adapter.js';

export interface CopilotSignal {
  key: string;
  label: string;
  value: number | string;
  unit: string;
  context: string;
  score: 'good' | 'warn' | 'critical';
}

export interface CopilotRecommendation {
  action: string;
  timing: string;
  why: string;
  confidence: number;
}

export interface CopilotResponse {
  headline: string;
  signals: CopilotSignal[];
  recommendation: CopilotRecommendation;
  sources: {
    vehicleHealthScoreId?: string;
    maintenanceScheduleIds: string[];
    anomalyIds: string[];
  };
  prose: string;
}

export async function buildCopilotResponse(
  vehicleId: string,
  orgId: string,
  useLLM: boolean,
): Promise<CopilotResponse | null> {
  const signals = await collectVehicleSignals(vehicleId, orgId);
  if (!signals) return null;

  const copilotSignals = buildSignals(signals);
  const recommendation = buildRecommendation(signals, copilotSignals);
  const sources = {
    maintenanceScheduleIds: signals.maintenanceHistory
      .filter((m) => m.status === 'active')
      .map((m) => m.id),
    anomalyIds: signals.anomaliesLast30d.map((a) => a.id),
  };

  const prompt = {
    headline: signals.registrationNumber,
    signals: copilotSignals.map((s) => ({
      key: s.key,
      label: s.label,
      value: String(s.value),
      unit: s.unit,
      context: s.context,
      score: s.score,
    })),
    recommendation: {
      action: recommendation.action,
      timing: recommendation.timing,
      why: recommendation.why,
      confidence: recommendation.confidence,
    },
  };

  const prose = useLLM
    ? await enhanceCopilotProse(vehicleId, prompt)
    : buildTemplatedCopilotProse(prompt);

  return {
    headline: `${signals.type} ${signals.registrationNumber}`,
    signals: copilotSignals,
    recommendation,
    sources,
    prose,
  };
}

function buildSignals(s: VehicleSignals): CopilotSignal[] {
  const result: CopilotSignal[] = [];

  result.push({
    key: 'utilization_pct',
    label: 'Utilization',
    value: s.utilizationPct,
    unit: '%',
    context: 'last 30 days',
    score: s.utilizationPct >= 70 ? 'good' : s.utilizationPct >= 40 ? 'warn' : 'critical',
  });

  if (s.rollingKpl !== null) {
    const kpl = Math.round(s.rollingKpl * 100) / 100;
    result.push({
      key: 'fuel_efficiency_ewma',
      label: 'Fuel Efficiency (EWMA)',
      value: kpl,
      unit: 'km/L',
      context: `${s.fuelType}, rolling average`,
      score: kpl >= 4 ? 'good' : kpl >= 2.5 ? 'warn' : 'critical',
    });
  }

  if (s.latestKpl !== null) {
    result.push({
      key: 'latest_kpl',
      label: 'Latest KPL',
      value: Math.round(s.latestKpl * 100) / 100,
      unit: 'km/L',
      context: 'most recent trip',
      score: s.rollingKpl !== null && s.latestKpl < s.rollingKpl * 0.85 ? 'warn' : 'good',
    });
  }

  if (s.lastServiceOdometer !== null) {
    const kmSince = s.odometerKm - s.lastServiceOdometer;
    const oilThreshold = s.orgThresholds['maintenance.oil_change_km_threshold'] ?? 5000;
    const kmRemaining = oilThreshold - kmSince;
    result.push({
      key: 'maintenance_due_in_km',
      label: 'Maintenance due in',
      value: Math.max(0, kmRemaining),
      unit: 'km',
      context: `oil change @${oilThreshold}km`,
      score: kmRemaining <= 500 ? 'critical' : kmRemaining <= 1500 ? 'warn' : 'good',
    });
  }

  if (s.driverSummary) {
    result.push({
      key: 'driver_safety',
      label: `Driver ${s.driverSummary.name}`,
      value: s.driverSummary.safetyScore,
      unit: 'safety score',
      context: `${s.recentTrips.length} recent trips`,
      score: s.driverSummary.safetyScore >= 80 ? 'good' : s.driverSummary.safetyScore >= 60 ? 'warn' : 'critical',
    });
  }

  if (s.anomaliesLast30d.length > 0) {
    result.push({
      key: 'fuel_anomalies',
      label: 'Fuel Anomalies',
      value: s.anomaliesLast30d.length,
      unit: 'flags',
      context: `last 30d, ${s.anomaliesLast30d.filter((a) => a.severity === 'high').length} high`,
      score: s.anomaliesLast30d.some((a) => a.severity === 'high') ? 'critical' : 'warn',
    });
  }

  if (s.co2Kg30d > 0) {
    result.push({
      key: 'co2_kg_30d',
      label: 'CO2 Emissions',
      value: Math.round(s.co2Kg30d),
      unit: 'kg',
      context: 'last 30 days',
      score: 'good',
    });
  }

  return result;
}

function buildRecommendation(
  s: VehicleSignals,
  signals: CopilotSignal[],
): CopilotRecommendation {
  const warns = signals.filter((sig) => sig.score === 'warn');
  const criticals = signals.filter((sig) => sig.score === 'critical');

  const hasFuelAnomaly = s.anomaliesLast30d.some((a) => a.severity === 'high');
  const kmSinceService = s.lastServiceOdometer !== null
    ? s.odometerKm - s.lastServiceOdometer
    : 0;
  const oilThreshold = s.orgThresholds['maintenance.oil_change_km_threshold'] ?? 5000;
  const imminent = oilThreshold - kmSinceService <= 500;

  if (imminent && hasFuelAnomaly) {
    return {
      action: 'schedule_urgent_maintenance',
      timing: 'this_week',
      why: `Oil change due within ${Math.max(0, oilThreshold - kmSinceService)} km and high fuel anomalies detected — probable engine issue requiring immediate attention.`,
      confidence: 92,
    };
  }

  if (imminent) {
    return {
      action: 'schedule_preventive_maintenance',
      timing: 'this_weekend',
      why: `Maintenance predicted due in ${Math.max(0, Math.round(oilThreshold - kmSinceService))} km; schedule before unplanned downtime occurs.`,
      confidence: 86,
    };
  }

  if (hasFuelAnomaly) {
    return {
      action: 'investigate_fuel_consumption',
      timing: 'this_week',
      why: `High-severity fuel anomalies detected in last 30 days — investigate fuel quality or driver behaviour.`,
      confidence: 78,
    };
  }

  if (s.utilizationPct < 30) {
    return {
      action: 'review_utilization',
      timing: 'this_month',
      why: `Utilization at ${s.utilizationPct}% over last 30 days — vehicle may be under-deployed.`,
      confidence: 65,
    };
  }

  if (criticals.length > 0) {
    const first = criticals[0]!;
    return {
      action: `address_${first.key}`,
      timing: 'this_week',
      why: `${first.label} flagged as critical — ${first.context}.`,
      confidence: 80,
    };
  }

  if (warns.length > 0) {
    return {
      action: 'monitor_and_review',
      timing: 'this_fortnight',
      why: `${warns.length} signal(s) flagged as warning — review at next fleet check-in.`,
      confidence: 60,
    };
  }

  return {
    action: 'no_action_required',
    timing: 'none',
    why: 'All signals are within healthy ranges. Vehicle is performing well.',
    confidence: 95,
  };
}
