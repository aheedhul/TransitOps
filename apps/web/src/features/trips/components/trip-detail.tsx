import { useState, useEffect } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Calendar,
  Truck,
  User,
  Building2,
  MapPin,
  Send,
  Play,
  CheckCircle2,
  Circle,
  Hash,
  type LucideIcon,
} from 'lucide-react';
import { api, ApiError } from '../api/client.js';
import { DispatchRecommendationCard } from './dispatch-recommendation-card.js';
import { RuleVisualizationChain } from './rule-visualization-chain.js';
import { PageHeader } from '../../../components/ui/empty-state.js';
import { Button } from '../../../components/ui/button.js';
import { Section } from '../../../components/ui/card.js';
import { StatusPill, type StatusKind } from '../../../components/ui/status-pill.js';
import { Spinner } from '../../../components/ui/spinner.js';
import { cn } from '../../../lib/utils.js';

interface TripDetailData {
  id: string;
  sourceLabel: string;
  destinationLabel: string;
  cargoWeightKg: number;
  cargoDescription?: string;
  plannedDistanceKm?: number;
  status: string;
  vehicleId?: string;
  driverId?: string;
  customerId?: string;
  plannedDepartureAt?: string;
  plannedArrivalAt?: string;
  dispatchedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt: string;
}

const TIMELINE_STEPS: { key: keyof TripDetailData; label: string; Icon: LucideIcon }[] = [
  { key: 'createdAt', label: 'Created', Icon: Circle },
  { key: 'dispatchedAt', label: 'Dispatched', Icon: Send },
  { key: 'startedAt', label: 'Started', Icon: Play },
  { key: 'completedAt', label: 'Completed', Icon: CheckCircle2 },
];

