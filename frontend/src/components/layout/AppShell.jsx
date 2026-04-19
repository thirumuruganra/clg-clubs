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
    <div className="min-h-dvh bg-surface-canvas text-text-primary">
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
      <div className="flex min-h-dvh">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          {topbar}
          <main id="main-content" className="min-h-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
