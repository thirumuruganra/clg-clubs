import React from 'react';

const tabTitles = {
  dashboard: 'Overview',
  followers: 'Followers',
  events: 'Event Management',
  'create-event': 'Create Event',
};

const ClubDashboardTopBar = ({ activeTab, setMobileMenuOpen, searchQuery, setSearchQuery }) => {
  const showSearch = activeTab !== 'create-event';

  return (
    <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-4 py-4 dark:border-[#233648] dark:bg-[#111a22] lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <button
          aria-label="Open sidebar"
          className="h-10 w-10 lg:hidden rounded-full transition-colors hover:bg-[#f0f2f4] dark:hover:bg-[#233648]"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
        <h1 className="truncate text-lg font-bold text-[#111418] dark:text-white">{tabTitles[activeTab] || 'Club Dashboard'}</h1>
      </div>

      {showSearch ? (
        <>
          <label className="ml-3 hidden h-10 w-full max-w-md items-stretch rounded-xl bg-[#f0f2f4] dark:bg-[#233648] md:flex">
            <div className="flex items-center justify-center pl-4">
              <span className="material-symbols-outlined text-[20px] text-[#637588]">search</span>
            </div>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full flex-1 border-none bg-transparent px-3 text-sm text-[#111418] placeholder:text-[#637588] focus:outline-none dark:text-white"
              placeholder="Search events or followers..."
            />
          </label>
          <label className="ml-3 flex h-10 w-full max-w-xs items-stretch rounded-xl bg-[#f0f2f4] dark:bg-[#233648] md:hidden">
            <div className="flex items-center justify-center pl-3">
              <span className="material-symbols-outlined text-[18px] text-[#637588]">search</span>
            </div>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full flex-1 border-none bg-transparent px-2 text-sm text-[#111418] placeholder:text-[#637588] focus:outline-none dark:text-white"
              placeholder="Search"
            />
          </label>
        </>
      ) : (
        <div className="h-10 w-0" aria-hidden="true"></div>
      )}
    </div>
  );
};

export default ClubDashboardTopBar;
