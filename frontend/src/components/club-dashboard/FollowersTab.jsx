import React, { useMemo, useState } from 'react';
import { SearchBar } from '../ui/search-bar';
import { RosterTable } from '../ui/roster-table';

const FollowersTab = ({ followers, followersLoading, followersError, calculateYear }) => {
  const [query, setQuery] = useState('');

  const filteredFollowers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return followers;
    return followers.filter((follower) =>
      [follower.name, follower.email, follower.department, follower.register_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [followers, query]);

  const visibleCount = filteredFollowers.length;

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7 xl:p-8">
      <div className="dashboard-hero enter-rise-settle mb-6 p-4 sm:mb-8 sm:p-6 lg:p-7">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="kicker-label border-white/28 bg-white/10 text-white">Community Pulse</span>
            <h1 className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl">Followers</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/82 sm:text-base">Students who follow your club and stay updated on events.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="rounded-xl border border-white/15 bg-black/24 px-3 py-2 text-center text-white backdrop-blur-sm sm:px-4 sm:py-3">
              <p className="font-display text-xl font-bold leading-none sm:text-2xl">{followers.length}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/75">Total</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-black/24 px-3 py-2 text-center text-white backdrop-blur-sm sm:px-4 sm:py-3">
              <p className="font-display text-xl font-bold leading-none sm:text-2xl">{visibleCount}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/75">Visible</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search followers"
        />
      </div>

      {followersError && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{followersError}</p>
      )}

      <div className="table-scroll overflow-hidden rounded-xl border border-border-subtle bg-surface-panel shadow-soft-sm dark:border-border-strong dark:bg-surface-elevated">
        {followersLoading ? (
          <div className="px-4 py-10 text-sm text-text-secondary dark:text-text-dark-secondary">Loading followers...</div>
        ) : (
          <RosterTable
            rows={filteredFollowers}
            calculateYear={calculateYear}
            emptyMessage="No followers match your search."
          />
        )}
      </div>
    </div>
  );
};

export default FollowersTab;
