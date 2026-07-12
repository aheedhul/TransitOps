import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type AnchorHTMLAttributes } from 'react';
import { Link, type LinkProps as TanStackLinkProps } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'success'
  | 'link';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 active:scale-[0.98] disabled:bg-primary/50',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]',
  outline:
    'border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive:
    'bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 active:scale-[0.98]',
  success:
    'bg-emerald-600 text-white shadow-soft hover:bg-emerald-700 active:scale-[0.98] disabled:bg-emerald-600/50',
  link: 'text-primary underline-offset-4 hover:underline',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5',
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-base gap-2',
  icon: 'h-9 w-9 p-0',
};

const baseStyles =
  'inline-flex items-center justify-center rounded-md font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

type ButtonAsButton = CommonProps & {
  children?: ReactNode;
  to?: undefined;
  href?: undefined;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>['onClick'];
  form?: string;
  name?: string;
  value?: string | number | readonly string[];
  autoFocus?: boolean;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean;
  title?: string;
  id?: string;
  tabIndex?: number;
  className?: string;
  style?: ButtonHTMLAttributes<HTMLButtonElement>['style'];
};

type ButtonAsLink = CommonProps & {
  children?: ReactNode;
  to: TanStackLinkProps['to'];
  params?: TanStackLinkProps['params'];
  search?: TanStackLinkProps['search'];
  hash?: TanStackLinkProps['hash'];
  disabled?: boolean;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target'];
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>['rel'];
  onClick?: AnchorHTMLAttributes<HTMLAnchorElement>['onClick'];
  'aria-label'?: string;
  title?: string;
  id?: string;
  tabIndex?: number;
  className?: string;
  style?: AnchorHTMLAttributes<HTMLAnchorElement>['style'];
};

type ButtonAsAnchor = CommonProps & {
  children?: ReactNode;
  href: string;
  external?: boolean;
  disabled?: boolean;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target'];
  rel?: AnchorHTMLAttributes<HTMLAnchorElement>['rel'];
  onClick?: AnchorHTMLAttributes<HTMLAnchorElement>['onClick'];
  'aria-label'?: string;
  title?: string;
  id?: string;
  tabIndex?: number;
  className?: string;
  style?: AnchorHTMLAttributes<HTMLAnchorElement>['style'];
};

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor;

function isLinkProps(props: ButtonProps): props is ButtonAsLink {
  return (props as ButtonAsLink).to !== undefined;
}

function isAnchorProps(props: ButtonProps): props is ButtonAsAnchor {
  return (props as ButtonAsAnchor).href !== undefined;
}

function renderChildren(
  loading: boolean,
  leftIcon: ReactNode,
  rightIcon: ReactNode,
  children: ReactNode,
) {
  return (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </>
  );
}

function classNames(
  variant: ButtonVariant,
  size: ButtonSize,
  className: string | undefined,
) {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className);
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      children,
      ...rest
    } = props as CommonProps & { className?: string; children?: ReactNode };

    if (isLinkProps(props)) {
      const { to, params, search, hash, ...anchorRest } = rest as Omit<ButtonAsLink, keyof CommonProps>;
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          to={to}
          params={params as Record<string, string>}
          search={search}
          hash={hash}
          className={classNames(variant, size, className)}
          aria-disabled={loading || undefined}
          {...anchorRest}
        >
          {renderChildren(loading, leftIcon, rightIcon, children)}
        </Link>
      );
    }

    if (isAnchorProps(props)) {
      const { href, external, ...anchorRest } = rest as Omit<ButtonAsAnchor, keyof CommonProps>;
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noopener noreferrer' : undefined}
          className={classNames(variant, size, className)}
          {...anchorRest}
        >
          {renderChildren(loading, leftIcon, rightIcon, children)}
        </a>
      );
    }

    const { type = 'button', disabled, ...buttonRest } = rest as ButtonHTMLAttributes<HTMLButtonElement> & { type?: 'button' | 'submit' | 'reset' };
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type}
        disabled={disabled || loading}
        className={classNames(variant, size, className)}
        {...buttonRest}
      >
        {renderChildren(loading, leftIcon, rightIcon, children)}
      </button>
    );
  },
);
Button.displayName = 'Button';
