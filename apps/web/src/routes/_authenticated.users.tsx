import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_authenticated/users')({
  component: () => {
    const { t } = useTranslation();
    return (
      <div>
        <h1 className="text-2xl font-bold">{t('nav.users')}</h1>
        <p className="mt-2 text-muted-foreground">{t('common.comingSoon')}</p>
      </div>
    );
  },
});
