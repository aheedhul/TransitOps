import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RotateCw, X, Inbox } from 'lucide-react';
import { useSyncStore, type ConflictEntry } from '../offline-store.js';
import { retryConflict, discardConflict } from '../sync-engine.js';
import { cn } from '../../../lib/utils.js';

export function ConflictTray() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const conflicts = useSyncStore((s) => s.conflicts);
  const ref = useRef<HTMLDivElement>(null);

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

  const mutationLabel = (type: string): string => {
    const key = `offline.mutationLabels.${type}`;
    return t(key) || type;
  };

  const count = conflicts.length;
  const showIcon = count > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background transition-colors',
          showIcon
            ? 'text-amber-600 hover:bg-amber-500/10 dark:text-amber-400'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
        aria-label={t('offline.conflicts')}
        title={t('offline.conflicts')}
      >
        <AlertTriangle className="h-4 w-4" />
        {showIcon && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-soft ring-2 ring-background">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-floating animate-slide-in-from-top">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('offline.conflicts')}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {count > 0 ? `${count} ${count === 1 ? 'item' : 'items'} need attention` : t('offline.noConflicts')}
              </p>
            </div>
            {count > 0 && (
              <button
                type="button"
                onClick={() => {
                  conflicts.forEach((c) => retryConflict(c.idempotencyKey));
                }}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <RotateCw className="h-3 w-3" />
                {t('common.retryAll')}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {conflicts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                  <Inbox className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-foreground">No conflicts</p>
                <p className="text-xs text-muted-foreground">{t('offline.conflictDesc')}</p>
              </div>
            ) : (
              conflicts.map((c: ConflictEntry) => (
                <div key={c.idempotencyKey} className="border-b px-4 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">
                        {mutationLabel(c.type)}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                        {c.entityId}
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {c.lastError?.message ?? t('errors.generic')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => retryConflict(c.idempotencyKey)}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <RotateCw className="h-3 w-3" />
                      {t('common.retry')}
                    </button>
                    <button
                      type="button"
                      onClick={() => discardConflict(c.idempotencyKey)}
                      className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      {t('common.discard')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
