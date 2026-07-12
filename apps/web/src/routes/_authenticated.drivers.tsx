import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../features/auth/store.js';

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  status: string;
  safetyScore: string;
}

export const Route = createFileRoute('/_authenticated/drivers')({
  component: DriversPage,
});

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-status-available',
  'on-trip': 'bg-status-on-trip',
  'off-duty': 'bg-muted-foreground',
  suspended: 'bg-destructive',
};

function DriversPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch('/api/v1/drivers', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => setDrivers(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return <p className="text-muted-foreground">{t('app.loading')}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.drivers')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{drivers.length} drivers</p>
      {drivers.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No drivers found.</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {drivers.map((d) => (
            <div key={d.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{d.name}</h3>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white ${STATUS_COLORS[d.status] ?? 'bg-gray-500'}`}>
                  {d.status}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <div>License: {d.licenseNumber}</div>
                <div>Expires: {d.licenseExpiryDate}</div>
                <div>Safety: {d.safetyScore}%</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
