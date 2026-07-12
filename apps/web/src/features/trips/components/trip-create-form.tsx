import { useState, useEffect, useMemo, type SyntheticEvent } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  MapPin,
  Package,
  Calendar,
  Save,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { api, ApiError } from '../api/client.js';
import { PageHeader } from '../../../components/ui/empty-state.js';
import { Button } from '../../../components/ui/button.js';
import { Section } from '../../../components/ui/card.js';
import { Field, Input, Textarea, Select } from '../../../components/ui/input.js';
import { Spinner } from '../../../components/ui/spinner.js';

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
    <div className="space-y-6">
      <Link
        to="/trips"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to trips
      </Link>
      <PageHeader
        title={t('tripForm.title')}
        description="Select route, cargo, vehicle, and driver. Only available assets are shown."
      />

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
        <Section
          title="Route & Cargo"
          description="Define the journey and what you're transporting"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Source" htmlFor="src" required>
              <Input
                id="src"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                placeholder="e.g. Yelahanka Depot"
                required
                leftIcon={<MapPin className="h-4 w-4" />}
              />
            </Field>
            <Field label="Destination" htmlFor="dst" required>
              <Input
                id="dst"
                value={destinationLabel}
                onChange={(e) => setDestinationLabel(e.target.value)}
                placeholder="e.g. MG Road, Bangalore"
                required
                leftIcon={<MapPin className="h-4 w-4" />}
              />
            </Field>
            <Field label="Cargo Weight (kg)" htmlFor="cw" required>
              <Input
                id="cw"
                type="number"
                value={cargoWeightKg}
                onChange={(e) => setCargoWeightKg(e.target.value)}
                placeholder="e.g. 450"
                required
                leftIcon={<Package className="h-4 w-4" />}
              />
            </Field>
            <Field label="Planned Distance (km)" htmlFor="pd">
              <Input
                id="pd"
                type="number"
                value={plannedDistanceKm}
                onChange={(e) => setPlannedDistanceKm(e.target.value)}
                placeholder="e.g. 28"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Cargo Description" htmlFor="cd">
                <Textarea
                  id="cd"
                  value={cargoDescription}
                  onChange={(e) => setCargoDescription(e.target.value)}
                  placeholder="e.g. Electronics, fragile"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Planned Departure" htmlFor="pdep">
                <Input
                  id="pdep"
                  type="datetime-local"
                  value={plannedDepartureAt}
                  onChange={(e) => { setPlannedDepartureAt(e.target.value); }}
                  leftIcon={<Calendar className="h-4 w-4" />}
                />
              </Field>
            </div>
          </div>
        </Section>

        <Section
          title="Assignment"
          description="Choose a vehicle and driver. Issues will be flagged here."
        >
          {loadingOptions ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size={14} />
              Loading available assets…
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Field label="Vehicle" htmlFor="vh" required>
                  <Select id="vh" value={vehicleId} onChange={(e) => { setVehicleId(e.target.value); }}>
                    <option value="">Select a vehicle</option>
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.registrationNumber} — {v.name ?? v.id.slice(0, 8)} (max {v.maxLoadCapacity} kg)
                      </option>
                    ))}
                  </Select>
                </Field>
                {selectedVehicle && (
                  <div className="mt-2 rounded-md border bg-muted/30 p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className="font-semibold text-foreground">
                        {selectedVehicle.maxLoadCapacity} kg
                      </span>
                    </div>
                  </div>
                )}
                {overCapacity && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>
                      Cargo exceeds capacity by {(cargoNum - maxCapacity).toFixed(1)} kg
                    </span>
                  </div>
                )}
                {vehicleIssues.map((msg, i) => (
                  <div
                    key={i}
                    className="mt-1 flex items-start gap-1.5 rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{msg}</span>
                  </div>
                ))}
              </div>

              <div>
                <Field label="Driver" htmlFor="dr" required>
                  <Select id="dr" value={driverId} onChange={(e) => { setDriverId(e.target.value); }}>
                    <option value="">Select a driver</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — license exp {d.licenseExpiryDate}
                      </option>
                    ))}
                  </Select>
                </Field>
                {driverIssues.map((msg, i) => (
                  <div
                    key={i}
                    className="mt-1 flex items-start gap-1.5 rounded-md border border-destructive/20 bg-destructive/5 p-2 text-xs text-destructive"
                  >
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{msg}</span>
                  </div>
                ))}
              </div>

              <div className="sm:col-span-2">
                <Field label="Customer ID (optional)" htmlFor="cuid" hint="Paste the customer UUID if this trip is for a specific client">
                  <Input
                    id="cuid"
                    type="text"
                    value={customerId}
                    onChange={(e) => { setCustomerId(e.target.value); }}
                    placeholder="Paste customer UUID"
                    leftIcon={<Building2 className="h-4 w-4" />}
                  />
                </Field>
              </div>
            </div>
          )}
        </Section>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline">
            <Link to="/trips">Cancel</Link>
          </Button>
          <Button type="submit" loading={submitting} disabled={!canSubmit} leftIcon={<Save className="h-3.5 w-3.5" />}>
            {submitting ? t('tripForm.creating') : t('tripForm.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
