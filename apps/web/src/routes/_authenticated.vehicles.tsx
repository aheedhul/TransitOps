import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../features/auth/store.js';

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  status: string;
  odometer: string;
  fuelType: string;
  maxLoadCapacity: string;
}

export const Route = createFileRoute('/_authenticated/vehicles')({
  component: VehiclesPage,
});

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-status-available',
  'on-trip': 'bg-status-on-trip',
  'in-shop': 'bg-status-in-shop',
  retired: 'bg-status-retired',
};

function VehiclesPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch('/api/v1/vehicles', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => setVehicles(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return <p className="text-muted-foreground">{t('app.loading')}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('vehicles.title')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{vehicles.length} vehicles in fleet</p>
      {vehicles.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No vehicles found. Add your first vehicle.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <div key={v.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{v.registrationNumber}</h3>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white ${STATUS_COLORS[v.status] ?? 'bg-gray-500'}`}>
                  {v.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{v.name ?? v.type}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Odometer: {parseFloat(v.odometer).toLocaleString()} km</div>
                <div>Fuel: {v.fuelType}</div>
                <div>Capacity: {v.maxLoadCapacity} kg</div>
                <div>Type: {v.type}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
