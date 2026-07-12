import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Fuel, Plus, Droplet, IndianRupee, TrendingUp, Calendar, type LucideIcon } from 'lucide-react';
import { useAuthStore } from '../features/auth/store.js';
import { PageHeader, EmptyState } from '../components/ui/empty-state.js';
import { Button } from '../components/ui/button.js';
import { Card } from '../components/ui/card.js';
import { StatCard, StatSkeleton } from '../components/ui/stat-card.js';
import { Spinner } from '../components/ui/spinner.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table.js';

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
  const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.fuel')}
        description={`${logs.length} fuel logs. Track consumption, cost per liter, and odometer readings.`}
        actions={<Button leftIcon={<Plus className="h-3.5 w-3.5" />}>New Log</Button>}
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
            <StatCard
              label="Fuel Logs"
              value={logs.length}
              icon={<Fuel className="h-4 w-4" />}
              accent="primary"
            />
            <StatCard
              label="Total Fuel"
              value={`${totalLiters.toLocaleString('en-IN')} L`}
              icon={<Droplet className="h-4 w-4" />}
              accent="info"
            />
            <StatCard
              label="Total Cost"
              value={`₹${Math.round(totalCost).toLocaleString('en-IN')}`}
              icon={<IndianRupee className="h-4 w-4" />}
              accent="destructive"
            />
            <StatCard
              label="Avg Price/L"
              value={`₹${avgPrice.toFixed(2)}`}
              icon={<TrendingUp className="h-4 w-4" />}
              accent="warning"
            />
          </>
        )}
      </div>

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading fuel logs…</span>
          </div>
        </Card>
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<Fuel className="h-5 w-5" />}
          title="No fuel logs yet"
          description="Record your first fuel fill-up to start tracking consumption and costs."
          action={<Button leftIcon={<Plus className="h-3.5 w-3.5" />}>New Log</Button>}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Liters</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Odometer</TableHead>
              <TableHead className="text-right">Price/L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.slice(0, 50).map((l) => {
              const liters = parseFloat(l.liters);
              const cost = parseFloat(l.cost);
              const pricePerL = liters > 0 ? cost / liters : 0;
              return (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {new Date(l.filledAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <FuelTypeBadge type={l.fuelType} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {liters.toLocaleString('en-IN')} L
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    ₹{cost.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {parseFloat(l.odometerKm).toLocaleString('en-IN')} km
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    ₹{pricePerL.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function FuelTypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; text: string; Icon: LucideIcon }> = {
    diesel: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', Icon: Fuel },
    petrol: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', Icon: Fuel },
    cng: { bg: 'bg-blue-500/10', text: 'text-blue-700 dark:text-blue-300', Icon: Fuel },
    electric: { bg: 'bg-violet-500/10', text: 'text-violet-700 dark:text-violet-300', Icon: Fuel },
    hybrid: { bg: 'bg-slate-500/10', text: 'text-slate-700 dark:text-slate-300', Icon: Fuel },
  };
  const config = colors[type] ?? colors.diesel!;
  const Icon = config.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="h-3 w-3" />
      <span className="capitalize">{type}</span>
    </span>
  );
}
