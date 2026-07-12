import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils.js';
import { Skeleton } from './skeleton.js';

export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  unit?: string;
  icon?: ReactNode;
  trend?: { value: string; direction: 'up' | 'down' | 'flat' };
  accent?: 'primary' | 'success' | 'warning' | 'destructive' | 'info' | 'neutral';
}

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'from-emerald-500/20 to-emerald-500/0 text-emerald-600 dark:text-emerald-400',
  success: 'from-emerald-500/20 to-emerald-500/0 text-emerald-600 dark:text-emerald-400',
  warning: 'from-amber-500/20 to-amber-500/0 text-amber-600 dark:text-amber-400',
  destructive: 'from-red-500/20 to-red-500/0 text-red-600 dark:text-red-400',
  info: 'from-blue-500/20 to-blue-500/0 text-blue-600 dark:text-blue-400',
  neutral: 'from-slate-500/20 to-slate-500/0 text-slate-600 dark:text-slate-400',
};

const iconBgMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  destructive: 'bg-red-500/10 text-red-600 dark:text-red-400',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

const trendColor: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-red-600 dark:text-red-400',
  flat: 'text-muted-foreground',
};

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, unit, icon, trend, accent = 'primary', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-5 shadow-soft transition-all duration-200',
        'hover:shadow-elevated hover:-translate-y-0.5',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-60 blur-2xl transition-opacity group-hover:opacity-100',
          accentMap[accent],
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </span>
            {unit && (
              <span className="text-sm font-medium text-muted-foreground">{unit}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {trend && (
              <span className={cn('text-[10px] font-semibold', trendColor[trend.direction])}>
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
              </span>
            )}
          </div>
        </div>
        {icon && (
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              iconBgMap[accent],
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  ),
);
StatCard.displayName = 'StatCard';

export function StatSkeleton({ label = true }: { label?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-16" />
          {label && <Skeleton className="h-3 w-24" />}
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
    </div>
  );
}
