import React from 'react';
import wavcIcon from '../../assets/WAVC-edit.png';
import { cn } from '../../lib/utils';

const ClubDashboardSidebar = ({
  mobileMenuOpen,
  sideNavItems,
  activeTab,
  setActiveTab,
  club,
  clubIconUrl,
  clubInitial,
  user,
  navigate,
  logout,
}) => {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 w-64 shrink-0 border-r border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="p-4 sm:p-6 border-b border-[#e5e7eb] dark:border-[#233648]">
        <div className="flex items-center gap-3 mb-1">
          {clubIconUrl ? (
            <div className="size-10 rounded-full overflow-hidden shrink-0 border border-primary/20 bg-primary/5 flex items-center justify-center">
              <img src={clubIconUrl} alt={club?.name || 'Club'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="size-8"><img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" /></div>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-lg font-bold truncate block" title={club?.name || 'WAVC'}>
              {club?.name || 'WAVC'}
            </span>
            <p className="text-xs text-[#637588] dark:text-[#92adc9]">Club Admin Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3 sm:p-4 space-y-1">
        {sideNavItems.map((item) => (
          <button
            key={item.tab}
            onClick={() => setActiveTab(item.tab)}
            className={cn(
              'touch-target flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
              activeTab === item.tab
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-[#637588] dark:text-[#92adc9] hover:bg-[#f0f2f4] dark:hover:bg-[#233648]',
            )}
          >
            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto shrink-0 border-t border-[#233648] bg-white dark:bg-[#111a22] p-3 sm:p-4" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/club/profile')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              navigate('/club/profile');
            }
          }}
          className="w-full text-left flex items-center gap-3 rounded-xl p-2 hover:bg-[#233648] transition-colors cursor-pointer"
        >
          {clubIconUrl ? (
            <img
              src={clubIconUrl}
              alt={club?.name || 'Club'}
              className="size-10 rounded-full object-cover"
              onError={(event) => {
                event.target.style.display = 'none';
                event.target.nextSibling.style.display = 'flex';
              }}
              referrerPolicy="no-referrer"
            />
          ) : null}
          <div className="size-10 rounded-full flex items-center justify-center bg-primary text-white font-bold" style={{ display: clubIconUrl ? 'none' : 'flex' }}>
            {clubInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-[#637588] dark:text-[#92adc9]">Head Administrator</p>
          </div>
          <button onClick={(event) => { event.stopPropagation(); logout(); }} aria-label="Sign out" className="touch-target w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#233648] transition-colors">
            <span className="material-symbols-outlined text-[20px] text-[#637588]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ClubDashboardSidebar;
