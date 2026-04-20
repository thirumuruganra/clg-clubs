import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth-context';
import wavcIcon from '../../assets/WAVC-edit.png';
import SidebarProfileFooter from '../layout/SidebarProfileFooter';
import SideNavShell from '../layout/SideNavShell';

const sideNavItems = [
  { label: 'Event', icon: 'event', path: '/student/calendar' },
  { label: 'Dashboard', icon: 'dashboard', path: '/student/dashboard' },
  { label: 'Explore All Clubs', icon: 'groups', path: '/student/clubs' },
];

const StudentSidebar = ({ mobileMenuOpen, onClose, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const mappedNavItems = sideNavItems.map((item) => ({
    key: item.path,
    label: item.label,
    icon: item.icon,
    active: location.pathname === item.path,
    path: item.path,
  }));

  const sidebarHeader = (
    <button
      type="button"
      onClick={() => handleNavigate('/student/dashboard')}
      className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="size-8">
        <img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <span className="block truncate text-lg font-bold">WAVC</span>
        <p className="text-xs text-text-secondary">Student Portal</p>
      </div>
    </button>
  );

  const sidebarFooter = (
    <SidebarProfileFooter
      name={user?.name || 'Student'}
      subtitle="Student"
      avatarUrl={user?.picture || ''}
      avatarAlt={user?.name || 'Student'}
      fallbackInitial={(user?.name || 'S')[0].toUpperCase()}
      onProfileClick={() => handleNavigate('/student/profile')}
      onLogout={logout}
    />
  );

  return (
    <SideNavShell
      ariaLabel="Student navigation"
      mobileMenuOpen={mobileMenuOpen}
      navItems={mappedNavItems}
      onNavSelect={(item) => handleNavigate(item.path)}
      header={sidebarHeader}
      headerClassName="lg:flex lg:min-h-20 lg:items-center lg:py-4"
      bodyContent={children}
      footer={sidebarFooter}
    />
  );
};

export default StudentSidebar;