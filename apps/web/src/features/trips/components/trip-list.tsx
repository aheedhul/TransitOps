import { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';
import { EmptyTripState } from '../../../components/ui/empty-state.js';

interface Trip {
  id: string;
  sourceLabel: string;
  destinationLabel: string;
  status: string;
  cargoWeightKg: number;
  plannedDepartureAt?: string;
}

export function TripList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: Trip[] }>('/trips?page=1')
      .then((res) => {
        setTrips(res.data ?? []);
        setLoading(false);
      })
      .catch((err) => {
        setError((err as Error).message);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;
    try {
      await api.delete(`/trips/${id}`);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // silent
    }
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    dispatched: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'in-transit': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">{t('trips.loading')}</div>;
  if (error) return <div className="py-8 text-center text-red-500">{t('trips.error')}</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('trips.title')}</h1>
        <button
          onClick={() => navigate({ to: '/trips/new' })}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t('trips.newTrip')}
        </button>
      </div>

      {trips.length === 0 ? (
        <EmptyTripState onAction={() => navigate({ to: '/trips/new' })} />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left">{t('trips.route')}</th>
                <th className="px-4 py-2 text-left">{t('trips.status')}</th>
                <th className="px-4 py-2 text-left">{t('trips.cargo')}</th>
                <th className="px-4 py-2 text-left">{t('trips.planned')}</th>
                <th className="px-4 py-2 text-left">{t('trips.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-2">
                    <Link to="/trips/$id" params={{ id: trip.id }} className="text-primary hover:underline">
                      {trip.sourceLabel} → {trip.destinationLabel}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[trip.status] ?? ''}`}>
                      {trip.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">{trip.cargoWeightKg} kg</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {trip.plannedDepartureAt ? new Date(trip.plannedDepartureAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(trip.id)}
                      className="text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      {t('trips.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
