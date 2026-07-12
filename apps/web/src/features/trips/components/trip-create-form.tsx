import { useState, useEffect, useMemo, type SyntheticEvent } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../api/client.js';

interface VehicleOption {
  id: string;
  registrationNumber: string;
  name: string | null;
  status: string;
  maxLoadCapacity: string;
}

interface DriverOption {
  id: string;
  name: string;
  status: string;
  licenseExpiryDate: string;
}

export function TripCreateForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sourceLabel, setSourceLabel] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');
  const [cargoWeightKg, setCargoWeightKg] = useState('');
  const [cargoDescription, setCargoDescription] = useState('');
  const [plannedDepartureAt, setPlannedDepartureAt] = useState('');
  const [plannedDistanceKm, setPlannedDistanceKm] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [vRes, dRes] = await Promise.all([
          api.get<{ data: VehicleOption[] }>('/vehicles?pageSize=1000'),
          api.get<{ data: DriverOption[] }>('/drivers?pageSize=1000'),
        ]);
        setVehicles(vRes.data);
        setDrivers(dRes.data);
      } catch {
        // ignore
      } finally {
        setLoadingOptions(false);
      }
    };
    void load();
  }, []);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === vehicleId),
    [vehicles, vehicleId],
  );

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.id === driverId),
    [drivers, driverId],
  );

  const cargoNum = parseFloat(cargoWeightKg);
  const maxCapacity = selectedVehicle ? parseFloat(selectedVehicle.maxLoadCapacity) : 0;
  const overCapacity = selectedVehicle && cargoWeightKg && cargoNum > maxCapacity;

  const vehicleIssues = selectedVehicle
    ? [
        selectedVehicle.status === 'retired' && 'Vehicle is retired',
        selectedVehicle.status === 'in-shop' && 'Vehicle is in shop',
        selectedVehicle.status === 'on-trip' && 'Vehicle is already on a trip',
      ].filter(Boolean)
    : [];

  const driverIssues = selectedDriver
    ? [
        selectedDriver.status === 'suspended' && 'Driver is suspended',
        selectedDriver.status === 'on-trip' && 'Driver is already on a trip',
        new Date(selectedDriver.licenseExpiryDate) < new Date() && 'License expired',
      ].filter(Boolean)
    : [];

  const canSubmit =
    sourceLabel &&
    destinationLabel &&
    cargoWeightKg &&
    !overCapacity &&
    vehicleIssues.length === 0 &&
    driverIssues.length === 0;

  const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/trips', {
        sourceLabel,
        destinationLabel,
        cargoWeightKg: parseFloat(cargoWeightKg),
        cargoDescription: cargoDescription ? cargoDescription : undefined,
        plannedDepartureAt: plannedDepartureAt ? new Date(plannedDepartureAt).toISOString() : undefined,
        plannedDistanceKm: plannedDistanceKm ? parseFloat(plannedDistanceKm) : undefined,
        vehicleId: vehicleId ? vehicleId : undefined,
        driverId: driverId ? driverId : undefined,
        customerId: customerId ? customerId : undefined,
      });
      void navigate({ to: '/trips' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create trip');
    } finally {
      setSubmitting(false);
    }
  };

  const availableVehicles = vehicles.filter((v) => v.status === 'available');
  const availableDrivers = drivers.filter((d) => d.status === 'available');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('tripForm.title')}</h1>
        <p className="text-sm text-muted-foreground">
          Select route, cargo, vehicle, and driver. Only available assets are shown.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmit(e); }} className="max-w-3xl space-y-6">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-medium">Route & Cargo</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Source"
              value={sourceLabel}
              onChange={setSourceLabel}
              placeholder="e.g. Yelahanka Depot"
              required
            />
            <Input
              label="Destination"
              value={destinationLabel}
              onChange={setDestinationLabel}
              placeholder="e.g. MG Road, Bangalore"
              required
            />
            <Input
              label="Cargo Weight (kg)"
              type="number"
              value={cargoWeightKg}
              onChange={setCargoWeightKg}
              placeholder="e.g. 450"
              required
            />
            <Input
              label="Planned Distance (km)"
              type="number"
              value={plannedDistanceKm}
              onChange={setPlannedDistanceKm}
              placeholder="e.g. 28"
            />
            <div className="sm:col-span-2">
              <Input
                label="Cargo Description"
                value={cargoDescription}
                onChange={setCargoDescription}
                placeholder="e.g. Electronics, fragile"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Planned Departure</label>
              <input
                type="datetime-local"
                value={plannedDepartureAt}
                onChange={(e) => { setPlannedDepartureAt(e.target.value); }}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-medium">Assignment</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Vehicle</label>
              <select
                value={vehicleId}
                onChange={(e) => { setVehicleId(e.target.value); }}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loadingOptions}
              >
                <option value="">{loadingOptions ? 'Loading...' : 'Select available vehicle'}</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} — {v.name ?? v.id.slice(0, 8)} (max {v.maxLoadCapacity} kg)
                  </option>
                ))}
              </select>
              {selectedVehicle && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Capacity: <span className="font-medium text-foreground">{selectedVehicle.maxLoadCapacity} kg</span>
                </div>
              )}
              {overCapacity && (
                <div className="mt-2 text-xs text-destructive">
                  Cargo exceeds capacity by {(cargoNum - maxCapacity).toFixed(1)} kg
                </div>
              )}
              {vehicleIssues.map((msg, i) => (
                <div key={i} className="mt-1 text-xs text-destructive">
                  {msg}
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium">Driver</label>
              <select
                value={driverId}
                onChange={(e) => { setDriverId(e.target.value); }}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={loadingOptions}
              >
                <option value="">{loadingOptions ? 'Loading...' : 'Select available driver'}</option>
                {availableDrivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — license exp {d.licenseExpiryDate}
                  </option>
                ))}
              </select>
              {driverIssues.map((msg, i) => (
                <div key={i} className="mt-1 text-xs text-destructive">
                  {msg}
                </div>
              ))}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium">Customer ID (optional)</label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => { setCustomerId(e.target.value); }}
                placeholder="Paste customer UUID"
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !canSubmit}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? t('tripForm.creating') : t('tripForm.create')}
          </button>
          <Link to="/trips" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        placeholder={placeholder}
        required={required}
        className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
