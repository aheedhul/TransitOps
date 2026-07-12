import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode, useId } from 'react';
import { cn } from '../../lib/utils.js';

interface FieldWrapperProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, htmlFor, children, className }: FieldWrapperProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-xs font-medium text-foreground/80"
        >
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase = cn(
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-soft',
  'placeholder:text-muted-foreground/70',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
  'disabled:cursor-not-allowed disabled:opacity-50',
  'transition-shadow',
);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, invalid, type = 'text', onChange, ...props }, ref) => {
    const handleChange = onChange;
    if (leftIcon || rightIcon) {
      return (
        <div
          className={cn(
            'flex h-9 w-full items-center rounded-md border bg-background px-3 shadow-soft transition-shadow',
            invalid
              ? 'border-destructive focus-within:ring-2 focus-within:ring-destructive/40'
              : 'border-input focus-within:ring-2 focus-within:ring-ring',
            'focus-within:ring-offset-1 focus-within:ring-offset-background',
            className,
          )}
        >
          {leftIcon && <span className="mr-2 text-muted-foreground">{leftIcon}</span>}
          <input
            ref={ref}
            type={type}
            onChange={handleChange}
            className="h-full w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            {...props}
          />
          {rightIcon && <span className="ml-2 text-muted-foreground">{rightIcon}</span>}
        </div>
      );
    }
    return (
      <input
        ref={ref}
        type={type}
        onChange={handleChange}
        className={cn(
          inputBase,
          invalid && 'border-destructive focus-visible:ring-destructive/40',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 3, onChange, ...props }, ref) => {
    const handleChange = onChange;
    return (
      <textarea
        ref={ref}
        rows={rows}
        onChange={handleChange}
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-soft',
          'placeholder:text-muted-foreground/70',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          invalid && 'border-destructive focus-visible:ring-destructive/40',
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 py-1 text-sm shadow-soft',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-shadow',
          invalid && 'border-destructive focus-visible:ring-destructive/40',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  ),
);
Select.displayName = 'Select';

export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {}

export function SearchInput(props: SearchInputProps) {
  const id = useId();
  return (
    <Input
      id={id}
      type="search"
      placeholder="Search..."
      leftIcon={
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      {...props}
    />
  );
}
