import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import wavcIcon from '../assets/WAVC-edit.png';
import { getClubIconUrl, getClubInitial } from '../lib/utils';

const API = '';

const Clubs = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [pictureError, setPictureError] = useState(false);
  const [followError, setFollowError] = useState('');

  const fetchClubs = useCallback(async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`${API}/api/clubs/?user_id=${user.id}`);
      if (res.ok) setClubs(await res.json());
    } catch (err) { console.error('Error fetching clubs:', err); }
    finally { setLoadingClubs(false); }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) { navigate('/login'); return; }
    if (user && (!user.batch || !user.department || !user.degree)) { navigate('/student/profile'); return; }
    if (user) void fetchClubs();
  }, [user, loading, navigate, fetchClubs]);

  const handleFollow = async (e, clubId) => {
    e.stopPropagation();
    setFollowError('');
    try {
      const res = await fetch(`${API}/api/follow/clubs/${clubId}/follow`, { method: 'POST' });
      if (res.ok) fetchClubs();
      else {
        const data = await res.json();
        setFollowError(data.detail || 'Could not follow this club right now.');
      }
    } catch (err) {
      console.error(err);
      setFollowError('Unable to follow this club right now.');
    }
  };

  const handleUnfollow = async (e, clubId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API}/api/follow/clubs/${clubId}/follow`, { method: 'DELETE' });
      if (res.ok) fetchClubs();
    } catch (err) { console.error(err); }
  };

  const openInstagram = (club) => {
    if (club.instagram_handle) {
      const handle = club.instagram_handle.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '');
      window.open(`https://www.instagram.com/${handle}`, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) return (
    <div className="min-h-dvh flex items-center justify-center bg-background-light dark:bg-background-dark">
      <div className="animate-pulse text-white text-lg">Loading...</div>
    </div>
  );

  const name = user?.name || 'Student';
  const role = user?.role || 'STUDENT';
  const picture = user?.picture;
  const hasValidPicture = picture && picture.trim() !== '' && !pictureError;

  const filteredClubs = clubs.filter(club => {
    if (categoryFilter === 'tech' && club.category !== 'TECH') return false;
    if (categoryFilter === 'nontech' && club.category !== 'NON_TECH') return false;
    if (categoryFilter === 'following' && !club.is_following) return false;
    if (searchQuery && !club.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const followingCount = clubs.filter(c => c.is_following).length;
  const techCount = clubs.filter(c => c.category === 'TECH').length;
  const nonTechCount = clubs.filter(c => c.category === 'NON_TECH').length;

  return (
    <div className="relative flex h-auto min-h-dvh w-full flex-col bg-background-light dark:bg-background-dark font-display overflow-x-hidden text-slate-900 dark:text-white">
      <div className="layout-container flex h-full grow flex-col">
        {/* Header */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#e5e7eb] dark:border-[#233648] px-4 md:px-10 py-3 bg-white dark:bg-[#111a22]">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-4 text-[#111418] dark:text-white cursor-pointer" onClick={() => navigate('/student/dashboard')}>
              <div className="size-8 text-primary flex items-center justify-center">
                <img src={wavcIcon} alt="WAVC Logo" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">WAVC</h2>
            </div>
            <label className="hidden md:flex flex-col min-w-40 h-10! max-w-64">
              <div className="flex w-full flex-1 items-stretch rounded-xl h-full">
                <div className="text-[#637588] dark:text-[#92adc9] flex border-none bg-[#f0f2f4] dark:bg-[#233648] items-center justify-center pl-4 rounded-l-xl">
                  <span className="material-symbols-outlined text-[24px]">search</span>
                </div>
                <input
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl text-[#111418] dark:text-white focus:outline-0 focus:ring-0 border-none bg-[#f0f2f4] dark:bg-[#233648] h-full placeholder:text-[#637588] dark:placeholder:text-[#92adc9] px-4 rounded-l-none pl-2 text-base font-normal"
                  placeholder="Search clubs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </label>
          </div>
          <div className="flex flex-1 justify-end gap-4 md:gap-8">
            <div className="hidden md:flex items-center gap-9">
              <a className="text-[#111418] dark:text-white text-sm font-medium hover:text-primary transition-colors" href="/student/dashboard">Student Dashboard</a>
              <a className="text-primary text-sm font-medium" href="/student/clubs">Clubs</a>
              <a className="text-[#111418] dark:text-white text-sm font-medium hover:text-primary transition-colors" href="/student/calendar">Events</a>
              {role === 'CLUB_ADMIN' && (
                <a className="text-[#111418] dark:text-white text-sm font-medium hover:text-primary transition-colors" href="/club/dashboard">Club Dashboard</a>
              )}
            </div>
            <button aria-label="Go to profile" onClick={() => navigate('/student/profile')} className="focus:outline-none transition-transform active:scale-95">
              {hasValidPicture ? (
                <img
                  src={picture}
                  alt={name}
                  className="size-10 rounded-full ring-2 ring-white/10 object-cover"
                  onError={() => setPictureError(true)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="size-10 rounded-full ring-2 ring-white/10 flex items-center justify-center font-bold text-lg text-white" style={{ background: 'linear-gradient(135deg, #137fec 0%, #0d5bab 100%)' }}>
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 md:px-10 lg:px-40 flex flex-1 justify-center py-8">
          <div className="layout-content-container flex flex-col max-w-240 flex-1">
            {/* Page Title */}
            <div className="pb-3 pt-6 px-4">
              <h1 className="text-[#111418] dark:text-white text-[32px] font-bold leading-tight">Clubs</h1>
              <p className="text-[#637588] dark:text-[#92adc9] text-base mt-2">
                Discover and follow clubs. Click on a club to visit their Instagram.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 mt-4">
              {[
                { label: 'Total Clubs', value: clubs.length, icon: 'groups' },
                { label: 'Following', value: followingCount, icon: 'favorite' },
                { label: 'Tech Clubs', value: techCount, icon: 'computer' },
                { label: 'Non-Tech', value: nonTechCount, icon: 'palette' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-[#1a2632] rounded-xl p-4 border border-[#e5e7eb] dark:border-[#233648]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">{stat.icon}</span>
                    <span className="text-xs text-[#637588] dark:text-[#92adc9] font-medium">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-[#111418] dark:text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Category Filters */}
            <div className="flex items-center gap-2 px-4 mt-6 mb-4 flex-wrap">
              {[
                { label: 'All Clubs', value: 'all' },
                { label: 'Following', value: 'following' },
                { label: 'Tech', value: 'tech' },
                { label: 'Non-Tech', value: 'nontech' },
              ].map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    categoryFilter === cat.value
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-white dark:bg-[#1a2632] text-[#637588] dark:text-[#92adc9] border border-[#e5e7eb] dark:border-[#233648] hover:border-primary/50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              {/* Mobile search */}
              <div className="md:hidden flex-1 min-w-30">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] text-sm text-[#111418] dark:text-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
            {followError && <p className="mx-4 mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{followError}</p>}

            {/* Clubs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 pb-8">
              {loadingClubs && (
                <p className="text-[#637588] dark:text-[#92adc9] text-sm col-span-3 italic">Loading clubs...</p>
              )}
              {!loadingClubs && filteredClubs.length === 0 && (
                <p className="text-[#637588] dark:text-[#92adc9] text-sm col-span-3 italic">No clubs found.</p>
              )}
              {filteredClubs.map((club) => {
                const clubIconUrl = getClubIconUrl(club);

                return (
                <div
                  key={club.id}
                  onClick={() => openInstagram(club)}
                  className={`group relative flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#1a2632] border border-[#e5e7eb] dark:border-[#233648] transition-all hover:shadow-lg hover:border-primary/30 ${club.instagram_handle ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  {/* Club logo */}
                  <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                    {clubIconUrl ? (
                      <img src={clubIconUrl} alt={club.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-primary font-bold text-lg">{getClubInitial(club)}</span>
                    )}
                  </div>

                  {/* Club info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[#111418] dark:text-white truncate group-hover:text-primary transition-colors">{club.name}</h3>
                      {club.instagram_handle && (
                        <span className="material-symbols-outlined text-[14px] text-[#637588] dark:text-[#92adc9] group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100">open_in_new</span>
                      )}
                    </div>
                    <p className="text-xs text-[#637588] dark:text-[#92adc9]">
                      {club.follower_count} follower{club.follower_count !== 1 ? 's' : ''} &middot; {club.category === 'TECH' ? 'Tech' : 'Non-Tech'}
                    </p>
                    {club.instagram_handle && (
                      <p className="text-xs text-primary/70 mt-0.5 truncate">
                        @{club.instagram_handle.replace(/^@/, '')}
                      </p>
                    )}
                  </div>

                  {/* Follow button */}
                  <button
                    onClick={(e) => club.is_following ? handleUnfollow(e, club.id) : handleFollow(e, club.id)}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${club.is_following
                      ? 'bg-primary/10 text-primary border border-primary/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20'
                      : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                    }`}
                  >
                    {club.is_following ? 'Following' : 'Follow'}
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Clubs;
