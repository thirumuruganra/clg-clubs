import React from 'react';
import AppTopBar from '../layout/AppTopBar';

const tabTitles = {
  dashboard: 'Event Management',
  followers: 'Followers',
  events: 'Event Calendar',
  'create-event': 'Create Event',
};

const ClubDashboardTopBar = ({ activeTab, setMobileMenuOpen, searchQuery, setSearchQuery }) => {
  const showSearch = activeTab !== 'create-event';

  return (
    <AppTopBar
      title={tabTitles[activeTab] || 'Club Dashboard'}
      onOpenMenu={() => setMobileMenuOpen(true)}
      showSearch={showSearch}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search events or followers..."
    />
  );
};

export default ClubDashboardTopBar;
