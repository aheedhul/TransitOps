import { useEffect, useState, type FormEvent } from 'react';
import { Wrench, Save } from 'lucide-react';
import { Dialog } from '../../../components/ui/dialog.js';
import { Button } from '../../../components/ui/button.js';
import { Field, Input, Textarea, Select } from '../../../components/ui/input.js';
import { Spinner } from '../../../components/ui/spinner.js';
import {
  logsApi,
  ApiError,
  MAINTENANCE_TYPES,
  type VehicleListItem,
  type MaintenanceLog,
} from '../api/client.js';

export interface NewMaintenanceLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (log: MaintenanceLog) => void;
}

export function NewMaintenanceLogModal({
  open,
  onOpenChange,
  onCreated,
}: NewMaintenanceLogModalProps) {
  const [vehicles, setVehicles] = useState<VehicleListItem[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState<string>(MAINTENANCE_TYPES[0].value);
  const [description, setDescription] = useState('');
  const [serviceOdometer, setServiceOdometer] = useState('');
  const [cost, setCost] = useState('');
  const [vendor, setVendor] = useState('');
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
    setType(MAINTENANCE_TYPES[0].value);
    setDescription('');
    setServiceOdometer('');
    setCost('');
    setVendor('');
    setError(null);
    setSubmitting(false);
  }, [open]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!vehicleId) {
      setError('Please select a vehicle');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }
    const costNum = Number(cost);
    if (cost === '' || Number.isNaN(costNum) || costNum < 0) {
      setError('Cost must be a non-negative number');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        vehicleId,
        type,
        description: description.trim(),
        cost: costNum,
      };
      if (serviceOdometer) {
        const odo = Number(serviceOdometer);
        if (Number.isNaN(odo) || odo < 0) {
          setError('Service odometer must be a non-negative number');
          setSubmitting(false);
          return;
        }
        body.serviceOdometer = odo;
      }
      if (vendor.trim()) body.vendor = vendor.trim();

      const res = await logsApi.post<{ data: MaintenanceLog }>('/maintenance', body);
      onCreated?.(res.data);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create maintenance log');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          New Maintenance Log
        </span>
      }
      description="Record a maintenance event. The selected vehicle will be moved to In-Shop until the log is closed."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            form="new-maintenance-log-form"
            loading={submitting}
            leftIcon={<Save className="h-3.5 w-3.5" />}
          >
            Create log
          </Button>
        </>
      }
    >
      <form id="new-maintenance-log-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        <Field label="Vehicle" htmlFor="ml-vehicle" required>
          {loadingVehicles ? (
            <div className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
              <Spinner size={12} /> Loading vehicles…
            </div>
          ) : (
            <Select
              id="ml-vehicle"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              required
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id} disabled={v.status === 'retired'}>
                  {v.registrationNumber} — {v.name ?? v.id.slice(0, 8)} ({v.status})
                </option>
              ))}
            </Select>
          )}
        </Field>
        {selectedVehicle && (
          <p className="-mt-2 text-[11px] text-muted-foreground">
            Current odometer: {parseFloat(selectedVehicle.odometer).toLocaleString('en-IN')} km ·
            capacity {parseFloat(selectedVehicle.maxLoadCapacity).toLocaleString('en-IN')} kg
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="ml-type" required>
            <Select
              id="ml-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Service Odometer (km)" htmlFor="ml-odo">
            <Input
              id="ml-odo"
              type="number"
              min="0"
              value={serviceOdometer}
              onChange={(e) => setServiceOdometer(e.target.value)}
              placeholder="e.g. 45200"
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="ml-desc" required>
          <Textarea
            id="ml-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Front brake pad replacement"
            required
            rows={3}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Cost (₹)" htmlFor="ml-cost" required>
            <Input
              id="ml-cost"
              type="number"
              min="0"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              required
            />
          </Field>
          <Field label="Vendor" htmlFor="ml-vendor">
            <Input
              id="ml-vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Ashok Leyland Service Center"
            />
          </Field>
        </div>
      </form>
    </Dialog>
  );
}
