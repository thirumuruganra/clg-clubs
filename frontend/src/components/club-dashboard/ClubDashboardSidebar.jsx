import React from 'react';
import wavcIcon from '../../assets/WAVC-edit.png';
import SidebarProfileFooter from '../layout/SidebarProfileFooter';
import SideNavShell from '../layout/SideNavShell';
import { Dropdown } from '../ui/dropdown';

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
  isClubHead = true,
  navigate,
  logout,
  managedClubs = [],
  onSwitchClub = () => {},
}) => {
  const mappedNavItems = sideNavItems.map((item) => ({
    key: item.tab,
    label: item.label,
    icon: item.icon,
    active: activeTab === item.tab,
    tab: item.tab,
  }));

  const sidebarHeader = (
    <div className="space-y-2">
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
          {managedClubs.length > 1 ? (
            <Dropdown
              id="club-switcher"
              ariaLabel="Switch club"
              value={club?.id}
              onChange={onSwitchClub}
              options={managedClubs.map((c) => ({ value: c.id, label: c.name }))}
              buttonClassName="h-8 px-2 text-sm font-display font-bold border-primary/30"
            />
          ) : (
            <span className="block truncate font-display text-lg font-bold" title={club?.name || 'WAVC'}>
              {club?.name || 'WAVC'}
            </span>
          )}
          <p className="text-xs text-text-secondary">Operations and events</p>
        </div>
      </div>
    </div>
  );

  const sidebarBody = !isClubHead && (
    <button
      type="button"
      onClick={() => {
        navigate('/student/dashboard');
        setMobileMenuOpen(false);
      }}
      className="interactive-press touch-target flex w-full items-center gap-2 rounded-full border border-border-subtle px-4 py-2 text-left text-sm font-medium text-text-secondary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-border-strong dark:text-text-dark-secondary dark:hover:bg-border-strong"
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
      Back to Student Dashboard
    </button>
  );

  const sidebarFooter = (
    <SidebarProfileFooter
      name={user?.name || 'Club Admin'}
      subtitle={isClubHead ? 'Club Head' : 'Club Admin'}
      avatarUrl={isClubHead ? clubIconUrl : user?.picture}
      avatarAlt={isClubHead ? (club?.name || 'Club') : (user?.name || 'Student')}
      fallbackInitial={isClubHead ? clubInitial : (user?.name || 'S')[0].toUpperCase()}
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
      bodyContent={sidebarBody}
      footer={sidebarFooter}
      mobileOnly={false}
    />
  );
};

export default ClubDashboardSidebar;
