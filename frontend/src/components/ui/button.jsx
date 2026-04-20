import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  primary: 'border border-transparent bg-primary text-white shadow-soft-sm hover:bg-primary/90 hover:shadow-soft-md',
  secondary: 'border border-border-subtle bg-surface-muted text-text-primary hover:bg-surface-muted/80 dark:border-border-strong',
  ghost: 'border border-transparent bg-transparent text-text-secondary hover:bg-surface-muted hover:text-text-primary',
  danger: 'border border-transparent bg-danger text-white shadow-soft-sm hover:bg-danger/90',
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
        'interactive-press inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-[background-color,color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
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
