import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import StudentSidebar from '../components/student-dashboard/StudentSidebar';
import AppShell from '../components/layout/AppShell';
import AppTopBar from '../components/layout/AppTopBar';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { Skeleton } from '../components/ui/skeleton';
import { Toast } from '../components/ui/toast';
import StudentDashboardActivityTracker from '../components/student-dashboard/StudentDashboardActivityTracker';
import StudentDashboardDiscoverItem from '../components/student-dashboard/StudentDashboardDiscoverItem';
import StudentDashboardEventCard from '../components/student-dashboard/StudentDashboardEventCard';
import StudentDashboardEventCardSkeleton from '../components/student-dashboard/StudentDashboardEventCardSkeleton';
import { Reveal } from '../components/ui/reveal';
import { warmPosterCacheForEvents } from '../lib/utils';

const API = '';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'TECH', label: 'Tech' },
  { value: 'NON_TECH', label: 'Non-tech' },
  { value: 'paid', label: 'Paid' },
  { value: 'week', label: 'This week' },
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'soonest', label: 'Soonest' },
  { value: 'popular', label: 'Most Popular' },
];

const eventMatchesSearch = (event, rawQuery) => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  return [event.title, event.description, event.keywords]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(query));
};

const eventMatchesFilter = (event, filter) => {
  if (filter === 'all') return true;
  if (filter === 'TECH' || filter === 'NON_TECH') return event.tag === filter;
  if (filter === 'paid') return Boolean(event.is_paid);
  if (filter === 'week') {
    if (!event.start_time) return false;
    const eventDate = new Date(event.start_time);
    if (Number.isNaN(eventDate.getTime())) return false;
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    return eventDate >= now && eventDate <= nextWeek;
  }
  return true;
};

