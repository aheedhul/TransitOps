import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_authenticated/settings')({
  component: () => {
    const { t } = useTranslation();
    return (
      <div>
        <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>
        <p className="mt-2 text-muted-foreground">{t('common.comingSoon')}</p>
      </div>
    );
  },
});
