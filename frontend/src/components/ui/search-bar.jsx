import React from 'react';
import { cn } from '../../lib/utils';

export function SearchBar({
  id,
  type = 'text',
  name,
  value,
  onChange,
  placeholder = 'Search',
  ariaLabel,
  ariaAutocomplete,
  ariaExpanded,
  className,
  inputClassName,
  iconClassName,
  showEscHint = false,
  escHintClassName,
  clearAriaLabel = 'Clear search',
  onKeyDown,
  onFocus,
  onBlur,
  autoComplete,
  inputRef,
}) {
  const hasValue = Boolean(String(value || '').trim());

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex h-12 w-full items-stretch rounded-2xl border border-border-subtle bg-surface-muted shadow-soft-sm transition-colors hover:border-border-strong focus-within:border-border-strong focus-within:shadow-soft-md',
        className,
      )}
    >
      <div className="flex items-center justify-center pl-3.5">
        <span className={cn('material-symbols-outlined rounded-full bg-surface-panel p-1 text-[18px] text-text-secondary', iconClassName)} aria-hidden="true">search</span>
      </div>
      <input
        ref={inputRef}
        id={id}
        type={type}
        name={name}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        aria-autocomplete={ariaAutocomplete}
        aria-expanded={ariaExpanded}
        className={cn('w-full flex-1 appearance-none border-none bg-transparent px-3 text-sm font-medium text-text-primary placeholder:font-medium placeholder:text-text-secondary focus:border-none focus:outline-none focus:ring-0 focus-visible:border-none focus-visible:outline-none focus-visible:ring-0 dark:text-white dark:placeholder:text-text-dark-secondary', inputClassName)}
      />
      <div className="mr-2 flex min-w-10 items-center justify-center self-center">
        {hasValue ? (
          <button
            type="button"
            onClick={() => onChange?.('')}
            className="interactive-press inline-flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-panel hover:text-text-primary"
            aria-label={clearAriaLabel}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
          </button>
        ) : showEscHint ? (
          <span className={cn('rounded-md bg-surface-panel px-1.5 py-0.5 text-[11px] font-semibold leading-none tracking-[0.06em] text-text-tertiary', escHintClassName)}>ESC</span>
        ) : null}
      </div>
    </label>
  );
}
