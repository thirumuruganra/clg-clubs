import React, { useMemo, useState } from 'react';
import { IconButton } from '../ui/icon-button';

const SidebarProfileFooter = ({
  name,
  subtitle,
  avatarUrl,
  avatarAlt,
  fallbackInitial,
  onProfileClick,
  onLogout,
}) => {
  const [avatarFailed, setAvatarFailed] = useState(false);

  const normalizedAvatarUrl = useMemo(() => {
    const raw = typeof avatarUrl === 'string' ? avatarUrl.trim() : '';
    return raw;
  }, [avatarUrl]);

  const showAvatarImage = Boolean(normalizedAvatarUrl) && !avatarFailed;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-panel p-1 transition-colors hover:bg-surface-muted dark:border-border-strong dark:bg-surface-elevated">
      <button
        type="button"
        onClick={onProfileClick}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {showAvatarImage ? (
          <img
            src={normalizedAvatarUrl}
            alt={avatarAlt}
            className="size-10 rounded-full object-cover"
            onError={() => setAvatarFailed(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-primary font-bold text-white">
            {fallbackInitial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="text-xs text-text-secondary">{subtitle}</p>
        </div>
      </button>
      <IconButton ariaLabel="Sign out" onClick={onLogout}>
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">logout</span>
      </IconButton>
    </div>
  );
};

export default SidebarProfileFooter;