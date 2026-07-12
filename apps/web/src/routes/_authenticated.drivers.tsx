import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { EmptyDriverState } from '../components/ui/empty-state.js';

export const Route = createFileRoute('/_authenticated/drivers')({
  component: () => {
    const { t } = useTranslation();
    return (
      <div>
        <h1 className="text-2xl font-bold">{t('drivers.title')}</h1>
        <EmptyDriverState />
      </div>
    );
  },
});
