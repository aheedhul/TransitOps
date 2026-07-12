import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './sidebar.js';
import { NotificationBell } from '../../features/notifications/components/notification-bell.js';
import { OfflineBanner } from '../../features/offline/components/offline-banner.js';
import { ConflictTray } from '../../features/offline/components/conflict-tray.js';
import { useOfflineInit } from '../../features/offline/useOfflineInit.js';

export function AppLayout() {
  useOfflineInit();

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
    </div>
  );
}
