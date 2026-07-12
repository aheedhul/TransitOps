import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './sidebar.js';
import { NotificationBell } from '../../features/notifications/components/notification-bell.js';

export function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-12 items-center justify-end border-b px-4">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
