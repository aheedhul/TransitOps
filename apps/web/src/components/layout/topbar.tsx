import { useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, Command } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils.js';
import { KbdHint } from '../ui/utilities.js';
import { ThemeSwitcher, UserMenu, MobileSidebar } from './sidebar.js';
import { NotificationBell } from '../../features/notifications/components/notification-bell.js';
import { ConflictTray } from '../../features/offline/components/conflict-tray.js';
import { Menu } from 'lucide-react';

export interface TopbarProps {
  onOpenSearch?: () => void;
  breadcrumbs?: { label: ReactNode; href?: string }[];
}

export function Topbar({ onOpenSearch }: TopbarProps) {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onOpenSearch}
          className={cn(
            'group flex h-9 w-full max-w-md items-center gap-2.5 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground transition-all',
            'hover:border-primary/40 hover:bg-background',
          )}
          aria-label={t('search.placeholder')}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
          <span className="hidden flex-1 text-left sm:inline">
            {t('search.placeholder')}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            <KbdHint>⌘</KbdHint>
            <KbdHint>K</KbdHint>
          </span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: '/trips/new' })}
            className="hidden h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:bg-primary/90 hover:shadow-elevated sm:inline-flex"
          >
            <Command className="h-3.5 w-3.5" />
            {t('trips.newTrip')}
          </button>
          <ConflictTray />
          <NotificationBell />
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>
          <UserMenu />
        </div>
      </header>
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} />
    </>
  );
}

export function MobileSearchButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
      aria-label="Search"
    >
      <Search className="h-4 w-4" />
    </button>
  );
}
