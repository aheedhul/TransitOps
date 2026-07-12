import { useEffect, useState } from 'react';
import { getConflicts, discardConflict, retryConflict } from '../sync-engine.js';
import type { OutboxEntry } from '../db.js';
import { useOfflineStore } from '../offline-store.js';

export function ConflictTray() {
  const [open, setOpen] = useState(false);
  const [conflicts, setConflicts] = useState<OutboxEntry[]>([]);
  const { syncState, conflictCount } = useOfflineStore();

  const loadConflicts = async () => {
    const items = await getConflicts();
    setConflicts(items);
  };

  useEffect(() => {
    if (open) void loadConflicts();
  }, [open, syncState]);

  const handleDiscard = async (key: string) => {
    await discardConflict(key);
    void loadConflicts();
  };

  const handleRetry = async (key: string) => {
    await retryConflict(key);
    void loadConflicts();
  };

  if (syncState !== 'issues' && conflictCount === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-1.5 text-red-600 hover:bg-red-50"
        aria-label="Sync issues"
        title="Sync issues"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        {conflictCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {conflictCount > 9 ? '9+' : conflictCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border bg-card shadow-lg">
          <div className="border-b px-4 py-2">
            <span className="text-sm font-semibold text-red-700">Sync Issues</span>
            <p className="text-xs text-muted-foreground">
              These mutations were rejected by the server and require your attention.
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {conflicts.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No conflicts
              </div>
            ) : (
              conflicts.map((c) => (
                <div key={c.idempotencyKey} className="border-b px-4 py-3 last:border-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="text-red-600">⚠</span>
                    <span>{formatMutationType(c.type)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(c.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Entity: {c.entityId}
                  </p>
                  {c.lastError && (
                    <p className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                      {c.lastError.code}: {c.lastError.message}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleRetry(c.idempotencyKey)}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => handleDiscard(c.idempotencyKey)}
                      className="rounded border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {conflicts.length > 0 && (
            <div className="border-t px-4 py-2">
              <button
                onClick={async () => {
                  for (const c of conflicts) await retryConflict(c.idempotencyKey);
                  void loadConflicts();
                }}
                className="w-full rounded bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
              >
                Retry All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatMutationType(type: string): string {
  const map: Record<string, string> = {
    'trip.start': 'Trip Start',
    'trip.checkpoint': 'Trip Checkpoint',
    'trip.complete': 'Trip Complete',
    'trip.cancel': 'Trip Cancel',
    'trip.dispatch': 'Trip Dispatch',
    'fuel_log.create': 'Fuel Log',
    'maintenance.create': 'Maintenance Create',
    'maintenance.close': 'Maintenance Close',
    'expense.create': 'Expense',
  };
  return map[type] ?? type;
}
