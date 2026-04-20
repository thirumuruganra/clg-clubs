import React from 'react';
import wavcIcon from '../../assets/WAVC-edit.png';
import SidebarProfileFooter from '../layout/SidebarProfileFooter';
import SideNavShell from '../layout/SideNavShell';

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
    <SidebarProfileFooter
      name={user?.name || 'Club Admin'}
      subtitle="Club Head"
      avatarUrl={clubIconUrl}
      avatarAlt={club?.name || 'Club'}
      fallbackInitial={clubInitial}
      onProfileClick={() => navigate('/club/profile')}
      onLogout={logout}
    />
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
