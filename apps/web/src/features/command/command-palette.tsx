import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
  ScrollText,
  Bell,
  Plus,
  Search as SearchIcon,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { KbdHint } from '../../components/ui/utilities.js';

interface CommandAction {
  id: string;
  label: string;
  section: 'pages' | 'actions' | 'recent';
  keywords: string[];
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteOptions {
  actions: CommandAction[];
}

export function createCommandPaletteStore() {
  let isOpen = false;
  let setOpenFn: ((v: boolean) => void) | null = null;

  return {
    open: () => {
      isOpen = true;
      setOpenFn?.(true);
    },
    close: () => {
      isOpen = false;
      setOpenFn?.(false);
    },
    toggle: () => {
      isOpen = !isOpen;
      setOpenFn?.(isOpen);
    },
    register: (fn: (v: boolean) => void) => {
      setOpenFn = fn;
    },
  };
}

type CommandStore = ReturnType<typeof createCommandPaletteStore>;

let _paletteStore: CommandStore | null = null;

export function getCommandPalette(): CommandStore {
  if (!_paletteStore) {
    _paletteStore = createCommandPaletteStore();
  }
  return _paletteStore;
}

export function useCommandPalette({ actions }: CommandPaletteOptions) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const staticActions: CommandAction[] = [
    { id: 'new-trip', label: t('trips.newTrip'), section: 'actions', icon: Plus, keywords: ['trip', 'create', 'new'], shortcut: '⌘N', run: () => navigate({ to: '/trips/new' }) },
    { id: 'dashboard', label: t('nav.dashboard'), section: 'pages', icon: LayoutDashboard, keywords: ['home', 'dashboard', 'command'], run: () => navigate({ to: '/dashboard' }) },
    { id: 'map', label: t('nav.map'), section: 'pages', icon: Map, keywords: ['map', 'fleet', 'gps'], run: () => navigate({ to: '/map' }) },
    { id: 'vehicles', label: t('nav.vehicles'), section: 'pages', icon: Truck, keywords: ['vehicle', 'fleet', 'truck'], run: () => navigate({ to: '/vehicles' }) },
    { id: 'drivers', label: t('nav.drivers'), section: 'pages', icon: Users, keywords: ['driver', 'personnel'], run: () => navigate({ to: '/drivers' }) },
    { id: 'trips', label: t('nav.trips'), section: 'pages', icon: RouteIcon, keywords: ['trip', 'route', 'journey'], run: () => navigate({ to: '/trips' }) },
    { id: 'maintenance', label: t('nav.maintenance'), section: 'pages', icon: Wrench, keywords: ['repair', 'service'], run: () => navigate({ to: '/maintenance' }) },
    { id: 'fuel', label: t('nav.fuel'), section: 'pages', icon: Fuel, keywords: ['fuel', 'expense'], run: () => navigate({ to: '/fuel' }) },
    { id: 'reports', label: t('nav.reports'), section: 'pages', icon: BarChart3, keywords: ['report', 'analytics', 'kpi'], run: () => navigate({ to: '/reports' }) },
    { id: 'notifications', label: t('nav.notifications'), section: 'pages', icon: Bell, keywords: ['notification', 'alert'], run: () => navigate({ to: '/notifications' }) },
    { id: 'audit', label: t('nav.auditLog'), section: 'pages', icon: ScrollText, keywords: ['audit', 'log'], run: () => navigate({ to: '/audit-logs' }) },
    { id: 'settings', label: t('nav.settings'), section: 'pages', icon: Settings, keywords: ['settings', 'preferences'], run: () => navigate({ to: '/settings' }) },
  ];

  const allActions = [...staticActions, ...actions];

  const filtered = query
    ? allActions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase())),
      )
    : allActions;

  useEffect(() => {
    getCommandPalette().register(setOpen);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const action = filtered[activeIndex];
        if (action) {
          action.run();
          setOpen(false);
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, activeIndex]);

  const runAction = useCallback((action: CommandAction) => {
    action.run();
    setOpen(false);
  }, []);

  const sections = [
    { key: 'pages' as const, label: t('command.pages'), items: filtered.filter((a) => a.section === 'pages') },
    { key: 'actions' as const, label: t('command.actions'), items: filtered.filter((a) => a.section === 'actions') },
  ].filter((s) => s.items.length > 0);

  const CommandPalette = open ? (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-floating animate-scale-in">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('command.placeholder')}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <KbdHint>esc</KbdHint>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <SearchIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">{t('command.noResults')}</p>
            </div>
          )}
          {sections.map((section) => (
            <div key={section.key} className="mb-1 last:mb-0">
              <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              {section.items.map((action) => {
                const globalIndex = filtered.indexOf(action);
                const isActive = globalIndex === activeIndex;
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => runAction(action)}
                    onMouseEnter={() => setActiveIndex(globalIndex)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors',
                      isActive ? 'bg-accent text-foreground' : 'text-foreground/80 hover:bg-accent/50',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                        isActive ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 truncate text-left font-medium">{action.label}</span>
                    {action.shortcut && <KbdHint>{action.shortcut}</KbdHint>}
                    {isActive && <span className="text-[10px] text-muted-foreground">↵</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <KbdHint>↑</KbdHint>
              <KbdHint>↓</KbdHint>
              navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <KbdHint>↵</KbdHint>
              select
            </span>
          </div>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-primary" /> Powered by TransitOps
          </span>
        </div>
      </div>
    </div>
  ) : null;

  return { CommandPalette, open, setOpen };
}
