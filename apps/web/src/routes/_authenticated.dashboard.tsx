import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import {
  Truck,
  CheckCircle2,
  Wrench,
  Route as RouteIcon,
  Activity,
  Clock,
  UserCheck,
  Gauge,
  Plus,
  BarChart3,
  MapPin,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Fuel,
  type LucideIcon,
} from 'lucide-react';
import { DigitalTwinGrid } from '../features/fleet/index.js';
import { useAuthStore } from '../features/auth/store.js';
import { PageHeader } from '../components/ui/empty-state.js';
import { Button } from '../components/ui/button.js';
import { StatCard, StatSkeleton } from '../components/ui/stat-card.js';
import { Section } from '../components/ui/card.js';
import { StatusDot } from '../components/ui/status-pill.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { ProgressBar } from '../components/ui/utilities.js';
import { cn } from '../lib/utils.js';

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
  const availablePct =
    kpis && kpis.total_vehicles > 0
      ? Math.round((kpis.available_vehicles / kpis.total_vehicles) * 100)
      : 0;
  const firstName = session?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <Sparkles className="h-3 w-3" />
            Command Center
          </span>
        }
        title={`Welcome back, ${firstName}`}
        description="Live overview of your fleet, trips, drivers, and operational costs."
        actions={
          <>
            <Button variant="outline" leftIcon={<BarChart3 className="h-3.5 w-3.5" />}>
              <Link to="/reports">View reports</Link>
            </Button>
            <Button leftIcon={<Plus className="h-3.5 w-3.5" />}>
              <Link to="/trips/new">New Trip</Link>
            </Button>
          </>
        }
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Total Vehicles"
              value={kpis?.total_vehicles ?? 0}
              icon={<Truck className="h-4 w-4" />}
              accent="primary"
            />
            <StatCard
              label="Available"
              value={kpis?.available_vehicles ?? 0}
              unit={`/ ${kpis?.total_vehicles ?? 0}`}
              icon={<CheckCircle2 className="h-4 w-4" />}
              accent="success"
            />
            <StatCard
              label="In Maintenance"
              value={kpis?.in_maintenance ?? 0}
              icon={<Wrench className="h-4 w-4" />}
              accent="warning"
            />
            <StatCard
              label="On Trip"
              value={kpis?.on_trip ?? 0}
              icon={<RouteIcon className="h-4 w-4" />}
              accent="info"
            />
            <StatCard
              label="Active Trips"
              value={kpis?.active_trips ?? 0}
              icon={<Activity className="h-4 w-4" />}
              accent="info"
            />
            <StatCard
              label="Pending Trips"
              value={kpis?.pending_trips ?? 0}
              icon={<Clock className="h-4 w-4" />}
              accent="warning"
            />
            <StatCard
              label="Drivers On Duty"
              value={kpis?.drivers_on_duty ?? 0}
              icon={<UserCheck className="h-4 w-4" />}
              accent="primary"
            />
            <StatCard
              label="Fleet Utilization"
              value={utilizationPct}
              unit="%"
              icon={<Gauge className="h-4 w-4" />}
              accent="primary"
            />
          </>
        )}
      </div>

      {/* Operational cost & Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Operational Cost (30 days)"
          description="Total fleet spend across fuel, maintenance, and expenses"
          className="lg:col-span-2"
        >
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <CostCard
                label="Fuel"
                value={kpis?.fuel_cost_30d ?? 0}
                color="bg-orange-500"
                icon={Fuel}
                total={kpis?.total_op_cost_30d ?? 0}
              />
              <CostCard
                label="Maintenance"
                value={kpis?.maintenance_cost_30d ?? 0}
                color="bg-red-500"
                icon={Wrench}
                total={kpis?.total_op_cost_30d ?? 0}
              />
              <CostCard
                label="Total"
                value={kpis?.total_op_cost_30d ?? 0}
                color="bg-emerald-500"
                icon={TrendingUp}
                total={kpis?.total_op_cost_30d ?? 0}
                primary
              />
            </div>
          )}
        </Section>

        <Section title="Quick Actions" description="Common tasks">
          <div className="grid grid-cols-2 gap-2">
            <QuickAction to="/vehicles" label="Add Vehicle" icon={Truck} />
            <QuickAction to="/drivers" label="Add Driver" icon={UserCheck} />
            <QuickAction to="/maintenance" label="Log Service" icon={Wrench} />
            <QuickAction to="/fuel" label="Log Fuel" icon={Fuel} />
            <QuickAction to="/trips/new" label="New Trip" icon={Plus} />
            <QuickAction to="/map" label="Live Map" icon={MapPin} />
          </div>
        </Section>
      </div>

      {/* Fleet status overview & utilization */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Fleet Status"
          description={`${vehicles.length} assets tracked in real-time`}
          className="lg:col-span-2"
        >
          {loading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatusSummary
                  label="Available"
                  count={vehicles.filter((v) => v.status === 'available').length}
                  total={vehicles.length}
                  status="available"
                />
                <StatusSummary
                  label="On Trip"
                  count={vehicles.filter((v) => v.status === 'on-trip').length}
                  total={vehicles.length}
                  status="on-trip"
                />
                <StatusSummary
                  label="In Shop"
                  count={vehicles.filter((v) => v.status === 'in-shop').length}
                  total={vehicles.length}
                  status="in-shop"
                />
                <StatusSummary
                  label="Retired"
                  count={vehicles.filter((v) => v.status === 'retired').length}
                  total={vehicles.length}
                  status="retired"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {vehicles.slice(0, 15).map((v) => (
                  <Link
                    key={v.id}
                    to="/vehicles"
                    className="group flex items-center gap-2 rounded-md border bg-background p-2 transition-all hover:border-primary/30 hover:shadow-soft"
                  >
                    <StatusDot status={v.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {v.registrationNumber}
                      </p>
                      <p className="truncate text-[10px] uppercase text-muted-foreground">
                        {v.type}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </Section>

        <Section title="Availability" description={`${availablePct}% of fleet ready`}>
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight">{availablePct}%</span>
                <span className="text-xs text-muted-foreground">available</span>
              </div>
              <ProgressBar
                value={availablePct}
                variant="success"
                className="h-2"
              />
            </div>
            <div className="space-y-3 border-t pt-4">
              <UtilizationRow
                label="On Trip"
                value={kpis?.on_trip ?? 0}
                total={kpis?.total_vehicles ?? 0}
                color="bg-blue-500"
              />
              <UtilizationRow
                label="In Maintenance"
                value={kpis?.in_maintenance ?? 0}
                total={kpis?.total_vehicles ?? 0}
                color="bg-amber-500"
              />
              <UtilizationRow
                label="Retired"
                value={vehicles.filter((v) => v.status === 'retired').length}
                total={vehicles.length}
                color="bg-slate-400"
              />
            </div>
          </div>
        </Section>
      </div>

      {/* Digital Twin */}
      <DigitalTwinGrid />
    </div>
  );
}

function CostCard({
  label,
  value,
  color,
  icon: Icon,
  total,
  primary,
}: {
  label: string;
  value: number;
  color: string;
  icon: LucideIcon;
  total: number;
  primary?: boolean;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border p-4 transition-all',
        primary
          ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent'
          : 'bg-background',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div
          className={cn('flex h-8 w-8 items-center justify-center rounded-md text-white', color)}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!primary && pct > 0 && (
          <span className="text-[10px] font-semibold text-muted-foreground">{pct}%</span>
        )}
      </div>
      <p className="text-xl font-bold tracking-tight">
        ₹{Math.round(value).toLocaleString('en-IN')}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-2 rounded-lg border bg-background p-3 transition-all hover:border-primary/40 hover:shadow-soft"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function StatusSummary({
  label,
  count,
  total,
  status,
}: {
  label: string;
  count: number;
  total: number;
  status: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
      <StatusDot status={status} className="h-2.5 w-2.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-bold tracking-tight">
          {count}
          <span className="ml-1 text-xs font-normal text-muted-foreground">({pct}%)</span>
        </p>
      </div>
    </div>
  );
}

function UtilizationRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {value} <span className="text-muted-foreground/60">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
