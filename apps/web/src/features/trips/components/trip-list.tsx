import { Link } from '@tanstack/react-router';
import { useTrips, useDeleteTrip } from '../api/hooks.js';
import { TRIP_STATUSES, type TripResponse } from '../api/types.js';

export function TripList() {
  const { data, isLoading, error } = useTrips();
  const deleteMutation = useDeleteTrip();

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading trips...</div>;
  if (error) return <div className="p-8 text-red-500">Failed to load trips</div>;

  const trips = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Trips</h1>
        <Link
          to="/trips/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-lg border p-12 text-center text-muted-foreground">
          No trips yet. Create your first trip to get started.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Route</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Cargo</th>
                <th className="px-4 py-3 text-left font-medium">Planned</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {trips.map((trip: TripResponse) => (
                <TripRow key={trip.id} trip={trip} onDelete={() => deleteMutation.mutate(trip.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TripRow({ trip, onDelete }: { trip: TripResponse; onDelete: () => void }) {
  const status = TRIP_STATUSES[trip.status as keyof typeof TRIP_STATUSES] ?? {
    label: trip.status,
    color: 'bg-gray-100 text-gray-700',
  };

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <Link
          to="/trips/$id"
          params={{ id: trip.id }}
          className="font-medium hover:underline"
        >
          {trip.sourceLabel} → {trip.destinationLabel}
        </Link>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3">{trip.cargoWeightKg} kg</td>
      <td className="px-4 py-3 text-muted-foreground">
        {trip.plannedDepartureAt
          ? new Date(trip.plannedDepartureAt).toLocaleDateString()
          : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        {trip.status === 'draft' && (
          <button
            onClick={onDelete}
            className="text-xs text-red-600 hover:underline"
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  );
}
