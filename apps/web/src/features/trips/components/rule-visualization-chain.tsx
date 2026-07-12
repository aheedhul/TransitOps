import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../../../lib/utils.js';
import { api, ApiError } from '../api/client.js';
import { Spinner } from '../../../components/ui/spinner.js';
import type { RuleResult, DispatchCheckResponse, DispatchCheckInput } from '../api/types.js';

interface RuleVisualizationChainProps {
  tripStatus: string;
  vehicleId?: string;
  driverId?: string;
  cargoWeightKg?: number;
  sourceLabel?: string;
  destinationLabel?: string;
  plannedDepartureAt?: string;
}

const RULE_LABELS: Record<string, string> = {
  'vehicle.exists': 'Vehicle exists',
  'vehicle.not_in_dispatch_pool': 'Vehicle in dispatch pool',
  'vehicle.no_concurrent_trip': 'Vehicle available',
  'driver.exists': 'Driver exists',
  'driver.license_valid': 'License valid',
  'driver.license_warn': 'License not expiring soon',
  'driver.not_suspended': 'Driver not suspended',
  'driver.no_concurrent_trip': 'Driver available',
  'vehicle.cargo_capacity': 'Cargo under capacity',
  'driver.pre_trip_required': 'Pre-trip inspection',
  'route.distinct': 'Source ≠ Destination',
};

export function RuleVisualizationChain({
  tripStatus,
  vehicleId,
  driverId,
  cargoWeightKg,
  sourceLabel,
  destinationLabel,
  plannedDepartureAt,
}: RuleVisualizationChainProps) {
  const { t } = useTranslation();
  const [chain, setChain] = useState<RuleResult[] | null>(null);
  const [canDispatch, setCanDispatch] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = tripStatus === 'draft' && !!vehicleId && !!driverId && !!cargoWeightKg;

  const runCheck = async () => {
    if (!vehicleId || !driverId || !cargoWeightKg) return;
    setLoading(true);
    setError(null);
    try {
      const body: DispatchCheckInput = {
        vehicleId,
        driverId,
        cargoWeightKg,
        sourceLabel,
        destinationLabel,
        plannedDepartureAt,
      };
      const res = await api.post<{ data: DispatchCheckResponse }>(
        '/intelligence/dispatch-check',
        body,
      );
      setChain(res.data.chain);
      setCanDispatch(res.data.canDispatch);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to fetch dispatch rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready) void runCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, vehicleId, driverId, cargoWeightKg, sourceLabel, destinationLabel]);

  const blockingFailures = (chain ?? []).filter((r) => !r.ok && r.severity === 'block');
  const warnings = (chain ?? []).filter((r) => !r.ok && r.severity === 'warn');
  const allPassed = chain !== null && blockingFailures.length === 0 && warnings.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {loading ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Spinner size={10} />
            Running validation chain…
          </span>
        ) : error ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20">
            <XCircle className="h-3 w-3" />
            {error}
          </span>
        ) : chain === null ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {ready ? 'Awaiting validation' : 'Assign vehicle, driver, and cargo to validate'}
          </span>
        ) : allPassed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            {t('dispatch.readyToDispatch')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20">
            <XCircle className="h-3 w-3" />
            {t('dispatch.cannotDispatch')}
          </span>
        )}
        {ready && (
          <button
            type="button"
            onClick={() => void runCheck()}
            disabled={loading}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            Re-run
          </button>
        )}
        {blockingFailures.length > 0 && (
          <span className="text-xs text-red-600">
            {blockingFailures.length} blocking · {warnings.length} warning
          </span>
        )}
        {blockingFailures.length === 0 && warnings.length > 0 && (
          <span className="text-xs text-amber-600">
            {warnings.length} warning{warnings.length === 1 ? '' : 's'} · force-dispatch available
          </span>
        )}
      </div>

      {chain && chain.length > 0 && (
        <ol className="space-y-1.5">
          {chain.map((rule) => {
            const isWarn = rule.severity === 'warn';
            const failed = !rule.ok;
            const styles = failed
              ? isWarn
                ? 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300'
                : 'border-red-500/30 bg-red-500/5'
              : 'border-emerald-500/20 bg-emerald-500/5';
            const iconWrap = failed
              ? isWarn
                ? 'bg-amber-500 text-white'
                : 'bg-red-500 text-white'
              : 'bg-emerald-500 text-white';
            const Icon = failed ? (isWarn ? AlertTriangle : XCircle) : CheckCircle2;
            return (
              <li
                key={rule.rule}
                className={cn(
                  'flex items-start gap-2.5 rounded-md border px-3 py-2 text-xs transition-colors',
                  styles,
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                    iconWrap,
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'font-semibold',
                        failed
                          ? isWarn
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-red-700 dark:text-red-300'
                          : 'text-emerald-700 dark:text-emerald-300',
                      )}
                    >
                      {RULE_LABELS[rule.rule] ?? rule.rule}
                    </p>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        failed
                          ? isWarn
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            : 'bg-red-500/15 text-red-700 dark:text-red-300'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                      )}
                    >
                      {failed ? (isWarn ? 'warn' : 'fail') : 'pass'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">{rule.message}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {chain && chain.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {chain.length} server-side rules evaluated · canDispatch = {String(canDispatch)}
        </p>
      )}
    </div>
  );
}
