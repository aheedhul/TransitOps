import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EmptyMaintenanceState } from '../components/ui/empty-state.js';

export const Route = createFileRoute('/_authenticated/maintenance')({
  component: () => {
    const { t } = useTranslation();
    return (
      <div>
        <h1 className="text-2xl font-bold">{t('maintenance.title')}</h1>
        <EmptyMaintenanceState />
      </div>
    );
  },
});
