import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
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

function KpiCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

function DownloadButton({ reportType }: { reportType: string }) {
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
      Download CSV
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
  const { data, loading, error, fetchData } = useReportData<FleetKPIs>('/reports/fleet-kpis');

  if (!data && !loading) fetchData();
  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading fleet KPIs...</div>;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="py-8 text-center text-muted-foreground">No data available.</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fleet KPIs (30 days)</h2>
        <DownloadButton reportType="fleet-kpis" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Vehicles" value={data.total_vehicles} />
        <KpiCard label="Available" value={data.available_vehicles} />
        <KpiCard label="In Maintenance" value={data.in_maintenance} />
        <KpiCard label="On Trip" value={data.on_trip} />
        <KpiCard label="Active Trips" value={data.active_trips} />
        <KpiCard label="Pending Trips" value={data.pending_trips} />
        <KpiCard label="Drivers On Duty" value={data.drivers_on_duty} />
        <KpiCard label="Completed (30d)" value={data.completed_trips_30d} unit="trips" />
      </div>

      <h3 className="mt-8 mb-4 text-lg font-semibold">Operational Costs (30 days)</h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Fuel Cost" value={`₹ ${data.fuel_cost_30d.toLocaleString()}`} />
        <KpiCard label="Maintenance Cost" value={`₹ ${data.maintenance_cost_30d.toLocaleString()}`} />
        <KpiCard label="Expenses" value={`₹ ${data.expenses_30d.toLocaleString()}`} />
        <KpiCard label="Total Op Cost" value={`₹ ${data.total_op_cost_30d.toLocaleString()}`} />
      </div>
    </div>
  );
}

function FinancialTab() {
  const { data, loading, error, fetchData } = useReportData<VehicleHealth[]>('/reports/vehicle-health');

  if (!data && !loading) fetchData();
  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading vehicle health...</div>;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;
  if (!data || data.length === 0) return <div className="py-8 text-center text-muted-foreground">No vehicle health data. Health scores are computed after trip completion, maintenance closure, or fuel anomaly events.</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vehicle Health Scores</h2>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">Vehicle</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-right">Fuel Eff.</th>
              <th className="px-4 py-2 text-right">Maint.</th>
              <th className="px-4 py-2 text-right">Driver Safety</th>
              <th className="px-4 py-2 text-right">Utilization</th>
              <th className="px-4 py-2 text-right">Overall</th>
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
  const { data, loading, error, fetchData } = useReportData<EmissionsData>('/reports/emissions');

  if (!data && !loading) fetchData();
  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading emissions data...</div>;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="py-8 text-center text-muted-foreground">No emissions data. Emissions are recorded when trips with fuel consumption data complete.</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">CO2 Emissions (30 days)</h2>
        <DownloadButton reportType="emissions" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total CO2" value={`${Math.round(data.total_co2_kg)}`} unit="kg" />
        <KpiCard label="Total Distance" value={`${Math.round(data.total_distance_km)}`} unit="km" />
        <KpiCard label="CO2 Intensity" value={
          data.total_distance_km > 0
            ? `${Math.round(data.total_co2_kg / data.total_distance_km * 1000)}`
            : 'N/A'
        } unit={data.total_distance_km > 0 ? 'g/km' : ''} />
        <KpiCard label="Reporting Method" value="IPCC/GHG" />
      </div>

      <h3 className="mt-8 mb-4 text-lg font-semibold">Per-Vehicle Emissions</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">Vehicle</th>
              <th className="px-4 py-2 text-right">CO2 (kg)</th>
              <th className="px-4 py-2 text-right">Distance (km)</th>
              <th className="px-4 py-2 text-right">Trips</th>
              <th className="px-4 py-2 text-right">g CO2 / km</th>
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
        <p>Emission factors: Diesel 2.68 kg/L, Petrol 2.31 kg/L, CNG 1.93 kg/L (IPCC 2006). Values where fuel records are absent use estimated consumption.</p>
      </div>
    </div>
  );
}

function UtilizationHeatmap({ data }: { data: UtilizationItem[] }) {
  if (data.length === 0) {
    return <div className="py-4 text-center text-muted-foreground">No utilization data available.</div>;
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
              {item.trip_count} trips
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UtilizationTab() {
  const { data, loading, error, fetchData } = useReportData<UtilizationItem[]>('/reports/utilization');

  if (!data && !loading) fetchData();
  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading utilization data...</div>;
  if (error) return <div className="py-8 text-center text-red-500">{error}</div>;
  if (!data) return <div className="py-8 text-center text-muted-foreground">No utilization data. Complete some trips to see utilization metrics.</div>;

  const avgUtil = Math.round(data.reduce((s, d) => s + d.utilization_pct, 0) / data.length);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Vehicle Utilization (30 days)</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiCard label="Average Utilization" value={avgUtil} unit="%" />
        <KpiCard label="Vehicles Tracked" value={data.length} />
        <KpiCard label="Busiest Vehicle" value={
          data.length > 0 ? data[0]!.registration : 'N/A'
        } unit={`${data.length > 0 ? data[0]!.utilization_pct : 0}%`} />
      </div>

      <h3 className="mt-8 mb-4 text-lg font-semibold">Per-Vehicle Breakdown</h3>
      <div className="rounded-lg border p-4">
        <UtilizationHeatmap data={data} />
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-green-500" />
          <span>&ge;70% (Good)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-yellow-500" />
          <span>40-69% (Moderate)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-red-500" />
          <span>&lt;40% (Low)</span>
        </div>
      </div>
    </div>
  );
}

function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('fleet');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'fleet', label: 'Fleet Overview' },
    { key: 'financial', label: 'Financial' },
    { key: 'esg', label: 'ESG / CO2' },
    { key: 'utilization', label: 'Utilization' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Reports & Analytics</h1>
      <p className="mt-1 text-sm text-muted-foreground">Performance metrics, costs, emissions, and fleet health.</p>

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
