import { Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect, useCallback, useState } from 'react';
import { Sidebar } from './sidebar.js';
import { Topbar } from './topbar.js';
import { OfflineBanner } from '../../features/offline/components/offline-banner.js';
import { useOfflineInit } from '../../features/offline/useOfflineInit.js';
import { useCommandPalette } from '../../features/command/index.js';
import { useUniversalSearch } from '../../features/search/index.js';
import { useShortcutsHelp } from '../../features/shortcuts/index.js';
import { useSyncStore, type ConflictEntry } from '../../features/offline/offline-store.js';
import { flushOutbox, getConflicts } from '../../features/offline/sync-engine.js';
import { SyncStateIndicator } from '../../features/offline/components/sync-state-indicator.js';

export function AppLayout() {
  const navigate = useNavigate();
  useOfflineInit();

  const { CommandPalette } = useCommandPalette({ actions: [] });
  const { SearchOverlay, open: searchOpen, setOpen: setSearchOpen } = useUniversalSearch();
  const { HelpOverlay, open: helpOpen } = useShortcutsHelp();

  const setConflicts = useSyncStore((s) => s.setConflicts);
  const setTriggerSync = useSyncStore((s) => s.setTriggerSync);
  const setLastSync = useSyncStore((s) => s.setLastSync);
  const setSyncState = useSyncStore((s) => s.setSyncState);
  const [shortcutsArmed, setShortcutsArmed] = useState(true);

  const syncFn = useCallback(() => {
    setSyncState('syncing');
    void flushOutbox().then(() => {
      setSyncState('connected');
      setLastSync(new Date());
    }).catch(() => {
      setSyncState('issues');
    });
  }, [setSyncState, setLastSync]);

  useEffect(() => {
    setTriggerSync(syncFn);
  }, [syncFn, setTriggerSync]);

  useEffect(() => {
    const checkConflicts = () => {
      void getConflicts().then((c) => setConflicts(c as unknown as ConflictEntry[]));
    };
    checkConflicts();
    const interval = setInterval(checkConflicts, 30_000);
    return () => clearInterval(interval);
  }, [setConflicts]);

  useEffect(() => {
    if (!shortcutsArmed) return;
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'n') {
        e.preventDefault();
        navigate({ to: '/trips/new' });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, shortcutsArmed]);

  useEffect(() => {
    if (searchOpen || helpOpen) setShortcutsArmed(false);
    else setShortcutsArmed(true);
  }, [searchOpen, helpOpen]);

  return (
    <div className="flex h-screen flex-col bg-background">
      <OfflineBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenSearch={() => setSearchOpen(true)} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
              <Outlet />
            </div>
            <div className="border-t bg-muted/30 px-4 py-3 sm:px-6">
              <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <SyncStateIndicator />
                  <span className="hidden sm:inline">
                    Press{' '}
                    <kbd className="rounded border border-border bg-background px-1 font-mono text-[10px]">
                      ?
                    </kbd>{' '}
                    for keyboard shortcuts
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span>TransitOps</span>
                  <span>·</span>
                  <span>v1.0</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      {CommandPalette}
      {SearchOverlay}
      {HelpOverlay}
    </div>
  );
}
