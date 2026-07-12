import { type ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

export function DataToolbar({
  search,
  filters,
  actions,
  className,
}: {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-soft sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {search && <div className="sm:max-w-xs sm:flex-1">{search}</div>}
        {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function KbdHint({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-border', className)} role="separator" />;
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'primary',
  className,
}: {
  value: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colorMap = {
    primary: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    destructive: 'bg-red-500',
    info: 'bg-blue-500',
  } as const;
  return (
    <div
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-full bg-muted',
        className,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemax={max}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', colorMap[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
