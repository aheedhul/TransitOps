import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { DigitalTwinGrid } from '../features/fleet/index.js';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: () => {
    const { t } = useTranslation();
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('dashboard.commandCenter')}</h1>
        <DigitalTwinGrid />
      </div>
    );
  },
});
