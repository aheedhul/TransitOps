import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils.js';
import type { StatusKind } from './status-pill.js';

export type AvatarStatus =
  | StatusKind
  | 'available'
  | 'on-trip'
  | 'in-shop'
  | 'retired'
  | 'suspended'
  | 'off-duty';

export const Avatar = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement> & {
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: AvatarStatus;
}>(({ className, name = '', size = 'md', status, ...props }, ref) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-10 w-10 text-sm',
    xl: 'h-12 w-12 text-base',
  } as const;

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-500',
    'on-trip': 'bg-blue-500',
    'in-shop': 'bg-amber-500',
    retired: 'bg-slate-500',
    suspended: 'bg-red-500',
    'off-duty': 'bg-slate-400',
    draft: 'bg-slate-400',
    dispatched: 'bg-blue-500',
    'in-transit': 'bg-indigo-500',
    completed: 'bg-emerald-500',
    cancelled: 'bg-red-500',
    active: 'bg-amber-500',
    closed: 'bg-emerald-500',
    pending: 'bg-amber-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    neutral: 'bg-slate-500',
  };

  return (
    <span
      ref={ref}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary font-semibold text-primary-foreground ring-2 ring-background',
        sizes[size],
        className,
      )}
      {...props}
    >
      {initials || '?'}
      {status && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background',
            statusColors[status] ?? 'bg-slate-500',
          )}
          aria-label={status}
        />
      )}
    </span>
  );
});
Avatar.displayName = 'Avatar';
