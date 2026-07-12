import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { DigitalTwinGrid } from '../features/fleet/index.js';
import { useAuthStore } from '../features/auth/store.js';

interface Stats {
  totalVehicles: number;
  activeTrips: number;
  driversOnDuty: number;
  completedTrips: number;
  vehiclesList: Array<{ id: string; reg: string; name: string; status: string }>;
}

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!session) return;
    const h = { Authorization: `Bearer ${session.accessToken}` };
    Promise.all([
      fetch('/api/v1/vehicles', { headers: h }).then((r) => r.json()),
      fetch('/api/v1/trips', { headers: h }).then((r) => r.json()),
      fetch('/api/v1/drivers', { headers: h }).then((r) => r.json()),
    ])
      .then(([v, t, d]) => {
        const vehicles = v.data ?? [];
        const trips = t.data ?? [];
        const drivers = d.data ?? [];
        setStats({
          totalVehicles: vehicles.length,
          activeTrips: trips.filter((x: { status: string }) => x.status === 'in-transit' || x.status === 'dispatched').length,
          driversOnDuty: drivers.filter((x: { status: string }) => x.status === 'available' || x.status === 'on-trip').length,
          completedTrips: trips.filter((x: { status: string }) => x.status === 'completed').length,
          vehiclesList: vehicles.map((v: { id: string; registrationNumber: string; name: string; status: string }) => ({
            id: v.id, reg: v.registrationNumber, name: v.name ?? v.registrationNumber, status: v.status,
          })),
        });
      })
      .catch(() => {});
  }, [session]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('dashboard.commandCenter')}</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Vehicles" value={stats?.totalVehicles ?? '-'} color="bg-blue-500" />
        <KpiCard label="Active Trips" value={stats?.activeTrips ?? '-'} color="bg-green-500" />
        <KpiCard label="Drivers On Duty" value={stats?.driversOnDuty ?? '-'} color="bg-orange-500" />
        <KpiCard label="Completed (30d)" value={stats?.completedTrips ?? '-'} color="bg-purple-500" />
      </div>

      <DigitalTwinGrid />

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Fleet Status</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats?.vehiclesList.map((v) => (
            <div key={v.id} className="flex items-center gap-2 rounded border p-2 text-xs">
              <span className={`h-3 w-3 rounded-full ${v.status === 'available' ? 'bg-green-500' : v.status === 'on-trip' ? 'bg-blue-500' : v.status === 'in-shop' ? 'bg-orange-500' : 'bg-gray-400'}`} />
              <span className="font-medium">{v.reg}</span>
              <span className="ml-auto text-muted-foreground">{v.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className={`mb-2 h-1 w-8 rounded ${color}`} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
