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

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Followers</h1>
          <p className="mt-1 text-[#637588] dark:text-[#92adc9]">Students who follow your club.</p>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 dark:border-[#233648] dark:bg-[#1a2632]">
          <p className="text-xs uppercase tracking-wide text-[#637588] dark:text-[#92adc9]">Total Followers</p>
          <p className="mt-1 text-2xl font-bold">{followers.length}</p>
        </div>
      </div>

      <label className="mb-4 flex h-10 max-w-md items-stretch rounded-xl bg-[#f0f2f4] dark:bg-[#233648]">
        <div className="flex items-center justify-center pl-3">
          <span className="material-symbols-outlined text-[18px] text-[#637588]">search</span>
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search followers"
          className="w-full flex-1 border-none bg-transparent px-2 text-sm text-[#111418] placeholder:text-[#637588] focus:outline-none dark:text-white"
        />
      </label>

      {followersError && (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{followersError}</p>
      )}

      <div className="table-scroll overflow-hidden rounded-xl border border-[#e5e7eb] bg-white dark:border-[#233648] dark:bg-[#1a2632]">
        {followersLoading ? (
          <div className="px-4 py-10 text-sm text-[#637588] dark:text-[#92adc9]">Loading followers...</div>
        ) : filteredFollowers.length === 0 ? (
          <div className="px-4 py-10 text-sm text-[#637588] dark:text-[#92adc9]">No followers match your search.</div>
        ) : (
          <table className="w-full min-w-180">
            <thead>
              <tr className="border-b border-[#e5e7eb] dark:border-[#233648]">
                {['Student', 'Email', 'Department', 'Year', 'Register No'].map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9]">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFollowers.map((follower) => {
                const followerInitial = (follower.name || follower.email || '?').charAt(0).toUpperCase();

                return (
                  <tr key={follower.id} className="border-b border-[#e5e7eb] transition-colors hover:bg-[#f9fafb] dark:border-[#233648] dark:hover:bg-[#233648]/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {follower.picture ? (
                          <img src={follower.picture} alt={follower.name || 'Follower'} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{followerInitial}</div>
                        )}
                        <span className="text-sm font-semibold">{follower.name || 'Unnamed student'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#637588] dark:text-[#92adc9]">{follower.email || '-'}</td>
                    <td className="px-4 py-3 text-sm">{follower.department || '-'}</td>
                    <td className="px-4 py-3 text-sm">{calculateYear(follower.batch, follower.degree, follower.register_number)}</td>
                    <td className="px-4 py-3 text-sm">{follower.register_number || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default FollowersTab;
