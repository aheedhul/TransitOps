import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSyncStore, type ConflictEntry } from '../offline-store.js';
import { retryConflict, discardConflict } from '../sync-engine.js';

export function ConflictTray() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const conflicts = useSyncStore((s) => s.conflicts);

  const mutationLabel = (type: string): string => {
    const key = `offline.mutationLabels.${type}`;
    return t(key) || type;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 hover:bg-accent"
        aria-label={t('offline.conflicts')}
        title={t('offline.conflicts')}
      >
        <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        {conflicts.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
            {conflicts.length > 9 ? '9+' : conflicts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-lg border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-semibold">{t('offline.conflicts')}</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <p className="px-4 py-2 text-xs text-muted-foreground">{t('offline.conflictDesc')}</p>
            {conflicts.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t('offline.noConflicts')}
              </div>
            ) : (
              <>
                {conflicts.map((c: ConflictEntry) => (
                  <div key={c.idempotencyKey} className="border-b px-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{mutationLabel(c.type)}</span>
                      <span className="text-xs text-muted-foreground">{c.entityId}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {c.lastError?.message ?? t('errors.generic')}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => retryConflict(c.idempotencyKey)}
                        className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                      >
                        {t('common.retry')}
                      </button>
                      <button
                        onClick={() => discardConflict(c.idempotencyKey)}
                        className="rounded bg-muted px-2 py-0.5 text-xs"
                      >
                        {t('common.discard')}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="border-t px-4 py-2">
                  <button
                    onClick={() => { conflicts.forEach((c: ConflictEntry) => retryConflict(c.idempotencyKey)); }}
                    className="w-full rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                  >
                    {t('common.retryAll')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
