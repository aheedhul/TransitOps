import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Map,
  Truck,
  Users,
  Route as RouteIcon,
  Wrench,
  Fuel,
  BarChart3,
  ShieldCheck,
  Settings,
  ScrollText,
  Bell,
  LogOut,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Sun,
  Moon,
  Monitor,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../features/auth/store.js';
import { useThemeStore } from '../../features/theme/store.js';
import { cn } from '../../lib/utils.js';
import { Avatar } from '../ui/avatar.js';
import { StatusPill, type StatusKind } from '../ui/status-pill.js';

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles: string[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'nav.dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  { label: 'nav.map', path: '/map', icon: Map, roles: ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  { label: 'nav.vehicles', path: '/vehicles', icon: Truck, roles: ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  { label: 'nav.drivers', path: '/drivers', icon: Users, roles: ['admin', 'fleet_manager', 'safety_officer'] },
  { label: 'nav.trips', path: '/trips', icon: RouteIcon, roles: ['admin', 'fleet_manager', 'driver'] },
  { label: 'nav.maintenance', path: '/maintenance', icon: Wrench, roles: ['admin', 'fleet_manager'] },
  { label: 'nav.fuel', path: '/fuel', icon: Fuel, roles: ['admin', 'fleet_manager', 'financial_analyst'] },
  { label: 'nav.reports', path: '/reports', icon: BarChart3, roles: ['admin', 'fleet_manager', 'financial_analyst', 'safety_officer'] },
  { label: 'nav.notifications', path: '/notifications', icon: Bell, roles: ['admin', 'fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'nav.users', path: '/users', icon: ShieldCheck, roles: ['admin'] },
  { label: 'nav.auditLog', path: '/audit-logs', icon: ScrollText, roles: ['admin'] },
  { label: 'nav.settings', path: '/settings', icon: Settings, roles: ['admin'] },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  fleet_manager: 'Fleet Manager',
  driver: 'Driver',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clearSession);

  if (!session) return null;

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(session.role));
  const visibleAdmin = ADMIN_ITEMS.filter((item) => item.roles.includes(session.role));
  const roleLabel = ROLE_LABELS[session.role] ?? session.role;

  const handleLogout = () => {
    clearSession();
    void navigate({ to: '/login' });
  };

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
        <BrandMark className="h-8 w-8" />
        <div className="flex flex-col leading-none">
          <span className="text-sm font-bold tracking-tight text-sidebar-foreground">TransitOps</span>
          <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-sidebar-muted">
            Fleet Operations
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <NavGroup title="Workspace" items={visibleItems} pathname={location.pathname} t={t} />
        {visibleAdmin.length > 0 && (
          <NavGroup title="Administration" items={visibleAdmin} pathname={location.pathname} t={t} />
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 px-2.5 py-2">
          <Avatar name={session.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-foreground">{session.name}</p>
            <p className="truncate text-[10px] text-sidebar-muted">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md p-1.5 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label={t('auth.logout')}
            title={t('auth.logout')}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({
  title,
  items,
  pathname,
  t,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-1">
      <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted">
        {title}
      </p>
      {items.map((item) => {
        const isActive =
          pathname === item.path ||
          (item.path !== '/dashboard' && pathname.startsWith(item.path));
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-all',
              isActive
                ? 'bg-sidebar-accent text-sidebar-foreground shadow-soft'
                : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isActive ? 'text-primary' : 'text-sidebar-muted group-hover:text-sidebar-foreground',
              )}
              strokeWidth={isActive ? 2.25 : 2}
            />
            <span className="flex-1 truncate">{t(item.label)}</span>
            {isActive && <ChevronRight className="h-3.5 w-3.5 text-sidebar-muted" />}
          </Link>
        );
      })}
    </div>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-soft',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
  );
}

export { BrandMark };

export function MobileSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clearSession);

  if (!session || !open) return null;
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(session.role));
  const visibleAdmin = ADMIN_ITEMS.filter((item) => item.roles.includes(session.role));
  const roleLabel = ROLE_LABELS[session.role] ?? session.role;

  return (
    <div className="fixed inset-0 z-[90] lg:hidden">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
      />
      <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-floating animate-slide-in-from-top">
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-8 w-8" />
            <span className="text-sm font-bold tracking-tight">TransitOps</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label="Close menu"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <NavGroup title="Workspace" items={visibleItems} pathname={location.pathname} t={t} />
          {visibleAdmin.length > 0 && (
            <NavGroup title="Administration" items={visibleAdmin} pathname={location.pathname} t={t} />
          )}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 px-2.5 py-2">
            <Avatar name={session.name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{session.name}</p>
              <p className="truncate text-[10px] text-sidebar-muted">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                clearSession();
                onOpenChange(false);
                void navigate({ to: '/login' });
              }}
              className="rounded-md p-1.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label={t('auth.logout')}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const options: { key: 'light' | 'dark' | 'system'; label: string; Icon: LucideIcon }[] = [
    { key: 'light', label: 'Light', Icon: Sun },
    { key: 'dark', label: 'Dark', Icon: Moon },
    { key: 'system', label: 'System', Icon: Monitor },
  ];
  const current = options.find((o) => o.key === theme) ?? options[2]!;
  const CurrentIcon = current.Icon;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Toggle theme"
        title={`Theme: ${current.label}`}
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-floating animate-scale-in">
            {options.map(({ key, label, Icon }) => {
              const active = theme === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTheme(key);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors',
                    active ? 'bg-accent text-foreground' : 'hover:bg-accent/50',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function UserMenu() {
  const { t } = useTranslation();
  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!session) return null;
  const roleLabel = ROLE_LABELS[session.role] ?? session.role;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2 transition-colors hover:bg-accent"
      >
        <Avatar name={session.name} size="sm" />
        <div className="hidden text-left leading-tight sm:block">
          <p className="text-xs font-semibold text-foreground">{session.name}</p>
          <p className="text-[10px] text-muted-foreground">{roleLabel}</p>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-floating animate-scale-in">
            <div className="border-b p-3">
              <div className="flex items-center gap-2.5">
                <Avatar name={session.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{session.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{session.email}</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-1.5">
                <StatusPill
                  status={(session.role === 'admin' ? 'info' : 'success') as StatusKind}
                  label={roleLabel}
                  size="sm"
                />
                <StatusPill status="success" label="Active" size="sm" />
              </div>
            </div>
            <div className="p-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: '/settings' });
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                {t('nav.settings')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: '/notifications' });
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                {t('nav.notifications')}
              </button>
            </div>
            <div className="border-t p-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  clearSession();
                  void navigate({ to: '/login' });
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
