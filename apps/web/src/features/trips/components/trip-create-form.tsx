import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreateTrip } from '../api/hooks.js';
import type { CreateTripInput } from '../api/types.js';

export function TripCreateForm() {
  const navigate = useNavigate();
  const create = useCreateTrip();
  const [form, setForm] = useState<CreateTripInput>({
    sourceLabel: '',
    destinationLabel: '',
    cargoWeightKg: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(form, {
      onSuccess: (data) => {
        navigate({ to: `/trips/${data.data.id}` });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Trip</h1>
        <button
          onClick={() => navigate({ to: '/trips' })}
          className="text-sm text-muted-foreground hover:underline"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="rounded-lg border p-4 space-y-4">
          <h2 className="text-sm font-semibold">Route</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Source Label</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={form.sourceLabel}
                onChange={(e) => setForm({ ...form, sourceLabel: e.target.value })}
                placeholder="e.g. Mumbai Depot"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Destination Label</label>
              <input
                type="text"
                required
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={form.destinationLabel}
                onChange={(e) => setForm({ ...form, destinationLabel: e.target.value })}
                placeholder="e.g. Pune Warehouse"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <h2 className="text-sm font-semibold">Cargo</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Weight (kg)</label>
              <input
                type="number"
                required
                min={1}
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={form.cargoWeightKg || ''}
                onChange={(e) => setForm({ ...form, cargoWeightKg: parseFloat(e.target.value) || 0 })}
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={form.cargoDescription || ''}
                onChange={(e) => setForm({ ...form, cargoDescription: e.target.value })}
                placeholder="e.g. Electronics"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 space-y-4">
          <h2 className="text-sm font-semibold">Optional Details</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Planned Departure</label>
              <input
                type="datetime-local"
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={form.plannedDepartureAt ? form.plannedDepartureAt.slice(0, 16) : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    plannedDepartureAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Vehicle ID</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={form.vehicleId || ''}
                onChange={(e) => setForm({ ...form, vehicleId: e.target.value || undefined })}
                placeholder="UUID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Driver ID</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={form.driverId || ''}
                onChange={(e) => setForm({ ...form, driverId: e.target.value || undefined })}
                placeholder="UUID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Customer ID</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                value={form.customerId || ''}
                onChange={(e) => setForm({ ...form, customerId: e.target.value || undefined })}
                placeholder="UUID"
              />
            </div>
          </div>
        </div>

        {create.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {(create.error as Error).message}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? 'Creating...' : 'Create Trip'}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/trips' })}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