const sortEvents = (events, sortMode) => {
  const cloned = [...events];
  if (sortMode === 'soonest') {
    cloned.sort((a, b) => {
      const aTime = a.start_time ? new Date(a.start_time).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.start_time ? new Date(b.start_time).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
    return cloned;
  }
  if (sortMode === 'popular') {
    cloned.sort((a, b) => (b.rsvp_count || 0) - (a.rsvp_count || 0));
    return cloned;
  }
  return cloned;
};

const StudentDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortMode, setSortMode] = useState('recommended');
  const [forYouEvents, setForYouEvents] = useState([]);
  const [discoverEvents, setDiscoverEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [pendingRsvpId, setPendingRsvpId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [actionError, setActionError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const sortMenuRef = useRef(null);

  const fetchEvents = useCallback(async () => {
    if (!user?.id) return;
    setLoadingEvents(true);
    try {
      const recommendedRes = await fetch(`${API}/api/events/feed?type=recommended&user_id=${user.id}`);
      if (recommendedRes.ok) {
        const recommendedEvents = await recommendedRes.json();
        warmPosterCacheForEvents(recommendedEvents);
        setForYouEvents(recommendedEvents);
        setDiscoverEvents(recommendedEvents.filter((event) => !event.is_from_followed_club));
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoadingEvents(false);
    }
  }, [user]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    try {
      const res = await fetch(`${API}/api/rsvp/rsvps/me/activity`);
      if (res.ok) {
        setActivities(await res.json());
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (
      user &&
      user.role !== 'CLUB_ADMIN' &&
      (!user.batch || !user.department || !user.degree || (user.interests || []).length < 3)
    ) {
      navigate('/student/profile');
      return;
    }
    if (user) {
      void fetchEvents();
      void fetchActivities();
    }
  }, [user, loading, navigate, fetchEvents, fetchActivities]);

  useEffect(() => {
    if (!sortOpen) return undefined;

    const handlePointerDown = (event) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSortOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sortOpen]);

  const handleRSVP = async (eventId, isRegistered) => {
    setActionError('');
    setPendingRsvpId(eventId);
    try {
      const method = isRegistered ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/api/rsvp/events/${eventId}/rsvp`, { method });
      if (res.ok) {
        await fetchEvents();
      } else {
        const data = await res.json();
        setActionError(data.detail || (isRegistered ? 'Failed to unregister.' : 'Already registered for this event.'));
      }
    } catch (err) {
      console.error(err);
      setActionError('Unable to update registration right now.');
    } finally {
      setPendingRsvpId(null);
    }
  };

  const filteredForYouEvents = useMemo(() => {
    const filtered = forYouEvents
      .filter((event) => eventMatchesSearch(event, searchQuery))
      .filter((event) => eventMatchesFilter(event, activeFilter));
    return sortEvents(filtered, sortMode);
  }, [forYouEvents, searchQuery, activeFilter, sortMode]);

  const filteredDiscoverEvents = useMemo(() => {
    const filtered = discoverEvents
      .filter((event) => eventMatchesSearch(event, searchQuery))
      .filter((event) => eventMatchesFilter(event, activeFilter));
    return sortEvents(filtered, sortMode);
  }, [discoverEvents, searchQuery, activeFilter, sortMode]);

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

  const name = user?.name || 'Student';
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const upcomingWeekCount = forYouEvents.filter((event) => eventMatchesFilter(event, 'week')).length;
  const registeredCount = forYouEvents.filter((event) => event.is_rsvped).length;
  const selectedSortLabel = SORT_OPTIONS.find((option) => option.value === sortMode)?.label || 'Recommended';

  const sidebarNode = <StudentSidebar mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />;

  const topbarActions = user?.role === 'CLUB_ADMIN'
    ? (
      <Button onClick={() => navigate('/club/dashboard')} size="sm" className="h-10">
        Club Admin
      </Button>
      )
    : null;

  const topbarNode = (
    <AppTopBar
      title="Student Dashboard"
      onOpenMenu={() => setMobileMenuOpen(true)}
      showSearch
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search events"
      actions={topbarActions}
    />
  );

  return (
    <AppShell sidebar={sidebarNode} topbar={topbarNode} mobileMenuOpen={mobileMenuOpen} onCloseMenu={() => setMobileMenuOpen(false)}>
      <div className="relative flex w-full flex-col font-body text-text-primary dark:text-white">
        <div className="pointer-events-none absolute inset-0 opacity-55">
          <div className="atmosphere-grid"></div>
        </div>

        <div className="layout-container relative z-10 flex min-w-0 flex-col">
          <div className="flex justify-center overflow-x-hidden px-4 py-6 md:px-10 md:py-8 lg:px-16">
            <div className="layout-content-container flex w-full max-w-240 min-w-0 flex-col pb-10 md:pb-14">

            <div className="min-w-0 px-4 pb-3 pt-6">
              <Reveal className="dashboard-hero p-5 sm:p-7" distance={18}>
                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <span className="kicker-label">Student Dashboard</span>
                    <h1 className="wrap-break-word type-page-title mt-4 text-white sm:text-4xl">Welcome back, {name}!</h1>
                    <p className="type-lead mt-3 text-white/84">Track campus buzz, pick your next event, and keep your momentum visible.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-white sm:gap-3">
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-white/15 bg-black/26 p-3 text-center backdrop-blur-sm">
                      <p className="type-metric text-white">{forYouEvents.length}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/75">Matches</p>
                    </div>
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-white/15 bg-black/26 p-3 text-center backdrop-blur-sm">
                      <p className="type-metric text-white">{upcomingWeekCount}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/75">This Week</p>
                    </div>
                    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-white/15 bg-black/26 p-3 text-center backdrop-blur-sm">
                      <p className="type-metric text-white">{registeredCount}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-white/75">Registered</p>
                    </div>
                  </div>
                </div>
                <div className="relative z-10 mt-5 flex items-center gap-2 text-sm font-medium text-white/78">
                  <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                  <span>{currentDate}</span>
                </div>
              </Reveal>
            </div>

            <div className="px-4 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                {FILTER_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    onClick={() => setActiveFilter(option.value)}
                    variant={activeFilter === option.value ? 'primary' : 'secondary'}
                    size="sm"
                    className="h-8 rounded-full border border-transparent px-3 text-xs font-semibold tracking-[0.08em] titlecase"
                    aria-pressed={activeFilter === option.value}
                    aria-label={`Filter events: ${option.label}`}
                  >
                    {option.label}
                  </Button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <label htmlFor="event-sort" className="type-label text-text-secondary dark:text-text-dark-secondary">
                    Sort
                  </label>
                  <div className="relative">
                    <div ref={sortMenuRef} className="relative">
                      <button
                        id="event-sort"
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={sortOpen}
                        aria-label="Sort events"
                        onClick={() => setSortOpen((previous) => !previous)}
                        className="interactive-press inline-flex h-11 min-w-42 items-center justify-between rounded-full border border-primary/45 bg-surface-panel px-4 text-sm font-bold text-text-primary shadow-soft-sm transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:bg-surface-elevated dark:text-white"
                      >
                        <span>{selectedSortLabel}</span>
                        <span className={`material-symbols-outlined text-[18px] text-text-secondary transition-transform dark:text-text-dark-secondary ${sortOpen ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </button>

                      {sortOpen ? (
                        <div className="absolute right-0 z-60 mt-2 w-44 overflow-hidden rounded-xl border border-border-subtle bg-surface-panel shadow-soft-lg dark:border-border-strong dark:bg-surface-elevated">
                          <ul role="listbox" aria-labelledby="event-sort" className="py-1">
                            {SORT_OPTIONS.map((option) => (
                              <li key={option.value} role="none">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={sortMode === option.value}
                                  onClick={() => {
                                    setSortMode(option.value);
                                    setSortOpen(false);
                                  }}
                                  className={`flex w-full items-center px-3 py-2 text-left text-sm font-semibold transition-colors ${sortMode === option.value
                                    ? 'bg-primary/18 text-primary dark:bg-primary/24'
                                    : 'text-text-primary hover:bg-surface-muted dark:text-white dark:hover:bg-border-strong/55'}`}
                                >
                                  {option.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {actionError && (
              <div className="mx-4 mt-2">
                <Toast tone="error" title="Action failed" description={actionError} />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 p-4">
              <button type="button" onClick={() => navigate('/student/calendar')} className="interactive-press dashboard-hero group relative h-64 transition-all hover:shadow-soft-xl sm:h-72 md:h-80">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3zrC2zWTw2D4ivcIDWAb6vufiRs4bu3TgruhnB8zNBUeKci7kXQow7VafPKRga4Lua80PMNk1-QDne8Jz2xL8sVt3D4vk8aly08_J7ECW6ibdVKe9cK___pbaTzgl6Ao0GGmlrhdkYYcHHKC28MFxi-5Mx_ilnkcmxWj5IIVBLlLxQYWXwPOekKPJDW0-W2SFeW-zf9V-A-3yzcHNOiIBjXVzDYVZKSGxx5ZgP8Wqr1aIRU71sDUnwUvmUITWOzvvnhPYUWOcoek"
                  alt="Students attending campus event"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-overlay-scrim" aria-hidden="true"></div>
                <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="kicker-label border-white/30 bg-white/8 text-white">Live Calendar</span>
                    <span className="material-symbols-outlined rounded-full border border-white/20 bg-black/24 p-3 text-2xl text-white">calendar_month</span>
                  </div>
                  <div className="text-left">
                    <h3 className="section-title mb-2 text-white sm:text-3xl">Event Calendar</h3>
                    <p className="line-clamp-2 max-w-2xl text-base text-white/82">Check scheduled activities, compare overlaps, and plan your semester rhythm.</p>
                  </div>
                </div>
              </button>
            </div>

            <Reveal as="section" className="mt-8" delay={120}>
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4">
                <div>
                  <h2 className="section-title">For You</h2>
                  <p className="mt-1 text-sm text-text-secondary dark:text-text-dark-secondary">Interest-matched events ranked for you.</p>
                </div>
                <Button onClick={() => navigate('/student/calendar')} variant="ghost" size="sm" className="h-8 px-2 text-sm font-bold text-primary">View All</Button>
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-3">
                {loadingEvents && Array.from({ length: 3 }).map((_, index) => <StudentDashboardEventCardSkeleton key={`for-you-skeleton-${index}`} />)}
                {!loadingEvents && filteredForYouEvents.length === 0 && (
                  <div className="col-span-3">
                    <EmptyState
                      icon="search_off"
                      title="No matching events"
                      description="No events match current search and filters. Adjust filters or browse all events."
                      actionLabel="Open Calendar"
                      onAction={() => navigate('/student/calendar')}
                    />
                  </div>
                )}
                {!loadingEvents && filteredForYouEvents.slice(0, 3).map((event) => (
                  <StudentDashboardEventCard
                    key={event.id}
                    event={event}
                    pendingRsvpId={pendingRsvpId}
                    onToggleRsvp={handleRSVP}
                  />
                ))}
              </div>
            </Reveal>

            <Reveal as="section" className="mb-8 mt-10" delay={180}>
              <div className="flex items-center justify-between px-4 pb-4">
                <div>
                  <h2 className="section-title">Explore Beyond Your Clubs</h2>
                  <p className="mt-1 text-sm text-text-secondary dark:text-text-dark-secondary">Recommended events from clubs you do not follow yet.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2">
                {loadingEvents && Array.from({ length: 2 }).map((_, index) => <StudentDashboardEventCardSkeleton key={`discover-skeleton-${index}`} />)}
                {!loadingEvents && filteredDiscoverEvents.length === 0 && (
                  <div className="col-span-2">
                    <EmptyState
                      icon="interests"
                      title="No extra recommendations"
                      description="No recommendations beyond followed clubs right now. Check calendar for upcoming events."
                      actionLabel="View Calendar"
                      onAction={() => navigate('/student/calendar')}
                    />
                  </div>
                )}
                {!loadingEvents && filteredDiscoverEvents.slice(0, 4).map((event) => (
                  <StudentDashboardDiscoverItem
                    key={event.id}
                    event={event}
                    onMoreInfo={() => navigate('/student/calendar')}
                  />
                ))}
              </div>
            </Reveal>
            <StudentDashboardActivityTracker
              loadingActivities={loadingActivities}
              activities={activities}
              onBrowseEvents={() => navigate('/student/calendar')}
            />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default StudentDashboard;
