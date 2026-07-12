import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

interface CommandAction {
  id: string;
  label: string;
  section: 'pages' | 'actions';
  keywords: string[];
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
  const inputRef = useRef<HTMLInputElement>(null);

  const staticActions: CommandAction[] = [
    { id: 'new-trip', label: t('trips.newTrip'), section: 'actions', keywords: ['trip', 'create', 'new'], run: () => navigate({ to: '/trips/new' }) },
    { id: 'dashboard', label: t('nav.dashboard'), section: 'pages', keywords: ['home', 'dashboard', 'command'], run: () => navigate({ to: '/dashboard' }) },
    { id: 'map', label: t('nav.map'), section: 'pages', keywords: ['map', 'fleet', 'gps'], run: () => navigate({ to: '/map' }) },
    { id: 'vehicles', label: t('nav.vehicles'), section: 'pages', keywords: ['vehicle', 'fleet'], run: () => navigate({ to: '/vehicles' }) },
    { id: 'drivers', label: t('nav.drivers'), section: 'pages', keywords: ['driver', 'personnel'], run: () => navigate({ to: '/drivers' }) },
    { id: 'trips', label: t('nav.trips'), section: 'pages', keywords: ['trip', 'route', 'journey'], run: () => navigate({ to: '/trips' }) },
    { id: 'maintenance', label: t('nav.maintenance'), section: 'pages', keywords: ['repair', 'service'], run: () => navigate({ to: '/maintenance' }) },
    { id: 'fuel', label: t('nav.fuel'), section: 'pages', keywords: ['fuel', 'expense'], run: () => navigate({ to: '/fuel' }) },
    { id: 'reports', label: t('nav.reports'), section: 'pages', keywords: ['report', 'analytics', 'kpi'], run: () => navigate({ to: '/reports' }) },
    { id: 'notifications', label: t('nav.notifications'), section: 'pages', keywords: ['notification', 'alert'], run: () => navigate({ to: '/notifications' }) },
    { id: 'audit', label: t('nav.auditLog'), section: 'pages', keywords: ['audit', 'log'], run: () => navigate({ to: '/audit-logs' }) },
  ];

  const allActions = [...staticActions, ...actions];

  const filtered = query
    ? allActions.filter(
        (a) =>
          a.label.toLowerCase().includes(query.toLowerCase()) ||
          a.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase())),
      )
    : allActions;

  const pageActions = filtered.filter((a) => a.section === 'pages');
  const actionItems = filtered.filter((a) => a.section === 'actions');

  useEffect(() => {
    getCommandPalette().register(setOpen);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      inputRef.current?.focus();
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

  const runAction = useCallback((action: CommandAction) => {
    action.run();
    setOpen(false);
  }, []);

  const CommandPalette = open ? (
    <div className="fixed inset-0 z-[100]">
      <div className="fixed inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2 rounded-lg border bg-card shadow-2xl">
        <div className="border-b px-4 py-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('command.placeholder')}
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t('command.noResults')}
            </div>
          )}
          {pageActions.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">{t('command.pages')}</div>
              {pageActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => runAction(action)}
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="text-muted-foreground mr-2">&rarr;</span>
                  {action.label}
                </button>
              ))}
            </>
          )}
          {actionItems.length > 0 && (
            <>
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground">{t('command.actions')}</div>
              {actionItems.map((action) => (
                <button
                  key={action.id}
                  onClick={() => runAction(action)}
                  className="flex w-full items-center rounded-md px-3 py-2 text-sm hover:bg-accent"
                >
                  <span className="text-muted-foreground mr-2">&gt;</span>
                  {action.label}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex justify-between">
          <span>&uarr;&darr; {t('command.noResults') !== '' ? 'Navigate' : 'Navigate'}</span>
          <span>Enter {t('common.confirm').toLowerCase()}</span>
          <span>Esc {t('shortcuts.closeModal')}</span>
        </div>
      </div>
    </div>
  ) : null;

  return { CommandPalette, open, setOpen };
}
