import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../features/auth/store.js';

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

function KpiCard({ label, value, unit, tooltip }: { label: string; value: string | number; unit?: string; tooltip?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm group relative">
      <div className="flex items-center gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        {tooltip && (
          <span className="relative">
            <span className="cursor-help text-muted-foreground/50 text-xs" aria-label={tooltip}>&#9432;</span>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-56 rounded-md bg-foreground px-3 py-2 text-xs text-background opacity-0 transition-opacity group-hover:opacity-100 z-50">
              {tooltip}
            </span>
          </span>
        )}
      </div>
      <div className="mt-1 text-2xl font-bold">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
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
    <button
      onClick={handleDownload}
      className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent"
    >
      {t('common.downloadCsv')}
    </button>
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

  if (!data && !loading) fetchData();
  if (loading) return <div className="py-8 text-center text-muted-foreground">{t('common.loading')}</div>;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="py-8 text-center text-muted-foreground">{t('reports.noData')}</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('reports.fleetKpis')}</h2>
        <DownloadButton reportType="fleet-kpis" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label={t('reports.totalVehicles')} value={data.total_vehicles} tooltip={t('metrics.totalVehicles')} />
        <KpiCard label={t('reports.available')} value={data.available_vehicles} tooltip={t('metrics.available')} />
        <KpiCard label={t('reports.inMaintenance')} value={data.in_maintenance} tooltip={t('metrics.inMaintenance')} />
        <KpiCard label={t('reports.onTrip')} value={data.on_trip} tooltip={t('metrics.onTrip')} />
        <KpiCard label={t('reports.activeTrips')} value={data.active_trips} tooltip={t('metrics.activeTrips')} />
        <KpiCard label={t('reports.pendingTrips')} value={data.pending_trips} tooltip={t('metrics.pendingTrips')} />
        <KpiCard label={t('reports.driversOnDuty')} value={data.drivers_on_duty} tooltip={t('metrics.driversOnDuty')} />
        <KpiCard label={t('reports.completed30d')} value={data.completed_trips_30d} unit={t('trips.title').toLowerCase()} tooltip={t('metrics.completed30d')} />
      </div>

      <h3 className="mt-8 mb-4 text-lg font-semibold">{t('reports.opCosts')}</h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label={t('reports.fuelCost')} value={`\u20B9 ${data.fuel_cost_30d.toLocaleString()}`} tooltip={t('metrics.fuelCost')} />
        <KpiCard label={t('reports.maintenanceCost')} value={`\u20B9 ${data.maintenance_cost_30d.toLocaleString()}`} tooltip={t('metrics.maintenanceCost')} />
        <KpiCard label={t('reports.expenses')} value={`\u20B9 ${data.expenses_30d.toLocaleString()}`} tooltip={t('metrics.expenses')} />
        <KpiCard label={t('reports.totalOpCost')} value={`\u20B9 ${data.total_op_cost_30d.toLocaleString()}`} tooltip={t('metrics.totalOpCost')} />
      </div>
    </div>
  );
}

