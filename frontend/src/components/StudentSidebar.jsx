import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import wavcIcon from '../assets/WAVC-edit.png';
import SideNavShell from './layout/SideNavShell';
import { IconButton } from './ui/icon-button';

const sideNavItems = [
  { label: 'Event', icon: 'event', path: '/student/calendar' },
  { label: 'Dashboard', icon: 'dashboard', path: '/student/dashboard' },
  { label: 'Explore All Clubs', icon: 'groups', path: '/student/clubs' },
];

const StudentSidebar = ({ mobileMenuOpen, onClose, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAvatarError = (event) => {
    event.currentTarget.style.display = 'none';
    const fallback = event.currentTarget.parentElement?.querySelector('[data-avatar-fallback="student"]');
    if (fallback) fallback.style.display = 'flex';
  };

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
    <div className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-surface-muted">
      <button
        type="button"
        onClick={() => handleNavigate('/student/profile')}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {user?.picture && user.picture.trim() !== '' ? (
          <img
            src={user.picture}
            alt={user?.name || 'Student'}
            className="size-10 rounded-full object-cover"
            onError={handleAvatarError}
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div
          data-avatar-fallback="student"
          className="flex size-10 items-center justify-center rounded-full bg-primary font-bold text-white"
          style={{ display: user?.picture && user.picture.trim() !== '' ? 'none' : 'flex' }}
        >
          {(user?.name || 'S')[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user?.name || 'Student'}</p>
          <p className="text-xs text-text-secondary">Student Profile</p>
        </div>
      </button>
      <IconButton ariaLabel="Sign out" onClick={logout}>
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
      </IconButton>
    </div>
  );

  return (
    <SideNavShell
      ariaLabel="Student navigation"
      mobileMenuOpen={mobileMenuOpen}
      navItems={mappedNavItems}
      onNavSelect={(item) => handleNavigate(item.path)}
      header={sidebarHeader}
      bodyContent={children}
      footer={sidebarFooter}
    />
  );
};

export default StudentSidebar;
