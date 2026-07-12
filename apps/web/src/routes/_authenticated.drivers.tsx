import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, type SyntheticEvent, type ChangeEvent } from 'react';
import {
  Plus,
  Search,
  Users,
  X,
  Phone,
  IdCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Award,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '../features/auth/store.js';
import { PageHeader, EmptyState } from '../components/ui/empty-state.js';
import { Button } from '../components/ui/button.js';
import { Card } from '../components/ui/card.js';
import { Field, Input, Select } from '../components/ui/input.js';
import { StatusPill, type StatusKind } from '../components/ui/status-pill.js';
import { Avatar } from '../components/ui/avatar.js';
import { DataToolbar } from '../components/ui/utilities.js';
import { Spinner } from '../components/ui/spinner.js';
import { cn } from '../lib/utils.js';

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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.drivers')}
        description={`${drivers.length} drivers in your workforce. Track licenses, safety scores, and availability.`}
        actions={
          <Button
            leftIcon={showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            onClick={() => { setShowForm((s) => !s); }}
          >
            {showForm ? 'Cancel' : 'Add Driver'}
          </Button>
        }
      />

      {showForm && (
        <Card className="animate-slide-in-from-top">
          <div className="border-b px-6 py-4">
            <h3 className="text-base font-semibold text-foreground">Register New Driver</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Add a new driver to your team. License validity is required.
            </p>
          </div>
          <form onSubmit={(e) => { void handleSubmit(e); }} className="p-6">
            {formError && (
              <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {formError}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Full Name" htmlFor="d-name" required>
                <Input id="d-name" name="name" value={form.name} onChange={handleChange} required />
              </Field>
              <Field label="License Number" htmlFor="d-license" required>
                <Input
                  id="d-license"
                  name="licenseNumber"
                  value={form.licenseNumber}
                  onChange={handleChange}
                  required
                  leftIcon={<IdCard className="h-4 w-4" />}
                />
              </Field>
              <Field label="Category" htmlFor="d-cat" required>
                <Input
                  id="d-cat"
                  name="licenseCategory"
                  value={form.licenseCategory}
                  onChange={handleChange}
                  required
                />
              </Field>
              <Field label="Expiry Date" htmlFor="d-expiry" required>
                <Input
                  id="d-expiry"
                  name="licenseExpiryDate"
                  type="date"
                  value={form.licenseExpiryDate}
                  onChange={handleChange}
                  required
                  leftIcon={<Calendar className="h-4 w-4" />}
                />
              </Field>
              <Field label="Contact" htmlFor="d-contact" required>
                <Input
                  id="d-contact"
                  name="contactNumber"
                  value={form.contactNumber}
                  onChange={handleChange}
                  required
                  leftIcon={<Phone className="h-4 w-4" />}
                />
              </Field>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? 'Saving...' : 'Save Driver'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <DataToolbar
        search={
          <Input
            type="search"
            placeholder="Search by name or license..."
            value={filter}
            onChange={(e) => { setFilter(e.target.value); }}
            leftIcon={<Search className="h-4 w-4" />}
          />
        }
        filters={
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); }}
            className="w-40"
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="on-trip">On Trip</option>
            <option value="off-duty">Off Duty</option>
            <option value="suspended">Suspended</option>
          </Select>
        }
        actions={
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {drivers.length} drivers
          </span>
        }
      />

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading drivers…</span>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title="No drivers found"
          description={
            filter || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Add your first driver to start managing your workforce.'
          }
          action={
            <Button onClick={() => setShowForm(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add Driver
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <DriverCard key={d.id} driver={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function DriverCard({ driver: d }: { driver: Driver }) {
  const licenseState = getLicenseState(d.licenseExpiryDate);
  const safetyScore = parseFloat(d.safetyScore) || 0;
  const safetyColor =
    safetyScore >= 80 ? 'text-emerald-600' : safetyScore >= 60 ? 'text-amber-600' : 'text-red-600';
  return (
    <Card className="group p-4 transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-start gap-3">
        <Avatar name={d.name} size="lg" status={d.status as 'available' | 'on-trip' | 'in-shop' | 'retired' | 'suspended' | 'off-duty'} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-foreground">{d.name}</h3>
              <p className="truncate text-xs text-muted-foreground">
                <IdCard className="mr-1 inline h-3 w-3" />
                {d.licenseNumber} · {d.licenseCategory}
              </p>
            </div>
            <StatusPill status={d.status as StatusKind} size="sm" />
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            {d.contactNumber}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
        <LicenseInfo
          Icon={licenseState.expired ? AlertTriangle : licenseState.expiringSoon ? AlertTriangle : CheckCircle2}
          label={licenseState.label}
          value={d.licenseExpiryDate}
          variant={licenseState.expired ? 'destructive' : licenseState.expiringSoon ? 'warning' : 'muted'}
        />
        <div className="flex items-center gap-2">
          <Award className={cn('h-3.5 w-3.5', safetyColor)} />
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Safety Score
            </p>
            <p className={cn('text-xs font-semibold', safetyColor)}>{safetyScore}%</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function LicenseInfo({
  Icon,
  label,
  value,
  variant,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  variant: 'destructive' | 'warning' | 'muted';
}) {
  const colorMap = {
    destructive: 'text-red-600',
    warning: 'text-amber-600',
    muted: 'text-muted-foreground',
  } as const;
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn('h-3.5 w-3.5', colorMap[variant])} />
      <div>
        <p className={cn('text-[10px] font-medium uppercase tracking-wide', colorMap[variant])}>
          {label}
        </p>
        <p className="text-xs font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function getLicenseState(date: string) {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Expired', expired: true, expiringSoon: false };
  if (days <= 30) return { label: 'Expiring Soon', expired: false, expiringSoon: true };
  return { label: 'Valid', expired: false, expiringSoon: false };
}
