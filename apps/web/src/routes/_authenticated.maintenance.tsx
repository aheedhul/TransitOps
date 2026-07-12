import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Wrench, Plus, IndianRupee, Building2, FileText } from 'lucide-react';
import { useAuthStore } from '../features/auth/store.js';
import { PageHeader, EmptyState } from '../components/ui/empty-state.js';
import { Button } from '../components/ui/button.js';
import { Card } from '../components/ui/card.js';
import { StatCard, StatSkeleton } from '../components/ui/stat-card.js';
import { StatusPill, type StatusKind } from '../components/ui/status-pill.js';
import { Spinner } from '../components/ui/spinner.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table.js';

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

  const activeCount = logs.filter((l) => l.status === 'active').length;
  const totalCost = logs.reduce((s, l) => s + parseFloat(l.cost), 0);
  const avgCost = logs.length > 0 ? totalCost / logs.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.maintenance')}
        description={`${logs.length} maintenance records. Track repairs, services, and vendor costs.`}
        actions={
          <Button leftIcon={<Plus className="h-3.5 w-3.5" />}>New Log</Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatCard label="Total Records" value={logs.length} icon={<FileText className="h-4 w-4" />} accent="primary" />
            <StatCard label="Active" value={activeCount} icon={<Wrench className="h-4 w-4" />} accent="warning" />
            <StatCard label="Total Cost" value={`₹${Math.round(totalCost).toLocaleString('en-IN')}`} icon={<IndianRupee className="h-4 w-4" />} accent="destructive" />
            <StatCard label="Avg Cost" value={`₹${Math.round(avgCost).toLocaleString('en-IN')}`} icon={<IndianRupee className="h-4 w-4" />} accent="info" />
          </>
        )}
      </div>

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading maintenance records…</span>
          </div>
        </Card>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-5 w-5" />}
          title="No maintenance records"
          description="Record your first maintenance event to start tracking vehicle health."
          action={<Button leftIcon={<Plus className="h-3.5 w-3.5" />}>New Log</Button>}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600">
                      <Wrench className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium capitalize">
                      {m.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="max-w-md truncate text-muted-foreground">
                  {m.description}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    {m.vendor || '—'}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  ₹{parseFloat(m.cost).toLocaleString('en-IN')}
                </TableCell>
                <TableCell>
                  <StatusPill status={m.status as StatusKind} size="sm" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
