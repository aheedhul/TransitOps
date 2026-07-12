import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Truck,
  Activity,
  Users,
  IndianRupee,
  Leaf,
  Gauge,
  TrendingUp,
  AlertCircle,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../features/auth/store.js';
import { PageHeader } from '../components/ui/empty-state.js';
import { Button } from '../components/ui/button.js';
import { Section } from '../components/ui/card.js';
import { Tabs } from '../components/ui/tabs.js';
import { StatCard, StatSkeleton } from '../components/ui/stat-card.js';
import { ErrorState } from '../components/ui/spinner.js';
import { cn } from '../lib/utils.js';

type Tab = 'fleet' | 'financial' | 'esg' | 'utilization';
const API_BASE = '/api/v1';

async function apiGet<T>(path: string): Promise<T> {
  const { session } = useAuthStore.getState();
  const headers: Record<string, string> = {};
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? 'Request failed');
  return json;
}

interface FleetKPIs {
  total_vehicles: number;
  available_vehicles: number;
  in_maintenance: number;
  on_trip: number;
  active_trips: number;
  pending_trips: number;
  drivers_on_duty: number;
  completed_trips_30d: number;
  fuel_cost_30d: number;
  maintenance_cost_30d: number;
  expenses_30d: number;
  total_op_cost_30d: number;
}

interface VehicleHealth {
  vehicle_id: string;
  registration: string;
  type: string;
  fuel_efficiency_pct: number;
  maintenance_pct: number;
  driver_safety_pct: number;
  utilization_pct: number;
  overall_score: number;
}

interface EmissionsData {
  period_days: number;
  total_co2_kg: number;
  total_distance_km: number;
  vehicles: Array<{
    vehicle_id: string;
    registration: string;
    co2_kg: number;
    distance_km: number;
    trip_count: number;
  }>;
}

interface UtilizationItem {
  vehicle_id: string;
  registration: string;
  type: string;
  utilization_pct: number;
  trip_count: number;
}

