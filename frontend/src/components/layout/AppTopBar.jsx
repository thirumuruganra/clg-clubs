import React from 'react';
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

  return (
    <header className="flex items-center justify-between border-b border-border-subtle bg-surface-panel px-4 py-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton ariaLabel="Open sidebar" className="lg:hidden" onClick={onOpenMenu}>
          <span className="material-symbols-outlined text-[24px]" aria-hidden="true">menu</span>
        </IconButton>
        <h1 className="truncate text-balance text-lg font-bold text-text-primary">{title}</h1>
      </div>

      <div className="ml-3 flex min-w-0 flex-1 items-center justify-end gap-3">
        {showSearch ? (
          <>
          <label htmlFor={desktopSearchId} className="ml-3 hidden h-11 w-full max-w-md items-stretch rounded-xl bg-surface-muted md:flex">
            <div className="flex items-center justify-center pl-4">
              <span className="material-symbols-outlined text-[20px] text-text-secondary" aria-hidden="true">search</span>
            </div>
            <input
              id={desktopSearchId}
              aria-label={searchPlaceholder}
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              className="w-full flex-1 border-none bg-transparent px-3 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
              placeholder={searchPlaceholder}
            />
          </label>
          <label htmlFor={mobileSearchId} className="ml-3 flex h-11 w-full max-w-xs items-stretch rounded-xl bg-surface-muted md:hidden">
            <div className="flex items-center justify-center pl-3">
              <span className="material-symbols-outlined text-[18px] text-text-secondary" aria-hidden="true">search</span>
            </div>
            <input
              id={mobileSearchId}
              aria-label={searchPlaceholder}
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              className="w-full flex-1 border-none bg-transparent px-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
              placeholder="Search"
            />
          </label>
          </>
        ) : (
          <div className="h-10 w-0" aria-hidden="true" />
        )}
        {actions ? <div className="hidden items-center gap-2 md:flex">{actions}</div> : null}
      </div>
    </header>
  );
}
