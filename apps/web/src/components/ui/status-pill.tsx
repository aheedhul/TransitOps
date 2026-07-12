import { cn } from '../../lib/utils.js';

export type StatusKind =
  | 'available'
  | 'on-trip'
  | 'in-shop'
  | 'retired'
  | 'draft'
  | 'dispatched'
  | 'in-transit'
  | 'completed'
  | 'cancelled'
  | 'suspended'
  | 'off-duty'
  | 'active'
  | 'closed'
  | 'pending'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

const styles: Record<StatusKind, { label: string; className: string; dot: string }> = {
  available: {
    label: 'Available',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  'on-trip': {
    label: 'On Trip',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20',
    dot: 'bg-blue-500',
  },
  'in-shop': {
    label: 'In Shop',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
    dot: 'bg-amber-500',
  },
  retired: {
    label: 'Retired',
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20',
    dot: 'bg-slate-500',
  },
  draft: {
    label: 'Draft',
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20',
    dot: 'bg-slate-400',
  },
  dispatched: {
    label: 'Dispatched',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20',
    dot: 'bg-blue-500',
  },
  'in-transit': {
    label: 'In Transit',
    className: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-indigo-500/20',
    dot: 'bg-indigo-500',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20',
    dot: 'bg-red-500',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20',
    dot: 'bg-red-500',
  },
  'off-duty': {
    label: 'Off Duty',
    className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-slate-500/20',
    dot: 'bg-slate-400',
  },
  active: {
    label: 'Active',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
    dot: 'bg-amber-500',
  },
  closed: {
    label: 'Closed',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  pending: {
    label: 'Pending',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
    dot: 'bg-amber-500',
  },
  success: {
    label: 'Success',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  warning: {
    label: 'Warning',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
    dot: 'bg-amber-500',
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/20',
    dot: 'bg-red-500',
  },
  info: {
    label: 'Info',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-500/20',
    dot: 'bg-blue-500',
  },
  neutral: {
    label: 'Neutral',
    className: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 ring-slate-500/20',
    dot: 'bg-slate-500',
  },
};

export interface StatusPillProps {
  status: StatusKind | string;
  label?: string;
  size?: 'sm' | 'md';
  withDot?: boolean;
  className?: string;
}

export function StatusPill({ status, label, size = 'md', withDot = true, className }: StatusPillProps) {
  const config = styles[status as StatusKind] ?? styles.neutral;
  const display = label ?? config.label;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        config.className,
        className,
      )}
    >
      {withDot && <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} aria-hidden="true" />}
      {display}
    </span>
  );
}

export function StatusDot({ status, className }: { status: StatusKind | string; className?: string }) {
  const config = styles[status as StatusKind] ?? styles.neutral;
  return (
    <span
      className={cn('inline-block h-2 w-2 rounded-full', config.dot, className)}
      aria-hidden="true"
    />
  );
}

export function getStatusLabel(status: string): string {
  return styles[status as StatusKind]?.label ?? status;
}
