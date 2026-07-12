import { useState, useEffect, useRef } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Bell, Inbox, ChevronRight } from 'lucide-react';
import { api } from '../../trips/api/client.js';
import { cn } from '../../../lib/utils.js';
import { Spinner } from '../../../components/ui/spinner.js';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'red' | 'orange' | 'blue' | 'green';
  createdAt: string;
  readAt?: string;
}

const priorityStyles: Record<string, { dot: string; label: string }> = {
  red: { dot: 'bg-red-500', label: 'Urgent' },
  orange: { dot: 'bg-amber-500', label: 'Warning' },
  blue: { dot: 'bg-blue-500', label: 'Info' },
  green: { dot: 'bg-emerald-500', label: 'Success' },
};

function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ data: NotificationItem[] }>('/notifications');
      const items = data?.data ?? [];
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.readAt).length);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label={t('notifications.bellLabel')}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-soft ring-2 ring-background">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-floating animate-slide-in-from-top">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('notifications.bellLabel')}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            >
              {t('notifications.viewAll')}
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center px-4 py-12">
                <Spinner />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t('notifications.noNotifications')}
                </p>
              </div>
            ) : (
              notifications.slice(0, 6).map((n) => {
                const style = priorityStyles[n.priority] ?? priorityStyles.blue!;
                return (
                  <Link
                    key={n.id}
                    to="/notifications"
                    onClick={() => setOpen(false)}
                    className={cn(
                      'block border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-accent',
                      !n.readAt && 'bg-primary/[0.02]',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', style.dot)}
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              'truncate text-sm',
                              !n.readAt ? 'font-semibold text-foreground' : 'font-medium text-foreground/80',
                            )}
                          >
                            {n.title}
                          </p>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
