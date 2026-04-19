import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import StudentSidebar from '../components/StudentSidebar';
import { warmPosterCacheForEvents } from '../lib/utils';

const API = '';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'TECH', label: 'Tech' },
  { value: 'NON_TECH', label: 'Non-Tech' },
  { value: 'paid', label: 'Paid' },
  { value: 'week', label: 'This Week' },
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

const formatEventDate = (iso) => {
  if (!iso) return { month: '', day: '' };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { month: '', day: '' };
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
  };
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
        <div className="text-lg text-[#111418] dark:text-white">Loading...</div>
      </div>
    );
  }

  const name = user?.name || 'Student';
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const EventCard = ({ event }) => {
    const { month, day } = formatEventDate(event.start_time);
    const isPending = pendingRsvpId === event.id;

    return (
      <article className="flex flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-[#233648] dark:bg-[#1a2632]">
        <div className="relative h-36 overflow-hidden bg-[#0f1720] sm:h-40">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
          ) : null}
          <div className="absolute right-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-center shadow-sm dark:bg-[#111a22]/90">
            <p className="text-xs font-bold uppercase text-primary">{month}</p>
            <p className="text-lg font-bold text-[#111418] dark:text-white">{day}</p>
          </div>
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex items-center rounded-md bg-primary px-2 py-1 text-xs font-medium text-white">{event.club_name || 'Club'}</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="mb-1 text-lg font-bold text-[#111418] dark:text-white">{event.title}</h3>
          <p className="mb-2 line-clamp-2 text-sm text-[#637588] dark:text-[#92adc9]">{event.description}</p>

          {event.keywords && (
            <div className="mb-2 flex flex-wrap gap-1">
              {event.keywords.split(',').slice(0, 4).map((keyword, index) => (
                <span key={`${event.id}-${index}`} className="rounded-full border border-[#e5e7eb] bg-background-light px-2 py-0.5 text-[10px] text-[#637588] dark:border-[#34485c] dark:bg-[#233648] dark:text-[#92adc9]">
                  {keyword.trim()}
                </span>
              ))}
            </div>
          )}

          {event.is_paid && (
            <div className="mb-3 flex flex-col gap-1 rounded-lg border border-[#e5e7eb] bg-background-light p-2 text-xs dark:border-[#233648] dark:bg-[#111a22]">
              <div className="flex items-center gap-1 font-medium text-[#637588] dark:text-[#92adc9]">
                <span className="material-symbols-outlined text-[14px]">payments</span>
                <span>Registration Fee: {event.registration_fees || 'TBA'}</span>
              </div>
              {event.payment_link && (
                <a href={event.payment_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline" onClick={(eventObj) => eventObj.stopPropagation()}>
                  <span className="material-symbols-outlined text-[14px]">link</span>
                  <span>Payment Link</span>
                </a>
              )}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-1 text-[#637588] dark:text-[#92adc9]">
              <span className="material-symbols-outlined text-[16px]">group</span>
              <span className="text-xs font-medium">{event.rsvp_count || 0} registered</span>
            </div>
            <button
              onClick={() => handleRSVP(event.id, event.is_rsvped)}
              disabled={isPending}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-60 ${
                event.is_rsvped ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {isPending ? 'Updating...' : event.is_rsvped ? 'Unregister' : 'Register'}
            </button>
          </div>
        </div>
      </article>
    );
  };

  const DiscoverItem = ({ event }) => {
    const { month, day } = formatEventDate(event.start_time);
    return (
      <article className="flex min-h-40 flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-[#233648] dark:bg-[#1a2632] sm:flex-row">
        <div className="h-32 w-full overflow-hidden bg-[#0f1720] sm:h-auto sm:w-1/3">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="flex w-full flex-col justify-between gap-3 p-4 sm:w-2/3">
          <div>
            <div className="flex items-start justify-between gap-2">
              <span className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">{event.club_name || 'Club'}</span>
              <span className="rounded bg-[#f0f2f4] px-2 py-0.5 text-xs font-medium text-[#637588] dark:bg-[#233648] dark:text-[#92adc9]">{month} {day}</span>
            </div>
            <h3 className="text-lg font-bold leading-tight text-[#111418] dark:text-white">{event.title}</h3>
            {event.location && (
              <div className="mt-2 flex items-center gap-1 text-[#637588] dark:text-[#92adc9]">
                <span className="material-symbols-outlined text-[16px]">location_on</span>
                <span className="text-xs">{event.location}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-end">
            <button onClick={() => navigate('/student/calendar')} className="flex items-center gap-1 rounded-lg border border-[#e5e7eb] bg-transparent px-3 py-1.5 text-xs font-bold text-[#111418] transition-colors hover:bg-[#f0f2f4] dark:border-[#233648] dark:text-white dark:hover:bg-[#233648]">
              More Info
            </button>
          </div>
        </div>
      </article>
    );
  };

  const EventCardSkeleton = () => (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white dark:border-[#233648] dark:bg-[#1a2632]">
      <div className="h-36 animate-pulse bg-[#f0f2f4] dark:bg-[#233648]"></div>
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#f0f2f4] dark:bg-[#233648]"></div>
        <div className="h-3 w-full animate-pulse rounded bg-[#f0f2f4] dark:bg-[#233648]"></div>
        <div className="h-3 w-5/6 animate-pulse rounded bg-[#f0f2f4] dark:bg-[#233648]"></div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-auto min-h-dvh w-full overflow-x-hidden bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-white">
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}
      <StudentSidebar mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      <div className="layout-container flex h-full min-w-0 flex-1 grow flex-col">
        <header className="flex items-center justify-between border-b border-solid border-[#e5e7eb] bg-white px-4 py-3 dark:border-[#233648] dark:bg-[#111a22] md:px-10">
          <div className="flex min-w-0 items-center gap-3 md:gap-8">
            <button aria-label="Open sidebar" className="h-10 w-10 rounded-full transition-colors hover:bg-[#f0f2f4] dark:hover:bg-[#233648] lg:hidden" onClick={() => setMobileMenuOpen(true)}>
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <button type="button" className="min-w-0 cursor-pointer text-left" onClick={() => navigate('/student/dashboard')}>
              <h2 className="truncate text-lg font-bold tracking-[-0.015em] text-[#111418] dark:text-white">WAVC</h2>
            </button>
            <label className="hidden h-10 max-w-64 min-w-40 md:flex">
              <div className="flex h-full w-full items-stretch rounded-xl">
                <div className="flex items-center justify-center rounded-l-xl bg-[#f0f2f4] pl-4 text-[#637588] dark:bg-[#233648] dark:text-[#92adc9]">
                  <span className="material-symbols-outlined text-[24px]">search</span>
                </div>
                <input
                  className="form-input h-full w-full flex-1 rounded-xl rounded-l-none border-none bg-[#f0f2f4] px-4 pl-2 text-base font-normal text-[#111418] placeholder:text-[#637588] focus:outline-0 focus:ring-0 dark:bg-[#233648] dark:text-white dark:placeholder:text-[#92adc9]"
                  placeholder="Search events"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </label>
          </div>
          <div className="flex min-w-0 flex-1 justify-end gap-3 md:gap-8">
            {user?.role === 'CLUB_ADMIN' && (
              <button onClick={() => navigate('/club/dashboard')} className="hidden h-10 min-w-21 items-center justify-center overflow-hidden rounded-xl bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 md:flex">
                <span className="truncate">Club Admin</span>
              </button>
            )}
          </div>
        </header>

        <main className="flex flex-1 justify-center overflow-x-hidden px-4 py-6 md:px-10 md:py-8 lg:px-40">
          <div className="layout-content-container flex w-full max-w-240 min-w-0 flex-1 flex-col">
            <div className="px-4 pb-2 pt-4 md:hidden">
              <label className="flex h-10">
                <div className="flex h-full w-full items-stretch rounded-xl">
                  <div className="flex items-center justify-center rounded-l-xl bg-[#f0f2f4] pl-3 text-[#637588] dark:bg-[#233648] dark:text-[#92adc9]">
                    <span className="material-symbols-outlined text-[20px]">search</span>
                  </div>
                  <input
                    className="form-input h-full w-full flex-1 rounded-xl rounded-l-none border-none bg-[#f0f2f4] px-3 pl-2 text-sm font-normal text-[#111418] placeholder:text-[#637588] focus:outline-0 focus:ring-0 dark:bg-[#233648] dark:text-white dark:placeholder:text-[#92adc9]"
                    placeholder="Search events"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </label>
            </div>

            <div className="min-w-0 px-4 pb-3 pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  <h1 className="wrap-break-word text-3xl font-bold leading-tight text-[#111418] dark:text-white sm:text-[32px]">Welcome back, {name}!</h1>
                  <p className="mt-2 text-base text-[#637588] dark:text-[#92adc9]">Here's what's happening around campus.</p>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-[#637588] dark:text-[#92adc9]">
                  <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                  <span>{currentDate}</span>
                </div>
              </div>
            </div>

            <div className="px-4 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                {FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setActiveFilter(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeFilter === option.value
                        ? 'border-primary bg-primary text-white'
                        : 'border-[#e5e7eb] bg-white text-[#637588] hover:border-primary/40 hover:text-primary dark:border-[#233648] dark:bg-[#1a2632] dark:text-[#92adc9]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
                <div className="ml-auto">
                  <label htmlFor="event-sort" className="flex items-center gap-2 text-xs font-semibold text-[#637588] dark:text-[#92adc9]">
                    Sort
                    <div className="relative">
                      <select
                        id="event-sort"
                        value={sortMode}
                        onChange={(event) => setSortMode(event.target.value)}
                        className="h-11 min-w-42 appearance-none rounded-xl border border-[#d8dee5] bg-white pl-3 pr-9 text-sm font-semibold text-[#111418] shadow-sm transition-colors hover:border-primary/45 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-[#233648] dark:bg-[#1a2632] dark:text-white dark:hover:border-primary/60"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {actionError && <p className="mx-4 mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{actionError}</p>}

            <div className="grid grid-cols-1 gap-4 p-4">
              <button type="button" onClick={() => navigate('/student/calendar')} className="group relative h-64 overflow-hidden rounded-xl border border-[#e5e7eb] shadow-sm transition-all hover:shadow-md dark:border-[#233648] sm:h-72 md:h-80">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3zrC2zWTw2D4ivcIDWAb6vufiRs4bu3TgruhnB8zNBUeKci7kXQow7VafPKRga4Lua80PMNk1-QDne8Jz2xL8sVt3D4vk8aly08_J7ECW6ibdVKe9cK___pbaTzgl6Ao0GGmlrhdkYYcHHKC28MFxi-5Mx_ilnkcmxWj5IIVBLlLxQYWXwPOekKPJDW0-W2SFeW-zf9V-A-3yzcHNOiIBjXVzDYVZKSGxx5ZgP8Wqr1aIRU71sDUnwUvmUITWOzvvnhPYUWOcoek"
                  alt="Students attending campus event"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/55" aria-hidden="true"></div>
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
                  <div className="mb-4">
                    <span className="material-symbols-outlined rounded-full bg-white/20 p-3 text-2xl text-white">calendar_month</span>
                  </div>
                  <h3 className="mb-2 text-2xl font-bold text-white sm:text-3xl">Event Calendar</h3>
                  <p className="line-clamp-2 max-w-2xl mx-auto text-center text-base text-gray-200">Check scheduled activities and plan your semester ahead.</p>
                </div>
              </button>
            </div>

            <section className="mt-8">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-4">
                <div>
                  <h2 className="text-[22px] font-bold text-[#111418] dark:text-white">For You</h2>
                  <p className="mt-1 text-sm text-[#637588] dark:text-[#92adc9]">Interest-matched events ranked for you.</p>
                </div>
                <button onClick={() => navigate('/student/calendar')} className="text-sm font-bold text-primary hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2 lg:grid-cols-3">
                {loadingEvents && Array.from({ length: 3 }).map((_, index) => <EventCardSkeleton key={`for-you-skeleton-${index}`} />)}
                {!loadingEvents && filteredForYouEvents.length === 0 && (
                  <p className="col-span-3 rounded-xl border border-[#e5e7eb] bg-white p-4 text-sm italic text-[#637588] dark:border-[#233648] dark:bg-[#1a2632] dark:text-[#92adc9]">
                    No events match your current search and filters.
                  </p>
                )}
                {!loadingEvents && filteredForYouEvents.slice(0, 3).map((event) => <EventCard key={event.id} event={event} />)}
              </div>
            </section>

            <section className="mb-8 mt-10">
              <div className="flex items-center justify-between px-4 pb-4">
                <div>
                  <h2 className="text-[22px] font-bold text-[#111418] dark:text-white">Explore Beyond Your Clubs</h2>
                  <p className="mt-1 text-sm text-[#637588] dark:text-[#92adc9]">Recommended events from clubs you do not follow yet.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 md:grid-cols-2">
                {loadingEvents && Array.from({ length: 2 }).map((_, index) => <EventCardSkeleton key={`discover-skeleton-${index}`} />)}
                {!loadingEvents && filteredDiscoverEvents.length === 0 && (
                  <p className="col-span-2 rounded-xl border border-[#e5e7eb] bg-white p-4 text-sm italic text-[#637588] dark:border-[#233648] dark:bg-[#1a2632] dark:text-[#92adc9]">
                    No extra recommendations right now.
                  </p>
                )}
                {!loadingEvents && filteredDiscoverEvents.slice(0, 4).map((event) => <DiscoverItem key={event.id} event={event} />)}
              </div>
            </section>

            <section className="mb-8 mt-10">
              <div className="px-4 pb-4">
                <h2 className="text-[22px] font-bold text-[#111418] dark:text-white">Student Activity Tracker</h2>
                <p className="mt-1 text-sm text-[#637588] dark:text-[#92adc9]">Events you have attended.</p>
              </div>
              <div className="px-4">
                {loadingActivities ? (
                  <p className="text-sm italic text-[#637588] dark:text-[#92adc9]">Loading activities...</p>
                ) : activities.length === 0 ? (
                  <p className="rounded-xl border border-[#e5e7eb] bg-white p-4 text-sm italic text-[#637588] dark:border-[#233648] dark:bg-[#1a2632] dark:text-[#92adc9]">
                    No attended events yet. Participate in events to earn activity points.
                  </p>
                ) : (
                  <>
                    <div className="space-y-3 md:hidden">
                      {activities.map((activity, index) => {
                        const startDate = new Date(activity.start_time);
                        const endDate = new Date(activity.end_time);
                        const dateText = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const timeText = `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
                        return (
                          <article key={`${activity.event_name}-${index}`} className="rounded-xl border border-[#e5e7eb] bg-white p-4 dark:border-[#233648] dark:bg-[#1a2632]">
                            <h3 className="text-sm font-bold text-[#111418] dark:text-white">{activity.event_name}</h3>
                            <p className="mt-1 text-xs text-[#637588] dark:text-[#92adc9]">{activity.club_name}</p>
                            <p className="mt-2 text-xs text-[#637588] dark:text-[#92adc9]">{dateText}</p>
                            <p className="text-xs text-[#637588] dark:text-[#92adc9]">{timeText}</p>
                          </article>
                        );
                      })}
                    </div>

                    <div className="hidden overflow-x-auto rounded-xl border border-[#e5e7eb] bg-white dark:border-[#233648] dark:bg-[#1a2632] md:block">
                      <table className="w-full min-w-160 text-left text-sm text-[#111418] dark:text-white">
                        <thead className="bg-[#f0f2f4] text-xs uppercase text-[#637588] dark:bg-[#233648] dark:text-[#92adc9]">
                          <tr>
                            <th className="whitespace-nowrap px-3 py-3 md:px-6">Event Name</th>
                            <th className="whitespace-nowrap px-3 py-3 md:px-6">Club Name</th>
                            <th className="whitespace-nowrap px-3 py-3 md:px-6">Date</th>
                            <th className="whitespace-nowrap px-3 py-3 md:px-6">Start Time</th>
                            <th className="whitespace-nowrap px-3 py-3 md:px-6">End Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5e7eb] border-t border-[#e5e7eb] dark:divide-[#233648] dark:border-[#233648]">
                          {activities.map((activity, index) => {
                            const startDate = new Date(activity.start_time);
                            const endDate = new Date(activity.end_time);
                            const dateText = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            const startText = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                            const endText = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                            return (
                              <tr key={`${activity.event_name}-${index}`} className="transition-colors hover:bg-[#f9fafb] dark:hover:bg-[#111a22]">
                                <td className="px-3 py-4 font-medium md:px-6">{activity.event_name}</td>
                                <td className="px-3 py-4 md:px-6">{activity.club_name}</td>
                                <td className="px-3 py-4 md:px-6">{dateText}</td>
                                <td className="px-3 py-4 md:px-6">{startText}</td>
                                <td className="px-3 py-4 md:px-6">{endText}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;
