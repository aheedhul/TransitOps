import { useSyncStore } from '../offline-store.js';
import { CloudOff, RefreshCw, CheckCircle2, AlertCircle, Cloud } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

const STATE_CONFIG: Record<
  string,
  { label: string; icon: typeof Cloud; className: string; spin?: boolean }
> = {
  connected: { label: 'Synced', icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400' },
  syncing: { label: 'Syncing…', icon: RefreshCw, className: 'text-blue-600 dark:text-blue-400', spin: true },
  offline: { label: 'Offline', icon: CloudOff, className: 'text-amber-600 dark:text-amber-400' },
  issues: { label: 'Sync issues', icon: AlertCircle, className: 'text-red-600 dark:text-red-400' },
};

export function SyncStateIndicator({ className }: { className?: string }) {
  const state = useSyncStore((s) => s.state);
  const lastSync = useSyncStore((s) => s.lastSync);
  const config = STATE_CONFIG[state] ?? { label: state, icon: Cloud, className: 'text-muted-foreground' };
  const Icon = config.icon;
  const timeAgo = lastSync
    ? lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon
        className={cn('h-3.5 w-3.5', config.className, config.spin && 'animate-spin')}
        strokeWidth={2.5}
      />
      <span className="font-medium">{config.label}</span>
      {timeAgo && state === 'connected' && (
        <span className="text-muted-foreground/60">· {timeAgo}</span>
      )}
    </div>
  );
}
