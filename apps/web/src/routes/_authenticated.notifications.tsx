import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { api } from '../features/trips/api/client.js';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'red' | 'orange' | 'blue' | 'green';
  createdAt: string;
  readAt?: string;
}

function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    api.get<{ data: NotificationItem[] }>('/notifications')
      .then((data) => setNotifications(data.data ?? []))
      .catch(() => {});
  }, []);

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
      ? notifications.filter((n) => !n.readAt)
      : notifications.filter((n) => n.priority === filter);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notification Center</h1>
        <div className="flex gap-2">
          {['all', 'unread', 'red', 'orange', 'blue'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-sm ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground">No notifications</p>
        ) : (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 ${!n.readAt ? 'border-l-4 border-l-primary' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{n.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
              <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs">
                {n.type}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/notifications')({
  component: NotificationCenter,
});
