import React from 'react';
import { cn } from '../../lib/utils';

export default function SideNavShell({
  ariaLabel,
  mobileMenuOpen,
  onNavSelect,
  navItems,
  header,
  bodyContent,
  footer,
  showDesktopSpacer = true,
  widthClass = 'w-64',
  mobileOnly = false,
}) {
  const navClassName = bodyContent
    ? 'shrink-0 p-3 sm:p-4 space-y-1'
    : 'flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 sm:p-4 space-y-1';

  return (
    <>
      {showDesktopSpacer ? <div className={cn('hidden lg:block shrink-0', widthClass)} aria-hidden="true" /> : null}
      <aside
        aria-label={ariaLabel}
        className={cn(
          'fixed inset-y-0 left-0 z-1000 isolate transform border-r border-border-subtle bg-surface-panel flex flex-col overflow-hidden transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
          mobileOnly ? 'lg:-translate-x-full' : 'lg:translate-x-0',
          widthClass,
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {header ? <div className="border-b border-border-subtle p-4 sm:p-6">{header}</div> : null}

        <nav className={navClassName}>
          {navItems.map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={() => onNavSelect(item)}
              className={cn(
                'touch-target flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                item.active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-secondary hover:bg-surface-muted',
              )}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        {bodyContent ? <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pb-4">{bodyContent}</div> : null}

        {footer ? (
          <div className="mt-auto shrink-0 border-t border-border-subtle bg-surface-panel p-3 sm:p-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        ) : null}
      </aside>
    </>
  );
}
