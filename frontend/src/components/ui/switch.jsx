import React from 'react';
import { cn } from '../../lib/utils';

export const Switch = React.forwardRef(function Switch(
  { className, checked = false, onCheckedChange = () => {}, disabled = false, ariaLabel, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'touch-target relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-surface-muted dark:bg-border-strong',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'inline-block size-4 transform rounded-full bg-white shadow-soft-sm transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
});
