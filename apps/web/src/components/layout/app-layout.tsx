import { Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect, useCallback } from 'react';
import { Sidebar } from './sidebar.js';
import { NotificationBell } from '../../features/notifications/components/notification-bell.js';
import { OfflineBanner } from '../../features/offline/components/offline-banner.js';
import { ConflictTray } from '../../features/offline/components/conflict-tray.js';
import { useOfflineInit } from '../../features/offline/useOfflineInit.js';
import { useCommandPalette } from '../../features/command/index.js';
import { useUniversalSearch } from '../../features/search/index.js';
import { useShortcutsHelp } from '../../features/shortcuts/index.js';
import { useSyncStore, type ConflictEntry } from '../../features/offline/offline-store.js';
import { flushOutbox, getConflicts } from '../../features/offline/sync-engine.js';

export function AppLayout() {
  const navigate = useNavigate();
  useOfflineInit();

  const { CommandPalette } = useCommandPalette({ actions: [] });
  const { SearchOverlay } = useUniversalSearch();
  const { HelpOverlay } = useShortcutsHelp();

  const setConflicts = useSyncStore((s) => s.setConflicts);
  const setTriggerSync = useSyncStore((s) => s.setTriggerSync);
  const setLastSync = useSyncStore((s) => s.setLastSync);
  const setSyncState = useSyncStore((s) => s.setSyncState);

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
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'n') {
        e.preventDefault();
        navigate({ to: '/trips/new' });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-screen flex-col">
      <OfflineBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-12 items-center justify-end gap-2 border-b px-4">
            <ConflictTray />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
      {CommandPalette}
      {SearchOverlay}
      {HelpOverlay}
    </div>
  );
}
