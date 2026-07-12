import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils.js';

export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      className={cn('animate-spin text-current', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path
        d="M22 12C22 17.5228 17.5228 22 12 22"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  description?: ReactNode;
}

export function LoadingState({ label = 'Loading…', description, className, ...props }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-14 text-center shadow-soft',
        className,
      )}
      {...props}
    >
      <Spinner size={24} className="text-primary" />
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
  className,
}: {
  title?: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-14 text-center',
        className,
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {message && <p className="mt-0.5 max-w-md text-xs text-muted-foreground">{message}</p>}
      </div>
      {action}
    </div>
  );
}
