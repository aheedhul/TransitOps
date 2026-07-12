import { type ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

export interface TabItem {
  key: string;
  label: ReactNode;
  count?: number;
  icon?: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export function Tabs({ items, value, onChange, variant = 'underline', className }: TabsProps) {
  if (variant === 'pills') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded-lg border bg-muted/50 p-1',
          className,
        )}
        role="tablist"
      >
        {items.map((item) => {
          const active = value === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                active
                  ? 'bg-background text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.icon}
              {item.label}
              {typeof item.count === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div
      className={cn('flex items-center gap-1 border-b', className)}
      role="tablist"
    >
      {items.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors',
              'after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:rounded-full after:transition-all',
              active
                ? 'text-foreground after:bg-primary'
                : 'text-muted-foreground after:bg-transparent hover:text-foreground',
            )}
          >
            {item.icon}
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
