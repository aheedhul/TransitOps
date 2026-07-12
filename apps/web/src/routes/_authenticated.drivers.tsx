import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, type SyntheticEvent, type ChangeEvent } from 'react';
import { useAuthStore } from '../features/auth/store.js';

interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  status: string;
  safetyScore: string;
}

export const Route = createFileRoute('/_authenticated/drivers')({
  component: DriversPage,
});

const STATUS_COLORS: Record<string, string> = {
  available: 'bg-status-available',
  'on-trip': 'bg-status-on-trip',
  'off-duty': 'bg-muted-foreground',
  suspended: 'bg-destructive',
};

function DriversPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [form, setForm] = useState({
    name: '',
    licenseNumber: '',
    licenseCategory: 'LMV',
    licenseExpiryDate: '',
    contactNumber: '',
  });

  const load = async () => {
    if (!session) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/drivers', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const data = (await res.json()) as { data: Driver[] };
      setDrivers(data.data);
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
      const res = await fetch('/api/v1/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) {
        setFormError(json.error?.message ?? 'Failed to create driver');
        return;
      }
      setForm({
        name: '',
        licenseNumber: '',
        licenseCategory: 'LMV',
        licenseExpiryDate: '',
        contactNumber: '',
      });
      setShowForm(false);
      void load();
    } catch {
      setFormError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = drivers.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(filter.toLowerCase()) ||
      d.licenseNumber.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isExpiringSoon = (date: string) => {
    const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 30 && days >= 0;
  };
  const isExpired = (date: string) => new Date(date) < new Date();

  if (loading) return <p className="text-muted-foreground">{t('app.loading')}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.drivers')}</h1>
          <p className="text-sm text-muted-foreground">{drivers.length} drivers</p>
        </div>
        <button
          onClick={() => { setShowForm((s) => !s); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {showForm ? 'Close Form' : '+ Add Driver'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { void handleSubmit(e); }} className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 font-semibold">Register New Driver</h3>
          {formError && <div className="mb-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive">{formError}</div>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Input label="Full Name" name="name" value={form.name} onChange={handleChange} required />
            <Input label="License Number" name="licenseNumber" value={form.licenseNumber} onChange={handleChange} required />
            <Input label="License Category" name="licenseCategory" value={form.licenseCategory} onChange={handleChange} required />
            <Input label="License Expiry" name="licenseExpiryDate" type="date" value={form.licenseExpiryDate} onChange={handleChange} required />
            <Input label="Contact Number" name="contactNumber" value={form.contactNumber} onChange={handleChange} required />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Driver'}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Search name or license..."
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
          <option value="off-duty">Off Duty</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No drivers found.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((d) => {
            const licenseWarning = isExpired(d.licenseExpiryDate)
              ? 'Expired'
              : isExpiringSoon(d.licenseExpiryDate)
                ? 'Expiring soon'
                : null;
            return (
              <div key={d.id} className="rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{d.name}</h3>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium text-white ${STATUS_COLORS[d.status] ?? 'bg-gray-500'}`}>
                    {d.status}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="rounded bg-muted/50 px-2 py-1">License: {d.licenseNumber}</div>
                  <div className={`rounded px-2 py-1 ${licenseWarning ? 'bg-destructive/10 text-destructive' : 'bg-muted/50'}`}>
                    Expires: {d.licenseExpiryDate}
                    {licenseWarning && <span className="ml-1 font-semibold">({licenseWarning})</span>}
                  </div>
                  <div className="rounded bg-muted/50 px-2 py-1">Safety: {d.safetyScore}%</div>
                  <div className="rounded bg-muted/50 px-2 py-1">Contact: {d.contactNumber}</div>
                </div>
              </div>
            );
          })}
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
