import React, { useMemo, useState } from 'react';

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
      <div className="dashboard-hero enter-rise mb-6 p-4 sm:mb-8 sm:p-6 lg:p-7">
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

      <div className="feature-card mb-4 p-3 sm:p-4">
        <label className="flex h-10 items-stretch rounded-xl border border-border-subtle bg-surface-muted/65 dark:border-border-strong dark:bg-border-strong/40">
          <div className="flex items-center justify-center pl-3">
            <span className="material-symbols-outlined text-[18px] text-text-secondary">search</span>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search followers"
            className="w-full flex-1 border-none bg-transparent px-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none dark:text-white"
          />
        </label>
      </div>

      {followersError && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{followersError}</p>
      )}

      <div className="table-scroll overflow-hidden rounded-xl border border-border-subtle bg-surface-panel shadow-soft-sm dark:border-border-strong dark:bg-surface-elevated">
        {followersLoading ? (
          <div className="px-4 py-10 text-sm text-text-secondary dark:text-text-dark-secondary">Loading followers...</div>
        ) : filteredFollowers.length === 0 ? (
          <div className="px-4 py-10 text-sm text-text-secondary dark:text-text-dark-secondary">No followers match your search.</div>
        ) : (
          <>
            <div className="space-y-3 p-3 md:hidden">
              {filteredFollowers.map((follower) => {
                const followerInitial = (follower.name || follower.email || '?').charAt(0).toUpperCase();
                return (
                  <article key={follower.id} className="rounded-xl border border-border-subtle bg-surface-panel p-3 shadow-soft-sm dark:border-border-strong dark:bg-surface-canvas/65">
                    <div className="flex items-center gap-3">
                      {follower.picture ? (
                        <img src={follower.picture} alt={follower.name || 'Follower'} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{followerInitial}</div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold" title={follower.name || 'Unnamed student'}>{follower.name || 'Unnamed student'}</p>
                        <p className="truncate text-xs text-text-secondary dark:text-text-dark-secondary" title={follower.email || '-'}>{follower.email || '-'}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Dept</p>
                        <p className="mt-1 truncate font-semibold">{follower.department || '-'}</p>
                      </div>
                      <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Year</p>
                        <p className="mt-1 font-semibold">{calculateYear(follower.batch, follower.degree, follower.register_number)}</p>
                      </div>
                      <div className="rounded-lg bg-surface-muted px-2 py-1.5 dark:bg-border-strong/55">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Reg No</p>
                        <p className="mt-1 truncate font-semibold" title={follower.register_number || '-'}>{follower.register_number || '-'}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden md:block">
              <table className="w-full min-w-176 table-fixed">
                <colgroup>
                  <col className="w-[28%]" />
                  <col className="w-[30%]" />
                  <col className="w-[18%]" />
                  <col className="w-[10%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="bg-surface-muted dark:bg-border-strong/55">
                  <tr className="border-b border-border-subtle dark:border-border-strong">
                    {['Student', 'Email', 'Department', 'Year', 'Register No'].map((header) => (
                      <th key={header} className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-text-secondary dark:text-text-dark-secondary">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredFollowers.map((follower) => {
                    const followerInitial = (follower.name || follower.email || '?').charAt(0).toUpperCase();

                    return (
                      <tr key={follower.id} className="border-b border-border-subtle transition-colors hover:bg-surface-muted dark:border-border-strong dark:hover:bg-border-strong/50">
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            {follower.picture ? (
                              <img src={follower.picture} alt={follower.name || 'Follower'} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{followerInitial}</div>
                            )}
                            <span className="block truncate text-sm font-semibold" title={follower.name || 'Unnamed student'}>{follower.name || 'Unnamed student'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle text-sm text-text-secondary dark:text-text-dark-secondary">
                          <span className="block truncate" title={follower.email || '-'}>{follower.email || '-'}</span>
                        </td>
                        <td className="px-5 py-4 align-middle text-sm">{follower.department || '-'}</td>
                        <td className="px-5 py-4 align-middle text-sm">{calculateYear(follower.batch, follower.degree, follower.register_number)}</td>
                        <td className="px-5 py-4 align-middle text-sm">
                          <span className="block truncate" title={follower.register_number || '-'}>{follower.register_number || '-'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FollowersTab;
