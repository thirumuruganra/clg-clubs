import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary/90',
  secondary: 'bg-surface-muted text-text-primary hover:bg-surface-muted/80',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-muted',
  danger: 'bg-danger text-white hover:bg-danger/90',
};

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Button = React.forwardRef(function Button(
  { className, variant = 'primary', size = 'md', loading = false, type = 'button', disabled, children, ...props },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
