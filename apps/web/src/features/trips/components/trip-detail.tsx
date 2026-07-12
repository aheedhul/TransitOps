import { useParams, Link } from '@tanstack/react-router';
import {
  useTrip,
  useDispatchTrip,
  useStartTrip,
  useCompleteTrip,
  useCancelTrip,
} from '../api/hooks.js';
import { TRIP_STATUSES } from '../api/types.js';
import { DispatchRecommendationCard } from './dispatch-recommendation-card.js';
import { RuleVisualizationChain } from './rule-visualization-chain.js';

export function TripDetail() {
  const { id } = useParams({ from: '/_authenticated/trips/$id' });
  const { data, isLoading } = useTrip(id);
  const dispatch = useDispatchTrip();
  const start = useStartTrip();
  const complete = useCompleteTrip();
  const cancel = useCancelTrip();

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading trip...</div>;
  const trip = data?.data;
  if (!trip) return <div className="p-8 text-red-500">Trip not found</div>;

  const status = TRIP_STATUSES[trip.status as keyof typeof TRIP_STATUSES] ?? {
    label: trip.status,
    color: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/trips" className="text-sm text-muted-foreground hover:underline">
            ← Back to trips
          </Link>
          <h1 className="text-2xl font-bold">
            {trip.sourceLabel} → {trip.destinationLabel}
          </h1>
        </div>
        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Cargo</dt>
              <dd>{trip.cargoWeightKg} kg</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Description</dt>
              <dd>{trip.cargoDescription || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Planned Departure</dt>
              <dd>
                {trip.plannedDepartureAt
                  ? new Date(trip.plannedDepartureAt).toLocaleString()
                  : '—'}
              </dd>
            </div>
            {trip.plannedDistanceKm && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Planned Distance</dt>
                <dd>{trip.plannedDistanceKm} km</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(trip.createdAt).toLocaleString()}</dd>
            </div>
            {trip.dispatchedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Dispatched</dt>
                <dd>{new Date(trip.dispatchedAt).toLocaleString()}</dd>
              </div>
            )}
            {trip.startedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Started</dt>
                <dd>{new Date(trip.startedAt).toLocaleString()}</dd>
              </div>
            )}
            {trip.completedAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Completed</dt>
                <dd>{new Date(trip.completedAt).toLocaleString()}</dd>
              </div>
            )}
            {trip.cancelledAt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cancelled</dt>
                <dd>{new Date(trip.cancelledAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold">Resources</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Vehicle</dt>
              <dd>{trip.vehicleId || 'Not assigned'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Driver</dt>
              <dd>{trip.driverId || 'Not assigned'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Customer</dt>
              <dd>{trip.customerId || '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      {trip.status === 'draft' && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 text-sm font-semibold">Dispatch Rules</h2>
          {trip.vehicleId && trip.driverId ? (
            <RuleVisualizationChain
              vehicleId={trip.vehicleId}
              driverId={trip.driverId}
              cargoWeightKg={parseFloat(trip.cargoWeightKg)}
              plannedDepartureAt={trip.plannedDepartureAt ?? undefined}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Assign a vehicle and driver to see dispatch eligibility.
            </p>
          )}
        </div>
      )}

      {trip.status === 'draft' && trip.vehicleId && trip.driverId && (
        <div className="rounded-lg border p-4">
          <DispatchRecommendationCard trip={trip} />
        </div>
      )}

      <div className="flex gap-3">
        {trip.status === 'draft' && (
          <>
            <button
              onClick={() => dispatch.mutate({ id: trip.id })}
              disabled={dispatch.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {dispatch.isPending ? 'Dispatching...' : 'Dispatch'}
            </button>
            {cancel.mutate && (
              <button
                onClick={() =>
                  cancel.mutate({ id: trip.id, cancelReason: 'customer' })
                }
                disabled={cancel.isPending}
                className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </>
        )}

        {trip.status === 'dispatched' && (
          <>
            <button
              onClick={() => start.mutate({ id: trip.id })}
              disabled={start.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {start.isPending ? 'Starting...' : 'Start Trip'}
            </button>
            <button
              onClick={() =>
                cancel.mutate({ id: trip.id, cancelReason: 'customer' })
              }
              disabled={cancel.isPending}
              className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}

        {trip.status === 'in-transit' && (
          <button
            onClick={() =>
              complete.mutate({
                id: trip.id,
                actualDistanceKm: 0,
                fuelConsumedL: 0,
              })
            }
            disabled={complete.isPending}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {complete.isPending ? 'Completing...' : 'Complete Trip'}
          </button>
        )}
      </div>

      {dispatch.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {(dispatch.error as Error).message}
        </div>
      )}
    </div>
  );
}
