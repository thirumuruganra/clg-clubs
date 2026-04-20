import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { getClubIconUrl, getClubInitial } from '../lib/utils';
import StudentSidebar from '../components/student-dashboard/StudentSidebar';
import AppShell from '../components/layout/AppShell';
import AppTopBar from '../components/layout/AppTopBar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { EmptyState } from '../components/ui/empty-state';
import { Skeleton } from '../components/ui/skeleton';
import { Toast } from '../components/ui/toast';

const API = '';

const categoryFilters = [
  { label: 'All Clubs', value: 'all' },
  { label: 'Following', value: 'following' },
  { label: 'Tech', value: 'tech' },
  { label: 'Non-Tech', value: 'nontech' },
];

const StudentClubs = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [followError, setFollowError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchClubs = useCallback(async () => {
    if (!user?.id) return;

    setLoadingClubs(true);
    try {
      const res = await fetch(`${API}/api/clubs/?user_id=${user.id}`);
      if (res.ok) {
        setClubs(await res.json());
      }
    } catch (err) {
      console.error('Error fetching clubs:', err);
    } finally {
      setLoadingClubs(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (user && (!user.batch || !user.department || !user.degree)) {
      navigate('/student/profile');
      return;
    }
    if (user) {
      void fetchClubs();
    }
  }, [user, loading, navigate, fetchClubs]);

  const handleFollow = async (clubId) => {
    setFollowError('');
    try {
      const res = await fetch(`${API}/api/follow/clubs/${clubId}/follow`, { method: 'POST' });
      if (res.ok) {
        await fetchClubs();
      } else {
        const data = await res.json();
        setFollowError(data.detail || 'Could not follow this club right now.');
      }
    } catch (err) {
      console.error(err);
      setFollowError('Unable to follow this club right now.');
    }
  };

  const handleUnfollow = async (clubId) => {
    setFollowError('');
    try {
      const res = await fetch(`${API}/api/follow/clubs/${clubId}/follow`, { method: 'DELETE' });
      if (res.ok) {
        await fetchClubs();
      }
    } catch (err) {
      console.error(err);
      setFollowError('Unable to unfollow this club right now.');
    }
  };

  const openInstagram = (club) => {
    if (!club.instagram_handle) return;

    const handle = club.instagram_handle
      .replace(/^@/, '')
      .replace(/^https?:\/\/(www\.)?instagram\.com\//, '')
      .replace(/\/$/, '');

    window.open(`https://www.instagram.com/${handle}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="w-full max-w-sm space-y-3 px-4">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  const filteredClubs = clubs.filter((club) => {
    if (categoryFilter === 'tech' && club.category !== 'TECH') return false;
    if (categoryFilter === 'nontech' && club.category !== 'NON_TECH') return false;
    if (categoryFilter === 'following' && !club.is_following) return false;
    if (searchQuery && !club.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const followingCount = clubs.filter((club) => club.is_following).length;
  const techCount = clubs.filter((club) => club.category === 'TECH').length;
  const nonTechCount = clubs.filter((club) => club.category === 'NON_TECH').length;

  return (
    <AppShell
      sidebar={(
        <StudentSidebar mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      )}
      topbar={(
        <AppTopBar
          title="Clubs"
          onOpenMenu={() => setMobileMenuOpen(true)}
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search clubs..."
        />
      )}
      mobileMenuOpen={mobileMenuOpen}
      onCloseMenu={() => setMobileMenuOpen(false)}
    >
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        <header className="space-y-2">
          <h2 className="text-3xl font-bold text-text-primary">Discover clubs</h2>
          <p className="text-sm text-text-secondary">
            Follow clubs for personalized event feeds. Open Instagram for latest posts.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Total Clubs', value: clubs.length, icon: 'groups' },
            { label: 'Following', value: followingCount, icon: 'favorite' },
            { label: 'Tech Clubs', value: techCount, icon: 'computer' },
            { label: 'Non-Tech', value: nonTechCount, icon: 'palette' },
          ].map((stat) => (
            <Card key={stat.label} className="p-3 sm:p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary" aria-hidden="true">{stat.icon}</span>
                <span className="text-xs font-medium text-text-secondary">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-text-primary sm:text-2xl">{stat.value}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categoryFilters.map((cat) => (
            <Button
              key={cat.value}
              type="button"
              variant={categoryFilter === cat.value ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={categoryFilter === cat.value}
              aria-label={`Filter clubs: ${cat.label}`}
              onClick={() => setCategoryFilter(cat.value)}
              className={categoryFilter === cat.value ? '' : 'border border-border-subtle'}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {followError ? (
          <Toast tone="error" title="Club action failed" description={followError} />
        ) : null}

        {loadingClubs ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : null}

        {!loadingClubs && filteredClubs.length === 0 ? (
          <EmptyState
            icon="groups"
            title="No clubs found"
            description="Try another filter or search term."
            actionLabel="Clear filters"
            onAction={() => {
              setCategoryFilter('all');
              setSearchQuery('');
            }}
          />
        ) : null}

        {!loadingClubs && filteredClubs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClubs.map((club) => {
              const clubIconUrl = getClubIconUrl(club);

              return (
                <Card key={club.id} className="flex h-full flex-col gap-3" elevated interactive>
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/20">
                      {clubIconUrl ? (
                        <img
                          src={clubIconUrl}
                          alt={`${club.name} logo`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-lg font-bold text-primary">{getClubInitial(club)}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-text-primary">{club.name}</h3>
                      <p className="text-xs text-text-secondary">
                        {club.follower_count} follower{club.follower_count !== 1 ? 's' : ''} · {club.category === 'TECH' ? 'Tech' : 'Non-Tech'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={club.is_following ? 'secondary' : 'primary'}
                      onClick={() => (club.is_following ? handleUnfollow(club.id) : handleFollow(club.id))}
                      className={club.is_following ? 'border border-border-subtle text-primary' : ''}
                    >
                      {club.is_following ? 'Following' : 'Follow'}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => openInstagram(club)}
                      disabled={!club.instagram_handle}
                      className="border border-border-subtle text-text-secondary disabled:opacity-50"
                    >
                      Open Instagram
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}
      </section>
    </AppShell>
  );
};

export default StudentClubs;
