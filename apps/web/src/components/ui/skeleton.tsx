import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils.js';

export const Skeleton = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-md bg-muted/60',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
        className,
      )}
      {...props}
    />
  ),
);
Skeleton.displayName = 'Skeleton';

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
