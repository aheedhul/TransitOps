import { useState } from 'react';
import { useNavigate, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client.js';

export function TripCreateForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sourceLabel, setSourceLabel] = useState('');
  const [destinationLabel, setDestinationLabel] = useState('');
  const [cargoWeightKg, setCargoWeightKg] = useState('');
  const [cargoDescription, setCargoDescription] = useState('');
  const [plannedDepartureAt, setPlannedDepartureAt] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/trips', {
        sourceLabel,
        destinationLabel,
        cargoWeightKg: parseFloat(cargoWeightKg),
        cargoDescription: cargoDescription || undefined,
        plannedDepartureAt: plannedDepartureAt || undefined,
        vehicleId: vehicleId || undefined,
        driverId: driverId || undefined,
        customerId: customerId || undefined,
      });
      navigate({ to: '/trips' });
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('tripForm.title')}</h1>
      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6">
        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-medium">{t('tripForm.route')}</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">{t('tripForm.sourceLabel')}</label>
              <input
                type="text"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                required
                placeholder={t('tripForm.sourcePlaceholder')}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t('tripForm.destinationLabel')}</label>
              <input
                type="text"
                value={destinationLabel}
                onChange={(e) => setDestinationLabel(e.target.value)}
                required
                placeholder={t('tripForm.destinationPlaceholder')}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-medium">{t('tripForm.cargo')}</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">{t('tripForm.weight')}</label>
              <input
                type="number"
                value={cargoWeightKg}
                onChange={(e) => setCargoWeightKg(e.target.value)}
                required
                min="0.01"
                step="0.01"
                placeholder={t('tripForm.weightPlaceholder')}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t('tripForm.description')}</label>
              <input
                type="text"
                value={cargoDescription}
                onChange={(e) => setCargoDescription(e.target.value)}
                placeholder={t('tripForm.descriptionPlaceholder')}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h2 className="text-lg font-medium">{t('tripForm.optionalDetails')}</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">{t('tripForm.plannedDeparture')}</label>
              <input
                type="datetime-local"
                value={plannedDepartureAt}
                onChange={(e) => setPlannedDepartureAt(e.target.value)}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t('tripForm.vehicleId')}</label>
              <input
                type="text"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                placeholder={t('tripForm.uuidPlaceholder')}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t('tripForm.driverId')}</label>
              <input
                type="text"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                placeholder={t('tripForm.uuidPlaceholder')}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t('tripForm.customerId')}</label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                placeholder={t('tripForm.uuidPlaceholder')}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
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
