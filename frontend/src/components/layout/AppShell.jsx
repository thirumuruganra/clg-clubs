import React, { useEffect } from 'react';

export default function AppShell({ sidebar, topbar, mobileMenuOpen = false, onCloseMenu, children }) {
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <div className="h-dvh overflow-hidden bg-surface-canvas text-text-primary">
      <a
        href="#main-content"
        className="sr-only z-100 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      {mobileMenuOpen ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          className="fixed inset-0 z-900 bg-black/40 lg:hidden"
          onClick={onCloseMenu}
        />
      ) : null}
      <div className="flex h-full min-h-0">
        {sidebar}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {topbar}
          <main id="main-content" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
