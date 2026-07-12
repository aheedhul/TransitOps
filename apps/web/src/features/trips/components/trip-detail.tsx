import { useState, useEffect } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { DispatchRecommendationCard } from './dispatch-recommendation-card.js';
import { RuleVisualizationChain } from './rule-visualization-chain.js';

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

export function TripDetail() {
  const { t } = useTranslation();
  const { id } = useParams({ from: '/_authenticated/trips/$id' });
  const [trip, setTrip] = useState<TripDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);

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
    try {
      await api.post(`/trips/${id}/dispatch`, {});
      void fetchTrip();
    } catch {
      // silent
    } finally {
      setDispatching(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      await api.post(`/trips/${id}/start`, {});
      void fetchTrip();
    } catch {
      // silent
    } finally {
      setStarting(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.post(`/trips/${id}/complete`, {});
      void fetchTrip();
    } catch {
      // silent
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">{t('trips.loading')}</div>;
  if (!trip) return <div className="py-8 text-center text-red-500">{t('errors.notFound')}</div>;

  const canDispatch = trip.status === 'draft' && trip.vehicleId && trip.driverId;
  const canStart = trip.status === 'dispatched';
  const canComplete = trip.status === 'in-transit';

  return (
    <div>
      <Link to="/trips" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; {t('trips.backToList')}
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{trip.sourceLabel} &rarr; {trip.destinationLabel}</h1>
          <p className="text-sm text-muted-foreground">Status: {trip.status}</p>
        </div>
        <div className="flex gap-2">
          {canDispatch && (
            <button
              onClick={handleDispatch}
              disabled={dispatching}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {dispatching ? t('trips.dispatching') : t('trips.dispatch')}
            </button>
          )}
          {canStart && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {starting ? t('trips.starting') : t('trips.startTrip')}
            </button>
          )}
          {canComplete && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {completing ? t('trips.completing') : t('trips.completeTrip')}
            </button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-lg font-semibold">{t('trips.details')}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('trips.cargo')}</dt>
                <dd>{trip.cargoWeightKg} kg</dd>
              </div>
              {trip.cargoDescription && (
                <div>
                  <dt className="text-muted-foreground">{t('tripForm.description')}</dt>
                  <dd>{trip.cargoDescription}</dd>
                </div>
              )}
              {trip.plannedDepartureAt && (
                <div>
                  <dt className="text-muted-foreground">{t('tripForm.plannedDeparture')}</dt>
                  <dd>{new Date(trip.plannedDepartureAt).toLocaleString()}</dd>
                </div>
              )}
              {trip.plannedDistanceKm && (
                <div>
                  <dt className="text-muted-foreground">{t('trips.planned')}</dt>
                  <dd>{trip.plannedDistanceKm} km</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-lg font-semibold">{t('trips.timeline')}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('trips.created')}</dt>
                <dd>{new Date(trip.createdAt).toLocaleString()}</dd>
              </div>
              {trip.dispatchedAt && (
                <div>
                  <dt className="text-muted-foreground">{t('trips.dispatched')}</dt>
                  <dd>{new Date(trip.dispatchedAt).toLocaleString()}</dd>
                </div>
              )}
              {trip.startedAt && (
                <div>
                  <dt className="text-muted-foreground">{t('trips.started')}</dt>
                  <dd>{new Date(trip.startedAt).toLocaleString()}</dd>
                </div>
              )}
              {trip.completedAt && (
                <div>
                  <dt className="text-muted-foreground">{t('trips.completed')}</dt>
                  <dd>{new Date(trip.completedAt).toLocaleString()}</dd>
                </div>
              )}
              {trip.cancelledAt && (
                <div>
                  <dt className="text-muted-foreground">{t('trips.cancelled')}</dt>
                  <dd>{new Date(trip.cancelledAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-lg font-semibold">{t('trips.resources')}</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">{t('trips.vehicle')}</dt>
                <dd>{trip.vehicleId ?? t('common.notAssigned')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('trips.driver')}</dt>
                <dd>{trip.driverId ?? t('common.notAssigned')}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{t('trips.customer')}</dt>
                <dd>{trip.customerId ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <h2 className="text-lg font-semibold">{t('trips.dispatchRules')}</h2>
            {trip.vehicleId && trip.driverId ? (
              <div className="mt-3">
                <DispatchRecommendationCard tripId={trip.id} />
                <div className="mt-4">
                  <RuleVisualizationChain tripStatus={trip.status} vehicleId={trip.vehicleId} driverId={trip.driverId} />
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{t('trips.needResources')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
