import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, type SyntheticEvent, type ChangeEvent } from 'react';
import {
  Plus,
  Search,
  Filter,
  Truck,
  Fuel,
  Hash,
  Calendar,
  Weight,
  X,
} from 'lucide-react';
import { useAuthStore } from '../features/auth/store.js';
import { PageHeader, EmptyState } from '../components/ui/empty-state.js';
import { Button } from '../components/ui/button.js';
import { Card } from '../components/ui/card.js';
import { Field, Input, Select } from '../components/ui/input.js';
import { StatusPill, type StatusKind } from '../components/ui/status-pill.js';
import { DataToolbar } from '../components/ui/utilities.js';
import { Spinner } from '../components/ui/spinner.js';

interface Vehicle {
  id: string;
  registrationNumber: string;
  name: string;
  type: string;
  status: string;
  odometer: string;
  fuelType: string;
  maxLoadCapacity: string;
}

export const Route = createFileRoute('/_authenticated/vehicles')({
  component: VehiclesPage,
});

const VEHICLE_TYPES = ['truck', 'van', 'car', 'tractor', 'trailer', 'tanker', 'bus', 'ev', 'other'];
const FUEL_TYPES = ['diesel', 'petrol', 'cng', 'electric', 'hybrid'];

function VehiclesPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [form, setForm] = useState({
    registrationNumber: '',
    name: '',
    model: '',
    type: 'van',
    maxLoadCapacity: '',
    fuelType: 'diesel',
    acquisitionCost: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
  });

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/vehicles', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const data = (await res.json()) as { data: Vehicle[] };
      setVehicles(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [session]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/v1/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          ...form,
          maxLoadCapacity: parseFloat(form.maxLoadCapacity),
          acquisitionCost: parseFloat(form.acquisitionCost || '0'),
        }),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setFormError(json.error?.message ?? 'Failed to create vehicle');
        return;
      }
      setForm({
        registrationNumber: '',
        name: '',
        model: '',
        type: 'van',
        maxLoadCapacity: '',
        fuelType: 'diesel',
        acquisitionCost: '',
        acquisitionDate: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
      void load();
    } catch {
      setFormError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = vehicles.filter((v) => {
    const matchesSearch =
      v.registrationNumber.toLowerCase().includes(filter.toLowerCase()) ||
      v.name.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchesType = typeFilter === 'all' || v.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('vehicles.title')}
        description={`${vehicles.length} vehicles in your fleet. Add, track, and manage every asset.`}
        actions={
          <Button
            leftIcon={showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            onClick={() => { setShowForm((s) => !s); }}
          >
            {showForm ? 'Cancel' : 'Add Vehicle'}
          </Button>
        }
      />

      {showForm && (
        <Card className="animate-slide-in-from-top">
          <div className="border-b px-6 py-4">
            <h3 className="text-base font-semibold text-foreground">Register New Vehicle</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Add a new asset to your fleet inventory.
            </p>
          </div>
          <form onSubmit={(e) => { void handleSubmit(e); }} className="p-6">
            {formError && (
              <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Registration Number" htmlFor="registrationNumber" required>
                <Input
                  id="registrationNumber"
                  name="registrationNumber"
                  value={form.registrationNumber}
                  onChange={handleChange}
                  required
                  leftIcon={<Hash className="h-4 w-4" />}
                />
              </Field>
              <Field label="Name" htmlFor="name">
                <Input id="name" name="name" value={form.name} onChange={handleChange} />
              </Field>
              <Field label="Model" htmlFor="model">
                <Input id="model" name="model" value={form.model} onChange={handleChange} />
              </Field>
              <Field label="Type" htmlFor="type">
                <Select id="type" name="type" value={form.type} onChange={handleChange}>
                  {VEHICLE_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Max Load (kg)" htmlFor="maxLoadCapacity" required>
                <Input
                  id="maxLoadCapacity"
                  name="maxLoadCapacity"
                  type="number"
                  value={form.maxLoadCapacity}
                  onChange={handleChange}
                  required
                  leftIcon={<Weight className="h-4 w-4" />}
                />
              </Field>
              <Field label="Fuel Type" htmlFor="fuelType">
                <Select id="fuelType" name="fuelType" value={form.fuelType} onChange={handleChange}>
                  {FUEL_TYPES.map((o) => (
                    <option key={o} value={o}>
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Acquisition Cost (INR)" htmlFor="acquisitionCost">
                <Input
                  id="acquisitionCost"
                  name="acquisitionCost"
                  type="number"
                  value={form.acquisitionCost}
                  onChange={handleChange}
                  placeholder="0"
                />
              </Field>
              <Field label="Acquisition Date" htmlFor="acquisitionDate" required>
                <Input
                  id="acquisitionDate"
                  name="acquisitionDate"
                  type="date"
                  value={form.acquisitionDate}
                  onChange={handleChange}
                  required
                  leftIcon={<Calendar className="h-4 w-4" />}
                />
              </Field>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? 'Saving...' : 'Save Vehicle'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <DataToolbar
        search={
          <Input
            type="search"
            placeholder="Search by registration or name..."
            value={filter}
            onChange={(e) => { setFilter(e.target.value); }}
            leftIcon={<Search className="h-4 w-4" />}
          />
        }
        filters={
          <>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); }}
              className="w-36"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="on-trip">On Trip</option>
              <option value="in-shop">In Shop</option>
              <option value="retired">Retired</option>
            </Select>
            <Select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); }}
              className="w-36"
            >
              <option value="all">All Types</option>
              {VEHICLE_TYPES.map((o) => (
                <option key={o} value={o}>
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </option>
              ))}
            </Select>
          </>
        }
        actions={
          <span className="text-xs text-muted-foreground">
            <Filter className="mr-1 inline h-3 w-3" />
            {filtered.length} of {vehicles.length}
          </span>
        }
      />

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading vehicles…</span>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-5 w-5" />}
          title="No vehicles found"
          description={
            filter || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Add your first vehicle to start tracking your fleet.'
          }
          action={
            <Button onClick={() => setShowForm(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add Vehicle
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((v) => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function VehicleCard({ vehicle: v }: { vehicle: Vehicle }) {
  return (
    <Card className="group p-4 transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {v.registrationNumber}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-foreground">
            {v.name || v.type}
          </h3>
        </div>
        <StatusPill status={v.status as StatusKind} size="sm" />
      </div>
      <div className="grid grid-cols-2 gap-2 border-t pt-3">
        <VehicleStat label="Odometer" value={`${parseFloat(v.odometer).toLocaleString()} km`} />
        <VehicleStat label="Fuel" value={v.fuelType} icon={Fuel} />
        <VehicleStat label="Capacity" value={`${v.maxLoadCapacity} kg`} icon={Weight} />
        <VehicleStat label="Type" value={v.type} icon={Truck} />
      </div>
    </Card>
  );
}

function VehicleStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: typeof Truck;
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-xs font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}
