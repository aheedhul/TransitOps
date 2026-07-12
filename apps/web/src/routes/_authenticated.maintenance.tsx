import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../features/auth/store.js';

interface MaintLog {
  id: string;
  type: string;
  description: string;
  cost: string;
  status: string;
  vendor: string;
}

export const Route = createFileRoute('/_authenticated/maintenance')({
  component: MaintenancePage,
});

function MaintenancePage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [logs, setLogs] = useState<MaintLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch('/api/v1/maintenance', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.json())
      .then((d) => setLogs(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return <p className="text-muted-foreground">{t('app.loading')}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.maintenance')}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{logs.length} maintenance records</p>
      {logs.length === 0 ? (
        <p className="mt-6 text-muted-foreground">No maintenance records.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {logs.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div>
                <span className="font-medium capitalize">{m.type.replace('_', ' ')}</span>
                <span className="ml-2 text-sm text-muted-foreground">{m.description}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">{m.vendor}</span>
                <span>INR {parseFloat(m.cost).toLocaleString()}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.status === 'active' ? 'bg-orange-500 text-white' : 'bg-green-500 text-white'}`}>
                  {m.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
