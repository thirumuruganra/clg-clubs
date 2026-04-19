import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-muted',
  soft: 'bg-surface-muted text-text-primary hover:bg-surface-muted/80',
  primary: 'bg-primary text-white hover:bg-primary/90',
};

const sizes = {
  sm: 'size-9',
  md: 'size-11',
  lg: 'size-12',
};

export const IconButton = React.forwardRef(function IconButton(
  { className, variant = 'ghost', size = 'md', type = 'button', ariaLabel, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      className={cn(
        'touch-target inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
