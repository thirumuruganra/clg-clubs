import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { getClubIconUrl, getClubInitial, warmPosterCacheForEvents, warmPosterImageCache } from '../lib/utils';
import StudentSidebar from '../components/student-dashboard/StudentSidebar';
import AppShell from '../components/layout/AppShell';
import AppTopBar from '../components/layout/AppTopBar';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { EventPosterFallback } from '../components/ui/event-poster-fallback';
import { IconButton } from '../components/ui/icon-button';
import { Skeleton } from '../components/ui/skeleton';

const API = '';

const eventMatchesSearch = (event, rawQuery) => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  return [event.title, event.description, event.keywords]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(query));
};

const StudentCalendar = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedClubId, setSelectedClubId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [dayEventsModal, setDayEventsModal] = useState({ open: false, day: null, events: [] });

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/events/all`);
      if (res.ok) {
        const allEvents = await res.json();
        warmPosterCacheForEvents(allEvents);
        setEvents(allEvents);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchClubs = useCallback(async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`${API}/api/clubs/?user_id=${user.id}`);
      if (res.ok) setClubs(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
      return;
    }
    if (user) {
      queueMicrotask(() => {
        void fetchEvents();
        void fetchClubs();
      });
    }
  }, [user, loading, navigate, fetchEvents, fetchClubs]);

  const handleRSVP = async (eventId, isRegistered) => {
    try {
      const method = isRegistered ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/api/rsvp/events/${eventId}/rsvp`, { method });
      if (res.ok) {
        await fetchEvents();
        if (selectedEvent?.id === eventId) {
          const updated = await fetch(`${API}/api/events/${eventId}?user_id=${user.id}`);
          if (updated.ok) setSelectedEvent(await updated.json());
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEventDetail = async (eventId) => {
    try {
      const res = await fetch(`${API}/api/events/${eventId}?user_id=${user?.id || ''}`);
      if (res.ok) {
        const eventDetail = await res.json();
        warmPosterImageCache(eventDetail?.image_url);
        setSelectedEvent(eventDetail);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const filteredEvents = events.filter((event) => {
    if (categoryFilter === 'tech' && event.tag !== 'TECH') return false;
    if (categoryFilter === 'nontech' && event.tag !== 'NON_TECH') return false;
    if (selectedClubId !== null && Number(event.club_id) !== selectedClubId) return false;
    if (!eventMatchesSearch(event, searchQuery)) return false;
    return true;
  });

  const categoryLegend = [
    { label: 'All Events', value: 'all', color: 'bg-gradient-to-r from-sky-400 via-primary to-green-500' },
    { label: 'Tech Clubs', value: 'tech', color: 'bg-primary' },
    { label: 'Non-Tech Clubs', value: 'nontech', color: 'bg-green-500' },
  ];

  const getEventPillClass = (tag) => (
    tag === 'TECH'
      ? 'bg-primary/20 text-primary hover:bg-primary/30'
      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
  );

  const getMiniCalendarDotClass = (dayEvents) => {
    const hasTech = dayEvents.some((event) => event.tag === 'TECH');
    const hasNonTech = dayEvents.some((event) => event.tag === 'NON_TECH');

    if (hasTech && hasNonTech) return 'bg-gradient-to-r from-primary to-green-500';
    if (hasTech) return 'bg-primary';
    if (hasNonTech) return 'bg-green-500';
    return 'bg-[#637588]';
  };

  const addToGoogleCalendar = () => {
    if (!selectedEvent || !selectedEvent.start_time) return;
    const start = new Date(selectedEvent.start_time).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const end = selectedEvent.end_time ? new Date(selectedEvent.end_time).toISOString().replace(/-|:|\.\d\d\d/g, '') : start;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(selectedEvent.title)}&dates=${start}/${end}&details=${encodeURIComponent(selectedEvent.description || '')}&location=${encodeURIComponent(selectedEvent.location || '')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const getEventsForDay = (day) => filteredEvents.filter((event) => {
    if (!event.start_time) return false;
    const date = new Date(event.start_time);
    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
  });

  const myScheduleCount = events.filter((event) => event.is_rsvped).length;
  const openDayEventsModal = (day, dayEvents) => {
    setDayEventsModal({
      open: true,
      day,
      events: [...dayEvents].sort((a, b) => new Date(a.start_time || 0) - new Date(b.start_time || 0)),
    });
  };

  const calendarDays = [];
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i -= 1) calendarDays.push({ day: prevMonthDays - i, current: false });
  for (let day = 1; day <= daysInMonth; day += 1) calendarDays.push({ day, current: true });
  const remaining = 42 - calendarDays.length;
  for (let day = 1; day <= remaining; day += 1) calendarDays.push({ day, current: false });

  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

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

  const sidebarContent = (
    <>
      <div className="my-3 h-px bg-border-subtle" aria-hidden="true" />

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-bold text-text-primary">{monthName}</span>
          <div className="flex gap-1">
            <IconButton ariaLabel="Previous month" size="sm" variant="soft" onClick={prevMonth}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_left</span>
            </IconButton>
            <IconButton ariaLabel="Next month" size="sm" variant="soft" onClick={nextMonth}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">chevron_right</span>
            </IconButton>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0 text-center text-xs">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
            <div key={day} className="py-1 font-medium text-text-secondary">{day}</div>
          ))}
          {calendarDays.map((dayItem, index) => {
            const dayEvents = dayItem.current ? getEventsForDay(dayItem.day) : [];
            const hasEvents = dayEvents.length > 0;
            const dotClass = getMiniCalendarDotClass(dayEvents);

            return (
              <div
                key={`${dayItem.day}-${index}`}
                className={`relative cursor-pointer rounded-full py-1.5 text-xs transition-colors
                ${!dayItem.current ? 'text-text-secondary/40' : ''}
                ${dayItem.current && isToday(dayItem.day) ? 'bg-primary font-bold text-white' : ''}
                ${dayItem.current && !isToday(dayItem.day) ? 'hover:bg-border-strong/20' : ''}`}
              >
                {dayItem.day}
                {hasEvents ? <div className={`absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${dotClass}`} /> : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-8">
        <h3 className="type-label mb-3 text-text-secondary">My Schedule</h3>
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary">
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">event_available</span>
          {myScheduleCount} events this week
        </div>
      </section>

      <section className="mb-8">
        <h3 className="type-label mb-3 text-text-secondary">Club Categories</h3>
        <div className="space-y-1">
          {categoryLegend.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setCategoryFilter(category.value)}
              aria-pressed={categoryFilter === category.value}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                categoryFilter === category.value ? 'bg-border-strong text-white' : 'text-text-secondary hover:bg-border-strong/20'
              }`}
            >
              <div className={`h-4 w-4 rounded-full ${category.color} ${categoryFilter === category.value ? 'ring-2 ring-white/50' : 'opacity-50'}`} />
              {category.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h3 className="type-label mb-3 text-text-secondary">Clubs</h3>
        <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => setSelectedClubId(null)}
            aria-pressed={selectedClubId === null}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              selectedClubId === null ? 'bg-border-strong text-white' : 'text-text-secondary hover:bg-border-strong/20'
            }`}
          >
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
              <span className="material-symbols-outlined text-xs leading-none" aria-hidden="true">groups</span>
            </div>
            <span className="flex-1 truncate">All Clubs</span>
          </button>

          {clubs.length === 0 ? (
            <p className="px-3 py-2 text-xs italic text-text-secondary">No clubs found</p>
          ) : null}

          {clubs.map((club) => {
            const clubIconUrl = getClubIconUrl(club);

            return (
              <button
                key={club.id}
                type="button"
                onClick={() => setSelectedClubId(club.id)}
                aria-pressed={selectedClubId === club.id}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedClubId === club.id ? 'bg-border-strong text-white' : 'text-text-secondary hover:bg-border-strong/20'
                }`}
              >
                <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                  {clubIconUrl ? (
                    <img src={clubIconUrl} alt={club.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xs font-bold text-primary">{getClubInitial(club)}</span>
                  )}
                </div>
                <span className="flex-1 truncate">{club.name}</span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );

  const topbarActions = (
    <>
      <IconButton ariaLabel="Previous month" variant="soft" size="sm" onClick={prevMonth}>
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_left</span>
      </IconButton>
      <IconButton ariaLabel="Next month" variant="soft" size="sm" onClick={nextMonth}>
        <span className="material-symbols-outlined text-[22px]" aria-hidden="true">chevron_right</span>
      </IconButton>
      <IconButton ariaLabel="Notifications" variant="soft" size="sm">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">notifications</span>
      </IconButton>
    </>
  );

  return (
    <AppShell
      sidebar={(
        <StudentSidebar mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
          {sidebarContent}
        </StudentSidebar>
      )}
      topbar={(
        <AppTopBar
          title={monthName}
          onOpenMenu={() => setMobileMenuOpen(true)}
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search events..."
          actions={topbarActions}
        />
      )}
      mobileMenuOpen={mobileMenuOpen}
      onCloseMenu={() => setMobileMenuOpen(false)}
    >
      <section className="flex h-full min-h-0 flex-col p-3 sm:p-4 md:p-6">
        <div className="mb-2 grid grid-cols-7">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-text-secondary">{day}</div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7 border-l border-t border-border-subtle">
          {calendarDays.map((dayItem, index) => {
            const dayEvents = dayItem.current ? getEventsForDay(dayItem.day) : [];

            return (
              <div
                key={`${dayItem.day}-${index}`}
                className={`min-h-20 border-b border-r border-border-subtle p-1 sm:min-h-24 md:min-h-28 ${
                  !dayItem.current ? 'bg-[#f9fafb] dark:bg-[#0c1218]' : 'bg-white dark:bg-[#111a22]'
                }`}
              >
                <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  isToday(dayItem.day) && dayItem.current ? 'bg-primary font-bold text-white' : dayItem.current ? 'text-text-primary dark:text-white' : 'text-text-secondary/40'
                }`}
                >
                  {dayItem.day}
                </div>

                {dayEvents.slice(0, 2).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => openEventDetail(event.id)}
                    className={`mb-0.5 w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors ${getEventPillClass(event.tag)}`}
                  >
                    {event.title}
                  </button>
                ))}

                {dayEvents.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => openDayEventsModal(dayItem.day, dayEvents)}
                    className="px-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                  >
                    +{dayEvents.length - 2} more
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon="event_busy"
              title="No events in this view"
              description="Change filters, club selection, or search to see more events."
              actionLabel="Reset filters"
              onAction={() => {
                setCategoryFilter('all');
                setSelectedClubId(null);
                setSearchQuery('');
              }}
            />
          </div>
        ) : null}
      </section>

      {selectedEvent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm safe-area-y" onClick={() => setSelectedEvent(null)}>
          <div
            className="modal-panel w-full max-w-2xl overflow-y-auto rounded-2xl border border-border-subtle bg-white shadow-2xl dark:border-border-strong dark:bg-[#1a2632]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-full flex-col md:flex-row">
              <div className="relative min-h-44 w-full overflow-hidden bg-[#0f1720] sm:min-h-52 md:min-h-88 md:w-2/5">
                {selectedEvent.image_url ? (
                  <img src={selectedEvent.image_url} alt={selectedEvent.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                ) : (
                  <EventPosterFallback title={selectedEvent.title} />
                )}
              </div>

              <div className="flex w-full flex-col p-6 md:w-3/5">
                <div className="mb-1 flex items-start justify-between">
                  <span className="text-sm text-text-secondary">
                    {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    {' • '}
                    {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleDateString('en-US', { weekday: 'long' }) : ''}
                  </span>
                  <IconButton ariaLabel="Close event details" variant="soft" size="sm" onClick={() => setSelectedEvent(null)}>
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
                  </IconButton>
                </div>

                <p className="mb-1 text-sm font-semibold text-primary">{selectedEvent.club_name || 'Club Event'}</p>
                <h2 className="mb-4 text-2xl font-bold text-text-primary">{selectedEvent.title}</h2>

                {selectedEvent.description ? (
                  <p className="mb-4 whitespace-pre-wrap text-sm text-text-secondary">{selectedEvent.description}</p>
                ) : null}

                {selectedEvent.keywords ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedEvent.keywords.split(',').map((keyword, index) => (
                      <span
                        key={`${keyword}-${index}`}
                        className="rounded-lg border border-border-subtle bg-gray-100 px-2.5 py-1 text-xs font-medium text-text-secondary dark:border-[#34485c] dark:bg-border-strong"
                      >
                        {keyword.trim()}
                      </span>
                    ))}
                  </div>
                ) : null}

                {selectedEvent.is_paid ? (
                  <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 p-3 dark:border-orange-500/20 dark:bg-orange-500/5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-bold text-orange-600 dark:text-orange-400">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">payments</span>
                        Registration Fee
                      </span>
                      <span className="text-sm font-bold text-text-primary dark:text-white">{selectedEvent.registration_fees || 'TBA'}</span>
                    </div>
                    {selectedEvent.payment_link ? (
                      <a href={selectedEvent.payment_link} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
                        <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5" aria-hidden="true">open_in_new</span>
                        Pay via link
                      </a>
                    ) : null}
                  </div>
                ) : null}

                <div className="mb-6 flex-1 space-y-3">
                  {selectedEvent.start_time ? (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="material-symbols-outlined text-[20px] text-text-secondary" aria-hidden="true">schedule</span>
                      <div>
                        <p className="font-medium text-text-primary dark:text-white">
                          {new Date(selectedEvent.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {' - '}
                          {selectedEvent.end_time ? new Date(selectedEvent.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {selectedEvent.end_time && selectedEvent.start_time
                            ? `${Math.round((new Date(selectedEvent.end_time) - new Date(selectedEvent.start_time)) / 3600000)} hours`
                            : ''}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {selectedEvent.location ? (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="material-symbols-outlined text-[20px] text-text-secondary" aria-hidden="true">location_on</span>
                      <p className="font-medium text-text-primary dark:text-white">{selectedEvent.location}</p>
                    </div>
                  ) : null}

                  {selectedEvent.recent_activity > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                      <span className="font-medium italic text-green-400">{selectedEvent.recent_activity}+ registered in last hour</span>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <Button
                    type="button"
                    variant={selectedEvent.is_rsvped ? 'danger' : 'primary'}
                    onClick={() => handleRSVP(selectedEvent.id, selectedEvent.is_rsvped)}
                    className={selectedEvent.is_rsvped ? 'w-full bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'w-full'}
                  >
                    {selectedEvent.is_rsvped ? 'Unregister' : 'Register'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={addToGoogleCalendar} className="w-full border border-border-subtle">
                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">calendar_month</span>
                    Add to Google Calendar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {dayEventsModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm safe-area-y" onClick={() => setDayEventsModal({ open: false, day: null, events: [] })}>
          <div
            className="w-full max-w-md rounded-2xl border border-border-subtle bg-white p-4 shadow-2xl dark:border-border-strong dark:bg-[#1a2632]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Events on {new Date(year, month, dayEventsModal.day).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h3>
              <IconButton ariaLabel="Close day events" variant="soft" size="sm" onClick={() => setDayEventsModal({ open: false, day: null, events: [] })}>
                <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
              </IconButton>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {dayEventsModal.events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => {
                    setDayEventsModal({ open: false, day: null, events: [] });
                    void openEventDetail(event.id);
                  }}
                  className="w-full rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-surface-muted/80 dark:border-border-strong"
                >
                  <p className="text-sm font-semibold">{event.title}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    {event.start_time ? new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Time TBA'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
};

export default StudentCalendar;
