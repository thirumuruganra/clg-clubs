import React, { useEffect, useRef, useState } from 'react';
import { IconButton } from '../ui/icon-button';

export default function AppTopBar({
  title,
  onOpenMenu,
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  actions,
}) {
  const desktopSearchId = 'app-topbar-search-desktop';
  const mobileSearchId = 'app-topbar-search-mobile';
  const hasSearchValue = Boolean(String(searchQuery || '').trim());
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef(null);

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileSearchInputRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  useEffect(() => {
    if (!showSearch) {
      setMobileSearchOpen(false);
    }
  }, [showSearch]);

  const clearSearch = () => {
    onSearchChange?.('');
  };

  const onSearchKeyDown = (event, isMobile = false) => {
    if (event.key !== 'Escape') return;

    if (hasSearchValue) {
      clearSearch();
      return;
    }

    if (isMobile) {
      setMobileSearchOpen(false);
      event.currentTarget.blur();
    }
  };

  return (
    <>
      <header className="relative z-30 flex items-center justify-between border-b border-border-subtle bg-surface-panel px-4 py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton ariaLabel="Open sidebar" className="lg:hidden" onClick={onOpenMenu}>
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">menu</span>
          </IconButton>
          <h1 className="truncate text-balance text-xl font-semibold text-text-primary">{title}</h1>
        </div>

        <div className="ml-3 flex min-w-0 flex-1 items-center justify-end gap-3">
          {showSearch ? (
            <>
              <label
                htmlFor={desktopSearchId}
                className="ml-3 hidden h-12 w-full max-w-xl items-stretch rounded-2xl border border-border-subtle bg-surface-muted shadow-soft-sm transition-colors hover:border-border-strong focus-within:border-border-strong focus-within:shadow-soft-md md:flex"
              >
                <div className="flex items-center justify-center pl-3.5">
                  <span className="material-symbols-outlined rounded-full bg-surface-panel p-1 text-[18px] text-text-secondary" aria-hidden="true">search</span>
                </div>
                <input
                  id={desktopSearchId}
                  aria-label={searchPlaceholder}
                  value={searchQuery}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  onKeyDown={(event) => onSearchKeyDown(event, false)}
                  className="w-full flex-1 appearance-none border-none bg-transparent px-3 text-sm font-medium text-text-primary placeholder:font-medium placeholder:text-text-secondary focus:border-none focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-none focus-visible:outline-none focus-visible:ring-0"
                  placeholder={searchPlaceholder}
                />
                <div className="mr-2 flex min-w-10 items-center justify-center self-center">
                  {hasSearchValue ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-panel hover:text-text-primary"
                      aria-label="Clear search"
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                    </button>
                  ) : (
                    <span className="hidden rounded-md bg-surface-panel px-1.5 py-0.5 text-[11px] font-semibold leading-none tracking-[0.06em] text-text-tertiary lg:inline">ESC</span>
                  )}
                </div>
              </label>

              <IconButton
                ariaLabel="Open search"
                className="md:hidden"
                onClick={() => setMobileSearchOpen(true)}
              >
                <span className="material-symbols-outlined text-[22px]" aria-hidden="true">search</span>
              </IconButton>
            </>
          ) : (
            <div className="h-10 w-0" aria-hidden="true" />
          )}

          {actions ? <div className="hidden items-center gap-2 md:flex">{actions}</div> : null}
        </div>
      </header>

      {showSearch && mobileSearchOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Search panel">
          <button
            type="button"
            className="absolute inset-0 bg-overlay-scrim"
            onClick={() => setMobileSearchOpen(false)}
            aria-label="Close search panel"
          />
          <div className="relative border-b border-border-subtle bg-surface-panel px-4 pb-4 pt-4 shadow-soft-lg">
            <label
              htmlFor={mobileSearchId}
              className="flex h-12 w-full items-stretch rounded-xl border border-border-subtle bg-surface-muted shadow-soft-sm transition-colors focus-within:border-border-strong"
            >
              <div className="flex items-center justify-center pl-3.5">
                <span className="material-symbols-outlined text-[19px] text-text-secondary" aria-hidden="true">search</span>
              </div>
              <input
                ref={mobileSearchInputRef}
                id={mobileSearchId}
                aria-label={searchPlaceholder}
                value={searchQuery}
                onChange={(event) => onSearchChange?.(event.target.value)}
                onKeyDown={(event) => onSearchKeyDown(event, true)}
                className="w-full flex-1 appearance-none border-none bg-transparent px-2.5 text-sm font-medium text-text-primary placeholder:font-medium placeholder:text-text-secondary focus:border-none focus:outline-none focus:ring-0"
                placeholder={searchPlaceholder}
              />
              {hasSearchValue ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="mr-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-panel hover:text-text-primary"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
                </button>
              ) : null}
            </label>
          </div>
        </div>
      ) : null}
    </>
  );
}
