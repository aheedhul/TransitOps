import { useAuthStore } from '../../features/auth/store.js';
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

  if (!session) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(session.role));

  return (
    <aside className="flex h-full w-60 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <span className="text-lg font-bold">TransitOps</span>
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
      <div className="border-t p-3">
        <div className="text-xs text-muted-foreground">
          {session.name} &middot; {session.role}
        </div>
      </div>
    </aside>
  );
}
