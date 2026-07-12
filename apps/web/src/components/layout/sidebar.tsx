import { useAuthStore } from '../../features/auth/store.js';
import { useThemeStore } from '../../features/theme/store.js';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface NavItem {
  label: string;
  path: string;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard', path: '/dashboard', roles: ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  { label: 'nav.map', path: '/map', roles: ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  { label: 'nav.vehicles', path: '/vehicles', roles: ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  { label: 'nav.drivers', path: '/drivers', roles: ['admin', 'fleet_manager', 'safety_officer'] },
  { label: 'nav.trips', path: '/trips', roles: ['admin', 'fleet_manager', 'driver'] },
  { label: 'nav.maintenance', path: '/maintenance', roles: ['admin', 'fleet_manager'] },
  { label: 'nav.fuel', path: '/fuel', roles: ['admin', 'fleet_manager', 'financial_analyst'] },
  { label: 'nav.reports', path: '/reports', roles: ['admin', 'fleet_manager', 'financial_analyst', 'safety_officer'] },
  { label: 'nav.users', path: '/users', roles: ['admin'] },
  { label: 'nav.settings', path: '/settings', roles: ['admin'] },
  { label: 'nav.auditLog', path: '/audit-logs', roles: ['admin'] },
  { label: 'nav.notifications', path: '/notifications', roles: ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
];

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const session = useAuthStore((s) => s.session);
  const { theme, setTheme } = useThemeStore();

  if (!session) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(session.role));

  const cycleTheme = () => {
    const next: Record<string, 'light' | 'dark' | 'system'> = {
      light: 'dark',
      dark: 'system',
      system: 'light',
    };
    setTheme(next[theme] ?? 'system');
  };

  const themeIcon = theme === 'dark' ? (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ) : theme === 'light' ? (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ) : (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  const themeLabel = theme === 'dark' ? t('theme.toggleDark') : theme === 'light' ? t('theme.toggleLight') : t('theme.toggleSystem');

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="text-lg font-bold">{t('app.brandName')}</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {t(item.label)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 space-y-2">
        <button
          onClick={cycleTheme}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title={themeLabel}
        >
          {themeIcon}
          <span>{themeLabel}</span>
        </button>
        <div className="text-xs text-muted-foreground">
          {session.name} &middot; {session.role}
        </div>
      </div>
    </aside>
  );
}
