import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useSyncStore } from '../offline-store.js';
import { cn } from '../../../lib/utils.js';

export function OfflineBanner() {
  const { t } = useTranslation();
  const state = useSyncStore((s) => s.state);
  const lastSync = useSyncStore((s) => s.lastSync);
  const triggerSync = useSyncStore((s) => s.triggerSync);

  if (state === 'connected') return null;

  if (state === 'syncing') {
    return (
      <div className="flex items-center justify-center gap-2 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{t('offline.syncing')}</span>
      </div>
    );
  }

  const isOffline = state === 'offline';
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-4 py-1.5 text-xs font-medium',
        isOffline
          ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : 'bg-red-500/10 text-red-700 dark:text-red-300',
      )}
    >
      <div className="flex items-center gap-2">
        {isOffline ? (
          <WifiOff className="h-3.5 w-3.5" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5" />
        )}
        <span>{t(isOffline ? 'offline.offline' : 'offline.syncIssues')}</span>
        {lastSync && (
          <span className="hidden opacity-70 sm:inline">
            · Last sync {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={triggerSync}
        className={cn(
          'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-colors',
          isOffline
            ? 'hover:bg-amber-500/20'
            : 'hover:bg-red-500/20',
        )}
      >
        <RefreshCw className="h-3 w-3" />
        {t('offline.syncNow')}
      </button>
    </div>
  );
}
