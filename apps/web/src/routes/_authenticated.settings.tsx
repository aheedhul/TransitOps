import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../features/auth/store.js';
import { useThemeStore } from '../features/theme/store.js';

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const { theme, setTheme } = useThemeStore();

  const handleLogout = () => {
    useAuthStore.getState().clearSession();
    window.location.href = '/login';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Organization</h3>
          <p className="mt-1 text-sm text-muted-foreground">TransitOps Demo</p>
          <p className="text-sm text-muted-foreground">Currency: INR &middot; Timezone: Asia/Kolkata</p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Appearance</h3>
          <div className="mt-2 flex gap-2">
            {(['light', 'dark', 'system'] as const).map((th) => (
              <button
                key={th}
                onClick={() => setTheme(th)}
                className={`rounded-md px-3 py-1 text-sm ${theme === th ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                {th === 'light' ? t('theme.toggleLight') : th === 'dark' ? t('theme.toggleDark') : t('theme.toggleSystem')}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-semibold">Account</h3>
          <p className="text-sm text-muted-foreground">{session?.name} &middot; {session?.email}</p>
          <p className="text-sm text-muted-foreground">Role: {session?.role}</p>
          <button onClick={handleLogout} className="mt-3 rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:opacity-90">
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </div>
  );
}