export function TripDetail() {
  const { t } = useTranslation();
  const { id } = useParams({ from: '/_authenticated/trips/$id' });
  const [trip, setTrip] = useState<TripDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchTrip = async () => {
    try {
      const res = await api.get<{ data: TripDetailData }>(`/trips/${id}`);
      setTrip(res.data);
    } catch {
      setTrip(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTrip();
  }, [id]);

  const handleDispatch = async () => {
    setDispatching(true);
    setActionError(null);
    try {
      await api.post(`/trips/${id}/dispatch`, {
        force: true,
        overrideReason: 'license_warn',
      });
      void fetchTrip();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Dispatch failed');
    } finally {
      setDispatching(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    setActionError(null);
    try {
      await api.post(`/trips/${id}/start`, {});
      void fetchTrip();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Start failed');
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setActionError(null);
    try {
      await api.post(`/trips/${id}/complete`, {
        actualDistanceKm: trip?.plannedDistanceKm ?? 0,
        fuelConsumedL: 0,
      });
      void fetchTrip();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Complete failed');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!trip) return <div className="py-8 text-center text-red-500">Trip not found</div>;

  const canDispatch = trip.status === 'draft' && trip.vehicleId && trip.driverId;
  const canStart = trip.status === 'dispatched';
  const canComplete = trip.status === 'in-transit';

  return (
    <div className="space-y-6">
      <Link
        to="/trips"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('trips.backToList')}
      </Link>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Hash className="h-3 w-3" />
            {trip.id.slice(0, 8)}
          </span>
        }
        title={
          <span className="flex items-center gap-2">
            {trip.sourceLabel}
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            {trip.destinationLabel}
          </span>
        }
        description={`Cargo: ${trip.cargoWeightKg.toLocaleString()} kg${
          trip.plannedDistanceKm ? ` · Distance: ${trip.plannedDistanceKm} km` : ''
        }`}
        actions={
          <div className="flex items-center gap-2">
            {actionError && (
              <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                {actionError}
              </span>
            )}
            <StatusPill status={trip.status as StatusKind} size="md" />
            {canDispatch && (
              <Button
                onClick={handleDispatch}
                loading={dispatching}
                leftIcon={<Send className="h-3.5 w-3.5" />}
              >
                {t('trips.dispatch')}
              </Button>
            )}
            {canStart && (
              <Button
                onClick={handleStart}
                loading={starting}
                variant="success"
                leftIcon={<Play className="h-3.5 w-3.5" />}
              >
                {t('trips.startTrip')}
              </Button>
            )}
            {canComplete && (
              <Button
                onClick={handleComplete}
                loading={completing}
                variant="success"
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                {t('trips.completeTrip')}
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Timeline" description="Trip progression">
            <ol className="relative space-y-4 pl-6">
              {TIMELINE_STEPS.map((step, idx) => {
                const ts = trip[step.key] as string | undefined;
                const hasValue = !!ts;
                const isLast = idx === TIMELINE_STEPS.length - 1;
                return (
                  <li key={step.key} className="relative">
                    {!isLast && (
                      <span
                        className={cn(
                          'absolute left-[-19px] top-7 h-full w-px',
                          hasValue ? 'bg-primary' : 'bg-border',
                        )}
                      />
                    )}
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-background',
                          hasValue
                            ? 'bg-primary text-primary-foreground'
                            : 'border-2 border-border bg-background text-muted-foreground',
                        )}
                      >
                        <step.Icon className="h-2.5 w-2.5" />
                      </span>
                      <div className="flex-1">
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            hasValue ? 'text-foreground' : 'text-muted-foreground',
                          )}
                        >
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {hasValue
                            ? new Date(ts!).toLocaleString()
                            : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
              {trip.cancelledAt && (
                <li className="relative">
                  <span className="absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground ring-4 ring-background">
                    <Circle className="h-2.5 w-2.5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-destructive">Cancelled</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(trip.cancelledAt).toLocaleString()}
                      {trip.cancelReason && ` · ${trip.cancelReason}`}
                    </p>
                  </div>
                </li>
              )}
            </ol>
          </Section>

          <Section title="Details" description="Cargo and journey info">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailItem
                label="Cargo"
                value={`${trip.cargoWeightKg.toLocaleString()} kg`}
                icon={Package}
              />
              {trip.cargoDescription && (
                <DetailItem
                  label="Description"
                  value={trip.cargoDescription}
                  icon={Package}
                />
              )}
              {trip.plannedDistanceKm && (
                <DetailItem
                  label="Planned Distance"
                  value={`${trip.plannedDistanceKm} km`}
                  icon={MapPin}
                />
              )}
              {trip.plannedDepartureAt && (
                <DetailItem
                  label="Planned Departure"
                  value={new Date(trip.plannedDepartureAt).toLocaleString()}
                  icon={Calendar}
                />
              )}
            </dl>
          </Section>

          <Section title="Resources" description="Assigned vehicle, driver, and customer">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DetailItem
                label="Vehicle"
                value={trip.vehicleId ?? 'Not assigned'}
                icon={Truck}
                monoValue
              />
              <DetailItem
                label="Driver"
                value={trip.driverId ?? 'Not assigned'}
                icon={User}
                monoValue
              />
              <DetailItem
                label="Customer"
                value={trip.customerId ?? '—'}
                icon={Building2}
                monoValue
              />
            </dl>
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Dispatch Rules" description="Eligibility check">
            {trip.vehicleId && trip.driverId ? (
              <>
                <DispatchRecommendationCard tripId={trip.id} />
                <div className="mt-4">
                  <RuleVisualizationChain
                    tripStatus={trip.status}
                    vehicleId={trip.vehicleId}
                    driverId={trip.driverId}
                    cargoWeightKg={trip.cargoWeightKg}
                    sourceLabel={trip.sourceLabel}
                    destinationLabel={trip.destinationLabel}
                    plannedDepartureAt={trip.plannedDepartureAt}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-md border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                <Truck className="mx-auto mb-1.5 h-5 w-5" />
                {t('trips.needResources')}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
  icon: Icon,
  monoValue,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  monoValue?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border bg-background p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            'truncate text-sm font-semibold text-foreground',
            monoValue && 'font-mono text-xs',
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
