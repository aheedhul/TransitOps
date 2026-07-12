import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { DigitalTwinGrid } from '../features/fleet/index.js';
import { useAuthStore } from '../features/auth/store.js';

interface FleetKPIs {
  as_of: string;
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

interface VehicleSnippet {
  id: string;
  registrationNumber: string;
  name: string | null;
  status: string;
  type: string;
}

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [kpis, setKpis] = useState<FleetKPIs | null>(null);
  const [vehicles, setVehicles] = useState<VehicleSnippet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    const h = { Authorization: `Bearer ${session.accessToken}` };
    const load = async () => {
      try {
        const [kpiRes, vRes] = await Promise.all([
          fetch('/api/v1/reports/fleet-kpis', { headers: h }).then((r) => r.json() as Promise<{ data: FleetKPIs }>),
          fetch('/api/v1/vehicles', { headers: h }).then((r) => r.json() as Promise<{ data: VehicleSnippet[] }>),
        ]);
        setKpis(kpiRes.data);
        setVehicles(vRes.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [session]);

  const utilizationPct =
    kpis && kpis.total_vehicles > 0
      ? Math.round(((kpis.on_trip + kpis.in_maintenance) / kpis.total_vehicles) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.commandCenter')}</h1>
          <p className="text-sm text-muted-foreground">
            Live overview of fleet, trips, drivers, and operational costs.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/trips/new"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            + New Trip
          </Link>
          <Link
            to="/reports"
            className="inline-flex items-center rounded-md border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-accent"
          >
            Reports
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Total Vehicles" value={kpis?.total_vehicles ?? '-'} icon="truck" color="from-blue-500 to-cyan-400" />
        <KpiCard label="Available" value={kpis?.available_vehicles ?? '-'} icon="check" color="from-emerald-500 to-green-400" />
        <KpiCard label="In Maintenance" value={kpis?.in_maintenance ?? '-'} icon="wrench" color="from-amber-500 to-yellow-400" />
        <KpiCard label="On Trip" value={kpis?.on_trip ?? '-'} icon="route" color="from-indigo-500 to-violet-400" />
        <KpiCard label="Active Trips" value={kpis?.active_trips ?? '-'} icon="activity" color="from-rose-500 to-pink-400" />
        <KpiCard label="Pending Trips" value={kpis?.pending_trips ?? '-'} icon="clock" color="from-orange-500 to-amber-400" />
        <KpiCard label="Drivers On Duty" value={kpis?.drivers_on_duty ?? '-'} icon="user" color="from-cyan-500 to-sky-400" />
        <KpiCard label="Fleet Utilization" value={loading ? '-' : `${utilizationPct}%`} icon="gauge" color="from-purple-500 to-fuchsia-400" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Operational Cost (30d)</h3>
            <span className="text-xs text-muted-foreground">INR</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <CostPill label="Fuel" value={kpis?.fuel_cost_30d ?? 0} color="bg-orange-500" />
            <CostPill label="Maintenance" value={kpis?.maintenance_cost_30d ?? 0} color="bg-red-500" />
            <CostPill label="Total" value={kpis?.total_op_cost_30d ?? 0} color="bg-blue-500" />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction to="/vehicles" label="Add Vehicle" />
            <QuickAction to="/drivers" label="Add Driver" />
            <QuickAction to="/maintenance" label="Log Maintenance" />
            <QuickAction to="/fuel" label="Log Fuel" />
          </div>
        </div>
      </div>

      <DigitalTwinGrid />

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Fleet Status</h3>
          <span className="text-xs text-muted-foreground">{vehicles.length} assets tracked</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {vehicles.map((v) => (
            <div key={v.id} className="flex items-center gap-2 rounded-lg border bg-background p-2 text-xs transition hover:shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${statusColor(v.status)}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{v.registrationNumber}</div>
                <div className="truncate text-[10px] uppercase text-muted-foreground">{v.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case 'available':
      return 'bg-emerald-500';
    case 'on-trip':
      return 'bg-blue-500';
    case 'in-shop':
      return 'bg-amber-500';
    case 'retired':
      return 'bg-slate-400';
    default:
      return 'bg-gray-400';
  }
}

function CostPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border bg-background p-3 text-center">
      <div className={`mx-auto mb-2 h-1.5 w-10 rounded-full ${color}`} />
      <div className="text-lg font-bold">₹{Math.round(value).toLocaleString()}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickAction({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-lg border bg-background px-3 py-2 text-center text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
    >
      {label}
    </Link>
  );
}

function KpiCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div className={`absolute right-0 top-0 h-16 w-16 -translate-y-1/2 translate-x-1/2 rounded-full bg-gradient-to-br ${color} opacity-10 blur-2xl`} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          <div className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</div>
        </div>
        <div className={`rounded-lg bg-gradient-to-br ${color} p-1.5 text-white shadow-sm`}>
          <Icon name={icon} />
        </div>
      </div>
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const className = 'h-4 w-4';
  switch (name) {
    case 'truck':
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M10 17h4V5H2v12h3m4 0v-5h4v5m-4 0H2m15 0h3a2 2 0 002-2V9h-5v8zm0-8h5l-2-3h-3v3z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'check':
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'wrench':
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'route':
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 7m0 13V7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'activity':
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'user':
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'gauge':
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm0-13a1 1 0 00-1 1v5l3 3 1.5-1.5L13 11V8a1 1 0 00-1-1z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}
