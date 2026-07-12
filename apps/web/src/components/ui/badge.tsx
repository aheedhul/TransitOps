import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'
  | 'muted';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary/10 text-primary ring-1 ring-inset ring-primary/20',
  secondary: 'bg-secondary text-secondary-foreground ring-1 ring-inset ring-border',
  outline: 'border border-border text-foreground bg-transparent',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20',
  destructive: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-1 ring-inset ring-red-500/20',
  info: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-500/20',
  muted: 'bg-muted text-muted-foreground ring-1 ring-inset ring-border',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1',
  md: 'px-2 py-0.5 text-xs gap-1.5',
  lg: 'px-2.5 py-1 text-xs gap-1.5',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', icon, dot, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-medium whitespace-nowrap',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn('h-1.5 w-1.5 rounded-full', {
              'bg-primary': variant === 'default',
              'bg-emerald-500': variant === 'success',
              'bg-amber-500': variant === 'warning',
              'bg-red-500': variant === 'destructive',
              'bg-blue-500': variant === 'info',
              'bg-muted-foreground': variant === 'muted' || variant === 'secondary' || variant === 'outline',
            })}
            aria-hidden="true"
          />
        )}
        {icon && <span className="inline-flex">{icon}</span>}
        {children}
      </span>
    );
  },
);
Badge.displayName = 'Badge';
