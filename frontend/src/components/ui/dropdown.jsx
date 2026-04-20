import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

export function Dropdown({
  id,
  ariaLabel,
  value,
  onChange,
  options,
  placeholder = 'Select',
  disabled = false,
  className,
  buttonClassName,
  menuClassName,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const normalizedOptions = useMemo(() => {
    return (options || []).map((option) => {
      if (typeof option === 'string') {
        return { value: option, label: option, disabled: false };
      }
      return {
        value: String(option.value ?? ''),
        label: option.label ?? String(option.value ?? ''),
        disabled: Boolean(option.disabled),
      };
    });
  }, [options]);

  const normalizedValue = String(value ?? '');
  const selectedOption = normalizedOptions.find((option) => option.value === normalizedValue);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={cn(
          'inline-flex h-10 w-full items-center justify-between rounded-xl border border-primary/50 bg-surface-panel px-3 text-left text-sm font-semibold text-text-primary shadow-soft-sm transition-colors hover:border-primary/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-surface-elevated dark:text-white',
          buttonClassName,
        )}
      >
        <span className={cn('truncate', selectedOption ? 'text-text-primary dark:text-white' : 'text-text-secondary dark:text-text-dark-secondary')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className={cn('material-symbols-outlined text-[18px] text-text-secondary transition-transform dark:text-text-dark-secondary', open ? 'rotate-180' : '')}>
          expand_more
        </span>
      </button>

      {open ? (
        <div className={cn('absolute left-0 top-full z-80 mt-1 w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-panel shadow-soft-lg dark:border-border-strong dark:bg-surface-elevated', menuClassName)}>
          <ul role="listbox" aria-labelledby={id} className="max-h-56 overflow-y-auto py-1">
            {normalizedOptions.map((option) => (
              <li key={option.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={normalizedValue === option.value}
                  disabled={option.disabled}
                  onClick={() => {
                    if (option.disabled) return;
                    onChange?.(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center px-3 py-2 text-left text-sm font-medium transition-colors',
                    normalizedValue === option.value
                      ? 'bg-primary/18 text-primary dark:bg-primary/25'
                      : 'text-text-primary hover:bg-surface-muted dark:text-white dark:hover:bg-border-strong/55',
                    option.disabled && 'cursor-not-allowed opacity-55',
                  )}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
