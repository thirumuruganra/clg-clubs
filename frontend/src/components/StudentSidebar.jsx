import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import wavcIcon from '../assets/WAVC-edit.png';

const sideNavItems = [
  { label: 'Event', icon: 'event', path: '/student/calendar' },
  { label: 'Dashboard', icon: 'dashboard', path: '/student/dashboard' },
];

const StudentSidebar = ({ mobileMenuOpen, onClose, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 w-64 shrink-0 border-r border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22] flex flex-col overflow-hidden transition-transform duration-300 ease-in-out`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="p-4 sm:p-6 border-b border-[#e5e7eb] dark:border-[#233648]">
        <button
          type="button"
          onClick={() => handleNavigate('/student/dashboard')}
          className="flex items-center gap-3"
        >
          <div className="size-8">
            <img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <span className="text-lg font-bold truncate block">WAVC</span>
            <p className="text-xs text-[#637588] dark:text-[#92adc9]">Student Portal</p>
          </div>
        </button>
      </div>

      <nav className="shrink-0 p-3 sm:p-4 space-y-1">
        {sideNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`touch-target flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-[#637588] dark:text-[#92adc9] hover:bg-[#f0f2f4] dark:hover:bg-[#233648]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pb-4">{children}</div>

      <div
        className="mt-auto shrink-0 border-t border-[#233648] bg-white dark:bg-[#111a22] p-3 sm:p-4"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleNavigate('/student/profile')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleNavigate('/student/profile');
            }
          }}
          className="w-full text-left flex items-center gap-3 rounded-xl p-2 hover:bg-[#233648] transition-colors cursor-pointer"
        >
          {user?.picture && user.picture.trim() !== '' ? (
            <img
              src={user.picture}
              alt={user?.name || 'Student'}
              className="size-10 rounded-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
              referrerPolicy="no-referrer"
            />
          ) : null}
          <div
            className="size-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{
              background: 'linear-gradient(135deg, #137fec 0%, #0d5bab 100%)',
              display: user?.picture && user.picture.trim() !== '' ? 'none' : 'flex',
            }}
          >
            {(user?.name || 'S')[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'Student'}</p>
            <p className="text-xs text-[#637588] dark:text-[#92adc9]">Student Profile</p>
          </div>
          <button
            onClick={(event) => {
              event.stopPropagation();
              logout();
            }}
            aria-label="Sign out"
            className="touch-target w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#233648] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px] text-[#637588]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebar;
