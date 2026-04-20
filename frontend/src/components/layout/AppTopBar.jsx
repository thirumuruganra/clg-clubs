import React, { useEffect, useRef, useState } from 'react';
import { IconButton } from '../ui/icon-button';
import { SearchBar } from '../ui/search-bar';

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
  const isMobileSearchVisible = showSearch && mobileSearchOpen;

  useEffect(() => {
    if (isMobileSearchVisible) {
      mobileSearchInputRef.current?.focus();
    }
  }, [isMobileSearchVisible]);

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
              <div className="hidden md:flex md:w-full md:max-w-xl md:ml-3">
                <SearchBar
                  id={desktopSearchId}
                  value={searchQuery}
                  onChange={onSearchChange}
                  onKeyDown={(event) => onSearchKeyDown(event, false)}
                  placeholder={searchPlaceholder}
                  showEscHint
                  escHintClassName="hidden lg:inline"
                />
              </div>

              <IconButton
                ariaLabel="Open search"
                className="md:hidden"
                onClick={() => setMobileSearchOpen(true)}
              >
                <span className="material-symbols-outlined text-subheading" aria-hidden="true">search</span>
              </IconButton>
            </>
          ) : (
            <div className="h-10 w-0" aria-hidden="true" />
          )}

          {actions ? <div className="hidden items-center gap-2 md:flex">{actions}</div> : null}
        </div>
      </header>

      {isMobileSearchVisible ? (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Search panel">
          <button
            type="button"
            className="absolute inset-0 bg-overlay-scrim"
            onClick={() => setMobileSearchOpen(false)}
            aria-label="Close search panel"
          />
          <div className="relative border-b border-border-subtle bg-surface-panel px-4 pb-4 pt-4 shadow-soft-lg">
            <SearchBar
              inputRef={mobileSearchInputRef}
              id={mobileSearchId}
              value={searchQuery}
              onChange={onSearchChange}
              onKeyDown={(event) => onSearchKeyDown(event, true)}
              placeholder={searchPlaceholder}
              className="rounded-xl"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
