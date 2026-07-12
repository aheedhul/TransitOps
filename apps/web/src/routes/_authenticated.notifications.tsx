import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Inbox, AlertCircle, CheckCircle2, Info, AlertTriangle, Search } from 'lucide-react';
import { api } from '../features/trips/api/client.js';
import { PageHeader, EmptyState } from '../components/ui/empty-state.js';
import { Card } from '../components/ui/card.js';
import { Tabs } from '../components/ui/tabs.js';
import { Input } from '../components/ui/input.js';
import { Spinner } from '../components/ui/spinner.js';
import { cn } from '../lib/utils.js';
import type { ReactNode } from 'react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'red' | 'orange' | 'blue' | 'green';
  createdAt: string;
  readAt?: string;
}

const PRIORITY_CONFIG: Record<string, { icon: typeof AlertCircle; bg: string; text: string; ring: string; dot: string; label: string }> = {
  red: {
    icon: AlertCircle,
    bg: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-500/20',
    dot: 'bg-red-500',
    label: 'Urgent',
  },
  orange: {
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/20',
    dot: 'bg-amber-500',
    label: 'Warning',
  },
  blue: {
    icon: Info,
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    ring: 'ring-blue-500/20',
    dot: 'bg-blue-500',
    label: 'Info',
  },
  green: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/20',
    dot: 'bg-emerald-500',
    label: 'Success',
  },
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

function NotificationCenter() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: NotificationItem[] }>('/notifications')
      .then((data) => setNotifications(data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === 'unread' && n.readAt) return false;
    if (['red', 'orange', 'blue', 'green'].includes(filter) && n.priority !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const tabs: { key: string; label: string; count: number; icon: ReactNode }[] = [
    {
      key: 'all',
      label: 'All',
      count: notifications.length,
      icon: <Bell className="h-3.5 w-3.5" />,
    },
    {
      key: 'unread',
      label: 'Unread',
      count: notifications.filter((n) => !n.readAt).length,
      icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    {
      key: 'red',
      label: 'Urgent',
      count: notifications.filter((n) => n.priority === 'red').length,
      icon: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
    },
    {
      key: 'orange',
      label: 'Warning',
      count: notifications.filter((n) => n.priority === 'orange').length,
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    },
    {
      key: 'blue',
      label: 'Info',
      count: notifications.filter((n) => n.priority === 'blue').length,
      icon: <Info className="h-3.5 w-3.5 text-blue-500" />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('notifications.title')}
        description={`${notifications.length} notifications. Stay updated on fleet events and alerts.`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          items={tabs}
          value={filter}
          onChange={setFilter}
          variant="pills"
        />
        <div className="w-full sm:max-w-xs">
          <Input
            type="search"
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      {loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Loading notifications…</span>
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title={t('notifications.noNotifications')}
          description={t('notifications.noNotificationsDesc')}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const config = PRIORITY_CONFIG[n.priority] ?? PRIORITY_CONFIG.blue!;
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                className={cn(
                  'group flex items-start gap-3 rounded-xl border bg-card p-4 shadow-soft transition-all hover:shadow-elevated',
                  !n.readAt && 'border-l-4 border-l-primary',
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    config.bg,
                    config.text,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
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
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {n.message}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                        config.bg,
                        config.text,
                        config.ring,
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
                      {config.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">· {n.type}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/notifications')({
  component: NotificationCenter,
});
