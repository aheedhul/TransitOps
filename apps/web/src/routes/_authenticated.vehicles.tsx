import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EmptyVehicleState } from '../components/ui/empty-state.js';

export const Route = createFileRoute('/_authenticated/vehicles')({
  component: () => {
    const { t } = useTranslation();
    return (
      <div>
        <h1 className="text-2xl font-bold">{t('vehicles.title')}</h1>
        <EmptyVehicleState />
      </div>
    );
  },
});
