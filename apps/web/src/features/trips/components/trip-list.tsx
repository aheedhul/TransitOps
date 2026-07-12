import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Route as RouteIcon,
  ArrowRight,
  Trash2,
  Search,
  Calendar,
  Weight,
} from 'lucide-react';
import { api } from '../api/client.js';
import { PageHeader, EmptyState } from '../../../components/ui/empty-state.js';
import { Button } from '../../../components/ui/button.js';
import { Input, Select } from '../../../components/ui/input.js';
import { StatusPill, type StatusKind } from '../../../components/ui/status-pill.js';
import { Card } from '../../../components/ui/card.js';
import { DataToolbar } from '../../../components/ui/utilities.js';
import { Spinner } from '../../../components/ui/spinner.js';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '../../../components/ui/table.js';

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
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    api.get<{ data: Trip[] }>('/trips?page=1')
      .then((res) => {
        setTrips(res.data ?? []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
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

  const filtered = trips.filter((trip) => {
    const matchesSearch =
      trip.sourceLabel.toLowerCase().includes(filter.toLowerCase()) ||
      trip.destinationLabel.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('trips.title')}
        description={`${trips.length} trips tracked. Plan, dispatch, and complete trips with full visibility.`}
        actions={
          <Link to="/trips/new">
            <Button leftIcon={<Plus className="h-3.5 w-3.5" />}>
              {t('trips.newTrip')}
            </Button>
          </Link>
        }
      />

      <DataToolbar
        search={
          <Input
            type="search"
            placeholder="Search by source or destination..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        }
        filters={
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-40"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="dispatched">Dispatched</option>
            <option value="in-transit">In Transit</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        }
        actions={
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {trips.length} trips
          </span>
        }
      />

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading trips…</span>
          </div>
        </Card>
      ) : trips.length === 0 ? (
        <EmptyState
          icon={<RouteIcon className="h-5 w-5" />}
          title="No trips yet"
          description="Create your first trip to get started with fleet operations."
          action={
            <Link to="/trips/new">
              <Button leftIcon={<Plus className="h-3.5 w-3.5" />}>
                {t('trips.newTrip')}
              </Button>
            </Link>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Planned</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableEmpty>
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No trips match your filters.
                </div>
              </TableEmpty>
            ) : (
              filtered.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell>
                    <Link
                      to="/trips/$id"
                      params={{ id: trip.id }}
                      className="group flex items-center gap-2 font-medium text-foreground hover:text-primary"
                    >
                      <span className="truncate">{trip.sourceLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      <span className="truncate">{trip.destinationLabel}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={trip.status as StatusKind} size="sm" />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Weight className="h-3 w-3 text-muted-foreground" />
                      {trip.cargoWeightKg.toLocaleString()} kg
                    </span>
                  </TableCell>
                  <TableCell>
                    {trip.plannedDepartureAt ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(trip.plannedDepartureAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(trip.id)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
