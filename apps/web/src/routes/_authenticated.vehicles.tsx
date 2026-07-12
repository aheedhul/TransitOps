import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, type SyntheticEvent, type ChangeEvent } from 'react';
import { useAuthStore } from '../features/auth/store.js';

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

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-status-available',
  'on-trip': 'bg-status-on-trip',
  'in-shop': 'bg-status-in-shop',
  retired: 'bg-status-retired',
};

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
    return matchesSearch && matchesStatus;
  });

  if (loading) return <p className="text-muted-foreground">{t('app.loading')}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('vehicles.title')}</h1>
          <p className="text-sm text-muted-foreground">{vehicles.length} vehicles in fleet</p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? 'Close Form' : '+ Add Vehicle'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { void handleSubmit(e); }} className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Register New Vehicle</h3>
          {formError && <div className="mb-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{formError}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Registration Number" name="registrationNumber" value={form.registrationNumber} onChange={handleChange} required />
            <Input label="Name" name="name" value={form.name} onChange={handleChange} />
            <Input label="Model" name="model" value={form.model} onChange={handleChange} />
            <Select label="Type" name="type" value={form.type} onChange={handleChange} options={VEHICLE_TYPES} />
            <Input label="Max Load (kg)" name="maxLoadCapacity" type="number" value={form.maxLoadCapacity} onChange={handleChange} required />
            <Select label="Fuel Type" name="fuelType" value={form.fuelType} onChange={handleChange} options={FUEL_TYPES} />
            <Input label="Acquisition Cost (INR)" name="acquisitionCost" type="number" value={form.acquisitionCost} onChange={handleChange} />
            <Input label="Acquisition Date" name="acquisitionDate" type="date" value={form.acquisitionDate} onChange={handleChange} required />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Search registration or name..."
          value={filter}
          onChange={(e) => { setFilter(e.target.value); }}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); }}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="on-trip">On Trip</option>
          <option value="in-shop">In Shop</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No vehicles found.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((v) => (
            <div key={v.id} className="rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{v.registrationNumber}</h3>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white ${STATUS_COLORS[v.status] ?? 'bg-gray-500'}`}>
                  {v.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{v.name || v.type}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="rounded bg-muted/50 px-2 py-1">Odometer: {parseFloat(v.odometer).toLocaleString()} km</div>
                <div className="rounded bg-muted/50 px-2 py-1">Fuel: {v.fuelType}</div>
                <div className="rounded bg-muted/50 px-2 py-1">Capacity: {v.maxLoadCapacity} kg</div>
                <div className="rounded bg-muted/50 px-2 py-1">Type: {v.type}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      <input
        {...props}
        className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

function Select({
  label,
  options,
  ...props
}: { label: string; options: string[] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground">{label}</label>
      <select
        {...props}
        className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.charAt(0).toUpperCase() + o.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
