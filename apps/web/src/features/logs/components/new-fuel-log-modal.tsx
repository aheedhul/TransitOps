import { useEffect, useState, type FormEvent } from 'react';
import { Fuel, Save } from 'lucide-react';
import { Dialog } from '../../../components/ui/dialog.js';
import { Button } from '../../../components/ui/button.js';
import { Field, Input, Select } from '../../../components/ui/input.js';
import { Spinner } from '../../../components/ui/spinner.js';
import {
  logsApi,
  ApiError,
  FUEL_TYPES,
  type VehicleListItem,
  type FuelLog,
} from '../api/client.js';

export interface NewFuelLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (log: FuelLog) => void;
}

export function NewFuelLogModal({ open, onOpenChange, onCreated }: NewFuelLogModalProps) {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [liters, setLiters] = useState('');
  const [cost, setCost] = useState('');
  const [odometerKm, setOdometerKm] = useState('');
  const [fuelType, setFuelType] = useState<string>(FUEL_TYPES[0]);
  const [filledStation, setFilledStation] = useState('');
  const [filledAt, setFilledAt] = useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60_000;
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingVehicles(true);
    logsApi
      .get<{ data: VehicleListItem[] }>('/vehicles?pageSize=200')
      .then((res) => setVehicles(res.data))
      .catch(() => setVehicles([]))
      .finally(() => setLoadingVehicles(false));
  }, [open]);

  useEffect(() => {
    if (open) return;
    setVehicleId('');
    setLiters('');
    setCost('');
    setOdometerKm('');
    setFuelType(FUEL_TYPES[0]);
    setFilledStation('');
    setError(null);
    setSubmitting(false);
  }, [open]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!vehicleId) {
      setError('Please select a vehicle');
      return;
    }
    const litersNum = Number(liters);
    if (!liters || Number.isNaN(litersNum) || litersNum <= 0) {
      setError('Liters must be a positive number');
      return;
    }
    const costNum = Number(cost);
    if (cost === '' || Number.isNaN(costNum) || costNum < 0) {
      setError('Cost must be a non-negative number');
      return;
    }
    const odoNum = Number(odometerKm);
    if (odometerKm === '' || Number.isNaN(odoNum) || odoNum < 0) {
      setError('Odometer must be a non-negative number');
      return;
    }
    if (selectedVehicle && odoNum < parseFloat(selectedVehicle.odometer)) {
      setError(
        `Odometer (${odoNum.toLocaleString('en-IN')} km) cannot be lower than the vehicle's current odometer (${parseFloat(selectedVehicle.odometer).toLocaleString('en-IN')} km).`,
      );
      return;
    }
    if (!filledAt) {
      setError('Please choose when the fill-up happened');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        vehicleId,
        liters: litersNum,
        cost: costNum,
        odometerKm: odoNum,
        fuelType,
        filledAt: new Date(filledAt).toISOString(),
      };
      if (filledStation.trim()) body.filledStation = filledStation.trim();

      const res = await logsApi.post<{ data: FuelLog }>('/fuel-logs', body);
      onCreated?.(res.data);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create fuel log');
    } finally {
      setSubmitting(false);
    }
  };

  const litersNum = Number(liters);
  const costNum = Number(cost);
  const pricePerLiter = litersNum > 0 && costNum >= 0 ? costNum / litersNum : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Fuel className="h-4 w-4" />
          New Fuel Log
        </span>
      }
      description="Record a fuel fill-up. The vehicle's odometer is updated automatically."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-fuel-log-form"
            loading={submitting}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            Create log
          </Button>
        </>
      }
    >
      <form id="new-fuel-log-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <Field label="Vehicle" htmlFor="fl-vehicle" required>
          {loadingVehicles ? (
            <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
              <Spinner size={12} /> Loading vehicles…
            </div>
          ) : (
            <Select
              id="fl-vehicle"
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value);
                const v = vehicles.find((x) => x.id === e.target.value);
                if (v && !odometerKm) setOdometerKm(v.odometer);
              }}
              required
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber}   {v.name ?? v.id.slice(0, 8)} (odo {parseFloat(v.odometer).toLocaleString('en-IN')} km)
                </option>
              ))}
            </Select>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Liters" htmlFor="fl-liters" required>
            <Input
              id="fl-liters"
              type="number"
              min="0"
              step="0.01"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              placeholder="e.g. 45.5"
              required
            />
          </Field>
          <Field label="Cost (₹)" htmlFor="fl-cost" required>
            <Input
              id="fl-cost"
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 4500"
              required
            />
          </Field>
          <Field label="Price / L" htmlFor="fl-pl">
            <Input
              id="fl-pl"
              value={pricePerLiter > 0 ? `₹${pricePerLiter.toFixed(2)}` : ''}
              readOnly
              placeholder=" "
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Odometer (km)" htmlFor="fl-odo" required>
            <Input
              id="fl-odo"
              type="number"
              min="0"
              step="0.1"
              value={odometerKm}
              onChange={(e) => setOdometerKm(e.target.value)}
              placeholder="e.g. 45500"
              required
            />
          </Field>
          <Field label="Fuel type" htmlFor="fl-type" required>
            <Select
              id="fl-type"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              required
            >
              {FUEL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Filled at" htmlFor="fl-at" required>
            <Input
              id="fl-at"
              type="datetime-local"
              value={filledAt}
              onChange={(e) => setFilledAt(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Fuel station" htmlFor="fl-station">
          <Input
            id="fl-station"
            value={filledStation}
            onChange={(e) => setFilledStation(e.target.value)}
            placeholder="e.g. Indian Oil, Yelahanka"
          />
        </Field>
      </form>
    </Dialog>
  );
}
