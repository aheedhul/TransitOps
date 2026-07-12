import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../features/auth/store.js';

interface FuelLog {
  id: string;
  liters: string;
  cost: string;
  odometerKm: string;
  fuelType: string;
  filledAt: string;
  vehicleName?: string;
}

export const Route = createFileRoute('/_authenticated/fuel')({
  component: FuelPage,
});

function FuelPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch('/api/v1/fuel-logs', { headers: { Authorization: `Bearer ${session.accessToken}` } })
      .then((r) => r.json())
      .then((d) => setLogs(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const totalCost = logs.reduce((s, l) => s + parseFloat(l.cost), 0);
  const totalLiters = logs.reduce((s, l) => s + parseFloat(l.liters), 0);

  if (loading) return <p className="text-muted-foreground">{t('app.loading')}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.fuel')}</h1>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-2xl font-bold">{logs.length}</div>
          <div className="text-xs text-muted-foreground">Fuel Logs</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-2xl font-bold">{totalLiters.toLocaleString()} L</div>
          <div className="text-xs text-muted-foreground">Total Fuel</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-2xl font-bold">INR {totalCost.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total Cost</div>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50 text-left"><th className="px-3 py-2">Date</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Liters</th><th className="px-3 py-2">Cost</th><th className="px-3 py-2">Odometer</th></tr></thead>
          <tbody>
            {logs.slice(0, 30).map((l) => (
              <tr key={l.id} className="border-b hover:bg-muted/50">
                <td className="px-3 py-2">{new Date(l.filledAt).toLocaleDateString()}</td>
                <td className="px-3 py-2 capitalize">{l.fuelType}</td>
                <td className="px-3 py-2">{parseFloat(l.liters).toLocaleString()} L</td>
                <td className="px-3 py-2">INR {parseFloat(l.cost).toLocaleString()}</td>
                <td className="px-3 py-2">{parseFloat(l.odometerKm).toLocaleString()} km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
