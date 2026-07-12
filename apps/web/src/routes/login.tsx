import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/login')({
  component: () => {
    const { t } = useTranslation();

    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm rounded-lg border bg-card p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold">{t('auth.loginTitle')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium">{t('auth.email')}</label>
              <input
                type="email"
                name="email"
                required
                placeholder={t('auth.emailPlaceholder')}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">{t('auth.password')}</label>
              <input
                type="password"
                name="password"
                required
                placeholder={t('auth.passwordPlaceholder')}
                className="mt-1 block w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('auth.login')}
            </button>
          </form>
        </div>
      </div>
    );
  },
});