function FinancialTab() {
  const { t } = useTranslation();
  const { data, loading, error, fetchData } = useReportData<VehicleHealth[]>('/reports/vehicle-health');

  if (!data && !loading) fetchData();
  if (loading) return <div className="py-8 text-center text-muted-foreground">{t('healthData.loading')}</div>;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;
  if (!data || data.length === 0) return <div className="py-8 text-center text-muted-foreground">{t('healthData.noData')}</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('reports.vehicleHealth')}</h2>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">{t('reports.vehicle')}</th>
              <th className="px-4 py-2 text-left">{t('reports.type')}</th>
              <th className="px-4 py-2 text-right group relative">
                {t('reports.fuelEff')}
                <span className="ml-1 cursor-help text-muted-foreground/50 text-xs" title={t('metrics.fuelEff')}>&#9432;</span>
              </th>
              <th className="px-4 py-2 text-right group relative">
                {t('reports.maint')}
                <span className="ml-1 cursor-help text-muted-foreground/50 text-xs" title={t('metrics.maint')}>&#9432;</span>
              </th>
              <th className="px-4 py-2 text-right group relative">
                {t('reports.driverSafety')}
                <span className="ml-1 cursor-help text-muted-foreground/50 text-xs" title={t('metrics.driverSafety')}>&#9432;</span>
              </th>
              <th className="px-4 py-2 text-right group relative">
                {t('reports.utilization')}
                <span className="ml-1 cursor-help text-muted-foreground/50 text-xs" title={t('metrics.utilization')}>&#9432;</span>
              </th>
              <th className="px-4 py-2 text-right group relative">
                {t('reports.overall')}
                <span className="ml-1 cursor-help text-muted-foreground/50 text-xs" title={t('metrics.overall')}>&#9432;</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((v) => (
              <tr key={v.vehicle_id} className="border-t">
                <td className="px-4 py-2">{v.registration}</td>
                <td className="px-4 py-2 text-muted-foreground">{v.type}</td>
                <td className="px-4 py-2 text-right">{v.fuel_efficiency_pct}</td>
                <td className="px-4 py-2 text-right">{v.maintenance_pct}</td>
                <td className="px-4 py-2 text-right">{v.driver_safety_pct}</td>
                <td className="px-4 py-2 text-right">{v.utilization_pct}</td>
                <td className="px-4 py-2 text-right font-medium">{v.overall_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ESGTab() {
  const { t } = useTranslation();
  const { data, loading, error, fetchData } = useReportData<EmissionsData>('/reports/emissions');

  if (!data && !loading) fetchData();
  if (loading) return <div className="py-8 text-center text-muted-foreground">{t('emissionsData.loading')}</div>;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="py-8 text-center text-muted-foreground">{t('emissionsData.noData')}</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('reports.co2Emissions')}</h2>
        <DownloadButton reportType="emissions" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label={t('reports.totalCo2')} value={`${Math.round(data.total_co2_kg)}`} unit="kg" tooltip={t('metrics.totalCo2')} />
        <KpiCard label={t('reports.totalDistance')} value={`${Math.round(data.total_distance_km)}`} unit="km" tooltip={t('metrics.totalDistance')} />
        <KpiCard label={t('reports.co2Intensity')} value={
          data.total_distance_km > 0
            ? `${Math.round(data.total_co2_kg / data.total_distance_km * 1000)}`
            : t('common.na')
        } unit={data.total_distance_km > 0 ? 'g/km' : ''} tooltip={t('metrics.co2Intensity')} />
        <KpiCard label={t('reports.reportingMethod')} value="IPCC/GHG" tooltip={t('metrics.reportingMethod')} />
      </div>

      <h3 className="mt-8 mb-4 text-lg font-semibold">{t('reports.perVehicleEmissions')}</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">{t('reports.vehicle')}</th>
              <th className="px-4 py-2 text-right">{t('reports.co2Kg')}</th>
              <th className="px-4 py-2 text-right">{t('reports.distanceKm')}</th>
              <th className="px-4 py-2 text-right">{t('reports.trips')}</th>
              <th className="px-4 py-2 text-right">{t('reports.co2PerKm')}</th>
            </tr>
          </thead>
          <tbody>
            {data.vehicles.map((v) => (
              <tr key={v.vehicle_id} className="border-t">
                <td className="px-4 py-2">{v.registration}</td>
                <td className="px-4 py-2 text-right">{Math.round(v.co2_kg)}</td>
                <td className="px-4 py-2 text-right">{Math.round(v.distance_km)}</td>
                <td className="px-4 py-2 text-right">{v.trip_count}</td>
                <td className="px-4 py-2 text-right">
                  {v.distance_km > 0 ? Math.round(v.co2_kg / v.distance_km * 1000) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>{t('emissionsData.footnote')}</p>
      </div>
    </div>
  );
}

function UtilizationHeatmap({ data }: { data: UtilizationItem[] }) {
  const { t } = useTranslation();
  if (data.length === 0) {
    return <div className="py-4 text-center text-muted-foreground">{t('utilizationData.noDataAvailable')}</div>;
  }

  const maxUtil = Math.max(...data.map((d) => d.utilization_pct), 1);

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const barWidth = Math.round((item.utilization_pct / maxUtil) * 100);
        const intensity =
          item.utilization_pct >= 70
            ? 'bg-green-500'
            : item.utilization_pct >= 40
              ? 'bg-yellow-500'
              : 'bg-red-500';

        return (
          <div key={item.vehicle_id} className="flex items-center gap-3">
            <div className="w-32 shrink-0 text-sm font-medium">{item.registration}</div>
            <div className="flex-1 rounded-full bg-muted h-5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${intensity}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="w-16 shrink-0 text-right text-sm tabular-nums">
              {item.utilization_pct}%
            </div>
            <div className="w-12 shrink-0 text-right text-xs text-muted-foreground">
              {item.trip_count} {t('reports.trips').toLowerCase()}
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

  if (!data && !loading) fetchData();
  if (loading) return <div className="py-8 text-center text-muted-foreground">{t('utilizationData.loading')}</div>;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="py-8 text-center text-muted-foreground">{t('utilizationData.noData')}</div>;

  const avgUtil = Math.round(data.reduce((s, d) => s + d.utilization_pct, 0) / data.length);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('reports.vehicleUtilization')}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label={t('reports.avgUtilization')} value={avgUtil} unit="%" tooltip={t('metrics.avgUtilization')} />
        <KpiCard label={t('reports.vehiclesTracked')} value={data.length} tooltip={t('metrics.vehiclesTracked')} />
        <KpiCard label={t('reports.busiestVehicle')} value={
          data.length > 0 ? data[0]!.registration : t('common.na')
        } unit={`${data.length > 0 ? data[0]!.utilization_pct : 0}%`} tooltip={t('metrics.busiestVehicle')} />
      </div>

      <h3 className="mt-8 mb-4 text-lg font-semibold">{t('reports.perVehicleBreakdown')}</h3>
      <div className="rounded-lg border p-4">
        <UtilizationHeatmap data={data} />
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-green-500" />
          <span>{t('reports.utilizationGood')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-yellow-500" />
          <span>{t('reports.utilizationModerate')}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span>{t('reports.utilizationLow')}</span>
        </div>
      </div>
    </div>
  );
}

function ReportsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('fleet');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'fleet', label: t('reports.fleetOverview') },
    { key: 'financial', label: t('reports.financial') },
    { key: 'esg', label: t('reports.esg') },
    { key: 'utilization', label: t('reports.utilization') },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t('reports.subtitle')}</p>

      <div className="mt-6 border-b" role="tablist">
        <div className="flex gap-0 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6" role="tabpanel">
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