function KpiCard({
  label,
  value,
  unit,
  tooltip,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tooltip?: string;
  icon?: LucideIcon;
  accent?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
}) {
  return (
    <div className="group relative">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        <span className="font-medium">{label}</span>
        {tooltip && (
          <span className="relative inline-flex">
            <Info className="h-3 w-3 cursor-help text-muted-foreground/50" />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-floating transition-opacity group-hover:opacity-100">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function DownloadButton({ reportType }: { reportType: string }) {
  const { t } = useTranslation();
  const handleDownload = async () => {
    const { session } = useAuthStore.getState();
    const headers: Record<string, string> = {};
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    const res = await fetch(`${API_BASE}/reports/export/${reportType}`, { headers });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button
      variant="outline"
      size="sm"
      leftIcon={<Download className="h-3.5 w-3.5" />}
      onClick={handleDownload}
    >
      {t('common.downloadCsv')}
    </Button>
  );
}

function useReportData<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (data) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiGet<{ data: T }>(path);
      setData(result.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchData };
}

function FleetTab() {
  const { t } = useTranslation();
  const { data, loading, error, fetchData } = useReportData<FleetKPIs>('/reports/fleet-kpis');

  useEffect(() => {
    if (!data && !loading) void fetchData();
  }, [data, loading, fetchData]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState title="Failed to load" message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Section
        title={t('reports.fleetKpis')}
        description="30-day operational metrics"
        actions={<DownloadButton reportType="fleet-kpis" />}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label={t('reports.totalVehicles')} value={data.total_vehicles} tooltip={t('metrics.totalVehicles')} icon={Truck} accent="primary" />
          <KpiCard label={t('reports.available')} value={data.available_vehicles} tooltip={t('metrics.available')} icon={Truck} accent="success" />
          <KpiCard label={t('reports.inMaintenance')} value={data.in_maintenance} tooltip={t('metrics.inMaintenance')} icon={Truck} accent="warning" />
          <KpiCard label={t('reports.onTrip')} value={data.on_trip} tooltip={t('metrics.onTrip')} icon={Truck} accent="info" />
          <KpiCard label={t('reports.activeTrips')} value={data.active_trips} tooltip={t('metrics.activeTrips')} icon={Activity} accent="info" />
          <KpiCard label={t('reports.pendingTrips')} value={data.pending_trips} tooltip={t('metrics.pendingTrips')} icon={Activity} accent="warning" />
          <KpiCard label={t('reports.driversOnDuty')} value={data.drivers_on_duty} tooltip={t('metrics.driversOnDuty')} icon={Users} accent="primary" />
          <KpiCard label={t('reports.completed30d')} value={data.completed_trips_30d} unit={t('trips.title').toLowerCase()} tooltip={t('metrics.completed30d')} icon={Activity} accent="success" />
        </div>
      </Section>

      <Section
        title={t('reports.opCosts')}
        description="Total fleet spend across all categories"
        actions={<DownloadButton reportType="op-costs" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CostCard label={t('reports.fuelCost')} value={data.fuel_cost_30d} icon={IndianRupee} tooltip={t('metrics.fuelCost')} color="bg-orange-500" />
          <CostCard label={t('reports.maintenanceCost')} value={data.maintenance_cost_30d} icon={IndianRupee} tooltip={t('metrics.maintenanceCost')} color="bg-red-500" />
          <CostCard label={t('reports.expenses')} value={data.expenses_30d} icon={IndianRupee} tooltip={t('metrics.expenses')} color="bg-violet-500" />
          <CostCard label={t('reports.totalOpCost')} value={data.total_op_cost_30d} icon={TrendingUp} tooltip={t('metrics.totalOpCost')} color="bg-emerald-500" primary />
        </div>
      </Section>
    </div>
  );
}

function CostCard({
  label,
  value,
  icon: Icon,
  tooltip,
  color,
  primary,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tooltip?: string;
  color: string;
  primary?: boolean;
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border p-4 transition-all',
        primary
          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5'
          : 'bg-card',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-md text-white', color)}>
          <Icon className="h-4 w-4" />
        </div>
        {tooltip && (
          <span className="relative">
            <Info className="h-3 w-3 cursor-help text-muted-foreground/50" />
            <span className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 w-56 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground opacity-0 shadow-floating transition-opacity group-hover:opacity-100">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <p className="text-xl font-bold tracking-tight">
        ₹{Math.round(value).toLocaleString('en-IN')}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FinancialTab() {
  const { t } = useTranslation();
  const { data, loading, error, fetchData } = useReportData<VehicleHealth[]>('/reports/vehicle-health');

  useEffect(() => {
    if (!data && !loading) void fetchData();
  }, [data, loading, fetchData]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 rounded-md bg-muted/40 skeleton" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState title="Failed to load" message={error} />;
  if (!data || data.length === 0)
    return (
      <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        <AlertCircle className="mx-auto mb-2 h-5 w-5" />
        {t('healthData.noData')}
      </div>
    );

  return (
    <Section
      title={t('reports.vehicleHealth')}
      description="Composite health scores per vehicle"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left font-semibold">Vehicle</th>
              <th className="px-3 py-2 text-left font-semibold">Type</th>
              <th className="px-3 py-2 text-right font-semibold">Fuel Eff.</th>
              <th className="px-3 py-2 text-right font-semibold">Maint.</th>
              <th className="px-3 py-2 text-right font-semibold">Safety</th>
              <th className="px-3 py-2 text-right font-semibold">Utilization</th>
              <th className="px-3 py-2 text-right font-semibold">Overall</th>
            </tr>
          </thead>
          <tbody>
            {data.map((v) => (
              <tr key={v.vehicle_id} className="border-b transition-colors hover:bg-muted/40">
                <td className="px-3 py-2.5 font-medium">{v.registration}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{v.type}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <HealthBar value={v.fuel_efficiency_pct} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <HealthBar value={v.maintenance_pct} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <HealthBar value={v.driver_safety_pct} />
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <HealthBar value={v.utilization_pct} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold',
                      v.overall_score >= 80
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : v.overall_score >= 60
                          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          : 'bg-red-500/10 text-red-700 dark:text-red-300',
                    )}
                  >
                    {v.overall_score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function HealthBar({ value }: { value: number }) {
  const color =
    value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${value}%` }} />
      </div>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
}

function ESGTab() {
  const { t } = useTranslation();
  const { data, loading, error, fetchData } = useReportData<EmissionsData>('/reports/emissions');

  useEffect(() => {
    if (!data && !loading) void fetchData();
  }, [data, loading, fetchData]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState title="Failed to load" message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <Section
        title={t('reports.co2Emissions')}
        description="30-day CO2 footprint and intensity"
        actions={<DownloadButton reportType="emissions" />}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            label={t('reports.totalCo2')}
            value={Math.round(data.total_co2_kg).toLocaleString()}
            unit="kg"
            tooltip={t('metrics.totalCo2')}
            icon={Leaf}
            accent="success"
          />
          <KpiCard
            label={t('reports.totalDistance')}
            value={Math.round(data.total_distance_km).toLocaleString()}
            unit="km"
            tooltip={t('metrics.totalDistance')}
            icon={Gauge}
            accent="info"
          />
          <KpiCard
            label={t('reports.co2Intensity')}
            value={
              data.total_distance_km > 0
                ? Math.round((data.total_co2_kg / data.total_distance_km) * 1000)
                : t('common.na')
            }
            unit={data.total_distance_km > 0 ? 'g/km' : ''}
            tooltip={t('metrics.co2Intensity')}
            icon={Leaf}
            accent="warning"
          />
          <KpiCard
            label={t('reports.reportingMethod')}
            value="IPCC/GHG"
            tooltip={t('metrics.reportingMethod')}
            icon={Info}
            accent="primary"
          />
        </div>
      </Section>

      <Section
        title={t('reports.perVehicleEmissions')}
        description="CO2 output by individual vehicle"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Vehicle</th>
                <th className="px-3 py-2 text-right font-semibold">CO2 (kg)</th>
                <th className="px-3 py-2 text-right font-semibold">Distance (km)</th>
                <th className="px-3 py-2 text-right font-semibold">Trips</th>
                <th className="px-3 py-2 text-right font-semibold">g CO2 / km</th>
              </tr>
            </thead>
            <tbody>
              {data.vehicles.map((v) => (
                <tr key={v.vehicle_id} className="border-b transition-colors hover:bg-muted/40">
                  <td className="px-3 py-2.5 font-medium">{v.registration}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {Math.round(v.co2_kg).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {Math.round(v.distance_km).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{v.trip_count}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {v.distance_km > 0 ? Math.round((v.co2_kg / v.distance_km) * 1000) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          {t('emissionsData.footnote')}
        </p>
      </Section>
    </div>
  );
}

function UtilizationHeatmap({ data }: { data: UtilizationItem[] }) {
  if (data.length === 0) {
    return <div className="py-4 text-center text-sm text-muted-foreground">No data</div>;
  }
  const maxUtil = Math.max(...data.map((d) => d.utilization_pct), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => {
        const barWidth = Math.round((item.utilization_pct / maxUtil) * 100);
        const intensity =
          item.utilization_pct >= 70
            ? 'bg-emerald-500'
            : item.utilization_pct >= 40
              ? 'bg-amber-500'
              : 'bg-red-500';
        return (
          <div key={item.vehicle_id} className="flex items-center gap-3">
            <div className="w-32 shrink-0 truncate text-sm font-medium">{item.registration}</div>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', intensity)}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
            <div className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
              {item.utilization_pct}%
            </div>
            <div className="w-12 shrink-0 text-right text-xs text-muted-foreground">
              {item.trip_count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UtilizationTab() {
  const { t } = useTranslation();
  const { data, loading, error, fetchData } = useReportData<UtilizationItem[]>('/reports/utilization');

  useEffect(() => {
    if (!data && !loading) void fetchData();
  }, [data, loading, fetchData]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState title="Failed to load" message={error} />;
  if (!data) return null;

  const avgUtil = Math.round(data.reduce((s, d) => s + d.utilization_pct, 0) / data.length);

  return (
    <div className="space-y-6">
      <Section
        title={t('reports.vehicleUtilization')}
        description="How much each vehicle is being used"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label={t('reports.avgUtilization')}
            value={avgUtil}
            unit="%"
            icon={<Gauge className="h-4 w-4" />}
            accent="primary"
          />
          <StatCard
            label={t('reports.vehiclesTracked')}
            value={data.length}
            icon={<Truck className="h-4 w-4" />}
            accent="info"
          />
          <StatCard
            label={t('reports.busiestVehicle')}
            value={data.length > 0 ? data[0]!.registration : t('common.na')}
            icon={<TrendingUp className="h-4 w-4" />}
            accent="success"
          />
        </div>
      </Section>

      <Section
        title={t('reports.perVehicleBreakdown')}
        description="Utilization percentage by vehicle"
        actions={
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Legend color="bg-emerald-500" label="≥70%" />
            <Legend color="bg-amber-500" label="40-69%" />
            <Legend color="bg-red-500" label="<40%" />
          </div>
        }
      >
        <UtilizationHeatmap data={data} />
      </Section>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('h-2.5 w-2.5 rounded-sm', color)} />
      <span className="font-medium">{label}</span>
    </div>
  );
}

function ReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('fleet');

  const tabs: { key: Tab; label: string; icon: LucideIcon }[] = [
    { key: 'fleet', label: t('reports.fleetOverview'), icon: Truck },
    { key: 'financial', label: t('reports.financial'), icon: IndianRupee },
    { key: 'esg', label: t('reports.esg'), icon: Leaf },
    { key: 'utilization', label: t('reports.utilization'), icon: Gauge },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.title')}
        description={t('reports.subtitle')}
      />

      <Tabs
        items={tabs.map((t) => ({ key: t.key, label: t.label, icon: <t.icon className="h-3.5 w-3.5" /> }))}
        value={activeTab}
        onChange={(k) => setActiveTab(k as Tab)}
      />

      <div>
        {activeTab === 'fleet' && <FleetTab />}
        {activeTab === 'financial' && <FinancialTab />}
        {activeTab === 'esg' && <ESGTab />}
        {activeTab === 'utilization' && <UtilizationTab />}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/reports')({
  component: ReportsPage,
});
