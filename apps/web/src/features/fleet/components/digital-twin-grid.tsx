import { useEffect, useState, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid } from 'lucide-react';
import { fleetApi, type FleetPosition } from '../api/client.js';
import { Section } from '../../../components/ui/card.js';
import { Skeleton } from '../../../components/ui/skeleton.js';
import { StatusDot } from '../../../components/ui/status-pill.js';
import { cn } from '../../../lib/utils.js';

const STATUS_LABELS: Record<string, string> = {
  'available': 'Available',
  'on-trip': 'On Trip',
  'in-shop': 'In Shop',
  'retired': 'Retired',
};

export const DigitalTwinGrid: FC = () => {
  const { t } = useTranslation();
  const [positions, setPositions] = useState<FleetPosition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = () => {
      fleetApi.getPositions()
        .then((res) => {
          if (!mounted) return;
          setPositions(res.data);
          setLoading(false);
        })
        .catch(() => mounted && setLoading(false));
    };
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const counts = positions.reduce<Record<string, number>>((acc, p) => {
    acc[p.vehicleStatus] = (acc[p.vehicleStatus] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Section
      title="Digital Twin"
      description="Live status of every vehicle, at a glance"
      actions={
        <div className="flex items-center gap-3 text-xs">
          {(['available', 'on-trip', 'in-shop', 'retired'] as const).map((s) => (
            <div key={s} className="flex items-center gap-1.5 text-muted-foreground">
              <StatusDot status={s} />
              <span className="font-medium tabular-nums">{counts[s] ?? 0}</span>
              <span>{STATUS_LABELS[s]}</span>
            </div>
          ))}
        </div>
      }
    >
      {loading ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <LayoutGrid className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {t('digitalTwin.noData')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
          {positions.map((p) => (
            <a
              key={p.vehicleId}
              href="/vehicles"
              title={`${p.vehicleName} — ${STATUS_LABELS[p.vehicleStatus] ?? p.vehicleStatus}`}
              className={cn(
                'group relative flex flex-col items-start justify-between overflow-hidden rounded-md border bg-card p-2 text-left shadow-soft transition-all',
                'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevated',
              )}
            >
              <StatusDot
                status={p.vehicleStatus}
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5"
              />
              <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {STATUS_LABELS[p.vehicleStatus] ?? p.vehicleStatus}
              </span>
              <span className="mt-0.5 truncate text-xs font-bold text-foreground">
                {p.vehicleName}
              </span>
            </a>
          ))}
        </div>
      )}
    </Section>
  );
};
