import React from 'react';
import wavcIcon from '../../assets/WAVC-edit.png';
import SideNavShell from '../layout/SideNavShell';
import { IconButton } from '../ui/icon-button';

const ClubDashboardSidebar = ({
  mobileMenuOpen,
  sideNavItems,
  activeTab,
  setActiveTab,
  setMobileMenuOpen,
  club,
  clubIconUrl,
  clubInitial,
  user,
  navigate,
  logout,
}) => {
  const handleAvatarError = (event) => {
    event.currentTarget.style.display = 'none';
    const fallback = event.currentTarget.parentElement?.querySelector('[data-avatar-fallback="club-admin"]');
    if (fallback) fallback.style.display = 'flex';
  };

  const mappedNavItems = sideNavItems.map((item) => ({
    key: item.tab,
    label: item.label,
    icon: item.icon,
    active: activeTab === item.tab,
    tab: item.tab,
  }));

  const sidebarHeader = (
    <div className="aura-panel mb-1 flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-panel p-3 shadow-soft-sm dark:border-border-strong dark:bg-surface-elevated">
      {clubIconUrl ? (
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-primary/10">
          <img src={clubIconUrl} alt={club?.name || 'Club'} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        </div>
      ) : (
        <div className="size-8"><img src={wavcIcon} alt="WAVC" className="h-full w-full object-contain" /></div>
      )}
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary">Club Admin Portal</p>
        <span className="block truncate font-display text-lg font-bold" title={club?.name || 'WAVC'}>
          {club?.name || 'WAVC'}
        </span>
        <p className="text-xs text-text-secondary">Operations and events</p>
      </div>
    </div>
  );

  const sidebarFooter = (
    <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-panel p-1 transition-colors hover:bg-surface-muted dark:border-border-strong dark:bg-surface-elevated">
      <button
        type="button"
        onClick={() => navigate('/club/profile')}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {clubIconUrl ? (
          <img
            src={clubIconUrl}
            alt={club?.name || 'Club'}
            className="size-10 rounded-full object-cover"
            onError={handleAvatarError}
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div
          data-avatar-fallback="club-admin"
          className="flex size-10 items-center justify-center rounded-full bg-primary font-bold text-white"
          style={{ display: clubIconUrl ? 'none' : 'flex' }}
        >
          {clubInitial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-text-secondary">Head Administrator</p>
        </div>
      </button>
      <IconButton ariaLabel="Sign out" onClick={logout}>
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
      </IconButton>
    </div>
  );

  return (
    <SideNavShell
      ariaLabel="Club dashboard navigation"
      mobileMenuOpen={mobileMenuOpen}
      navItems={mappedNavItems}
      onNavSelect={(item) => {
        setActiveTab(item.tab);
        setMobileMenuOpen(false);
      }}
      header={sidebarHeader}
      footer={sidebarFooter}
      mobileOnly={false}
    />
  );
};

export default ClubDashboardSidebar;
