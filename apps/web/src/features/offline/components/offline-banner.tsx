import { useEffect, useState } from 'react';
import { useOfflineStore, type SyncState } from '../offline-store.js';
import { flushOutbox, pullDeltas } from '../sync-engine.js';

const STATE_CONFIG: Record<SyncState, { bg: string; text: string; icon: string; label: string }> = {
  connected: { bg: 'bg-green-600', text: 'text-green-50', icon: '●', label: 'Synced' },
  syncing: { bg: 'bg-yellow-500', text: 'text-yellow-50', icon: '⟳', label: 'Syncing...' },
  offline: { bg: 'bg-orange-500', text: 'text-orange-50', icon: '●', label: 'Offline' },
  issues: { bg: 'bg-red-600', text: 'text-red-50', icon: '⚠', label: 'Sync issues' },
};

export function OfflineBanner() {
  const { syncState, outboxCount, conflictCount, paused } = useOfflineStore();
  const [visible, setVisible] = useState(true);
  const config = STATE_CONFIG[syncState];

  useEffect(() => {
    if (syncState === 'connected') {
      const timer = setTimeout(() => setVisible(false), 3000);
      setVisible(true);
      return () => clearTimeout(timer);
    }
    setVisible(true);
  }, [syncState]);

  if (!visible) return null;

  const handleSyncNow = async () => {
    await flushOutbox();
    await pullDeltas();
  };

  const description = (() => {
    if (syncState === 'offline') return outboxCount > 0 ? `${outboxCount} pending` : '';
    if (syncState === 'issues') return `${conflictCount} rejected`;
    if (paused) return 'Paused';
    return '';
  })();

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1 text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {description && <span className="opacity-80">· {description}</span>}
      <div className="ml-auto flex gap-2">
        <button
          onClick={handleSyncNow}
          className="rounded px-2 py-0.5 text-xs underline hover:bg-white/10"
        >
          Sync now
        </button>
        <button
          onClick={() => setVisible(false)}
          className="rounded px-1 py-0.5 text-xs hover:bg-white/10"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
