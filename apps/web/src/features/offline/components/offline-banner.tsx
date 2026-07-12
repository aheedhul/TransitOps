import { useTranslation } from 'react-i18next';
import { useSyncStore } from '../offline-store.js';

export function OfflineBanner() {
  const { t } = useTranslation();
  const state = useSyncStore((s) => s.state);
  const lastSync = useSyncStore((s) => s.lastSync);
  const triggerSync = useSyncStore((s) => s.triggerSync);

  const labels: Record<string, string> = {
    synced: t('offline.synced'),
    syncing: t('offline.syncing'),
    offline: t('offline.offline'),
    issues: t('offline.syncIssues'),
  };

  if (state === 'connected') return null;

  if (state === 'syncing') {
    return (
      <div className="flex items-center justify-between bg-blue-500 px-4 py-1 text-xs text-white">
        <span>{labels[state]}</span>
      </div>
    );
  }

  const isOffline = state === 'offline';
  const bg = isOffline ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className={`flex items-center justify-between ${bg} px-4 py-1 text-xs text-white`}>
      <span>{labels[state] ?? t('offline.paused')}</span>
      <div className="flex items-center gap-2">
        {lastSync && (
          <span className="opacity-75">
            Last: {lastSync.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={triggerSync}
          className="rounded bg-white/20 px-2 py-0.5 hover:bg-white/30"
        >
          {t('offline.syncNow')}
        </button>
      </div>
    </div>
  );
}
