import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth-context';
import { warmPosterCacheForEvents, warmPosterImageCache } from '../../lib/utils';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
import { EventPosterFallback } from '../ui/event-poster-fallback';
import { IconButton } from '../ui/icon-button';
import { SearchBar } from '../ui/search-bar';
import { Skeleton } from '../ui/skeleton';

const API = '';

const eventMatchesSearch = (event, rawQuery) => {
  const query = String(rawQuery || '').trim().toLowerCase();
  if (!query) return true;
  return [event.title, event.description, event.tag]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(query));
};

const ClubsCalendarTab = ({
  club = null,
  searchQuery = '',
  setSearchQuery = () => {},
  onOpenEditModal = () => {},
  onOpenCreateModal = () => {},
}) => {
  const { user } = useAuth();
  const [allEvents, setAllEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEventDetail, setLoadingEventDetail] = useState(false);
  const [dayEventsModal, setDayEventsModal] = useState({ open: false, day: null, events: [] });

  useEffect(() => {
    if (user) {
      fetchAllEvents();
    }
  }, [user, club]);

  const fetchAllEvents = async () => {
    try {
      const res = await fetch(`${API}/api/events/all`);
      if (res.ok) {
        const eventRows = await res.json();
        warmPosterCacheForEvents(eventRows);
        setAllEvents(eventRows);
      }
    } catch (err) { console.error(err); }
    finally { setLoadingEvents(false); }
  };

  const openEventDetail = async (eventId, isOwnClub = false) => {
    if (!user?.id) return;

    try {
      setLoadingEventDetail(true);
      const res = await fetch(`${API}/api/events/${eventId}?user_id=${user.id}`);
      if (res.ok) {
        const eventDetail = await res.json();
        warmPosterImageCache(eventDetail?.image_url);
        setSelectedEvent({ ...eventDetail, __isOwnClub: isOwnClub });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEventDetail(false);
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

  const filteredEvents = allEvents.filter(e => eventMatchesSearch(e, searchQuery));

  const eventsByDate = {};
  filteredEvents.forEach(e => {
    if (!e.start_time) return;
    const d = new Date(e.start_time);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!eventsByDate[day]) eventsByDate[day] = [];
      eventsByDate[day].push(e);
    }
  });

  const handleDayClick = (day) => {
    const d = new Date(year, month, day);
    // Open Quick Create modal prefilled with this date
    onOpenCreateModal(d);
  };

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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-panel">
      <div className="flex items-center justify-between border-b border-border-subtle bg-surface-panel px-4 py-4 lg:px-8">
        <h1 className="truncate text-balance text-xl font-semibold text-text-primary">{monthName}</h1>

        <div className="ml-3 flex min-w-0 flex-1 items-center justify-end gap-3">
          <div className="w-full max-w-xl">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search events"
              showEscHint
              escHintClassName="hidden lg:inline"
            />
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <IconButton ariaLabel="Previous month" variant="soft" size="sm" onClick={prevMonth}>
              <span className="material-symbols-outlined text-subheading" aria-hidden="true">chevron_left</span>
            </IconButton>
            <IconButton ariaLabel="Next month" variant="soft" size="sm" onClick={nextMonth}>
              <span className="material-symbols-outlined text-subheading" aria-hidden="true">chevron_right</span>
            </IconButton>
          </div>
        </div>
      </div>

      {loadingEvents ? (
        <div className="grid flex-1 place-content-center gap-3 px-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-28 w-72 max-w-full" />
        </div>
      ) : (
        <section className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:p-4 md:p-6">
          <div className="mb-2 grid grid-cols-7">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-text-secondary">{day}</div>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7 border-l border-t border-border-subtle">
            {calendarDays.map((dayItem, index) => {
              const dayEvents = dayItem.current ? (eventsByDate[dayItem.day] || []) : [];

              return (
                <div
                  key={`${dayItem.day}-${index}`}
                  onClick={() => {
                    if (dayItem.current) handleDayClick(dayItem.day);
                  }}
                  className={`min-h-20 border-b border-r border-border-subtle p-1 sm:min-h-24 md:min-h-28 ${
                    !dayItem.current ? 'bg-[#f9fafb] dark:bg-[#0c1218]' : 'bg-white dark:bg-[#111a22]'
                  } ${dayItem.current ? 'cursor-pointer' : ''}`}
                >
                  <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday(dayItem.day) && dayItem.current
                      ? 'bg-primary font-bold text-white'
                      : dayItem.current
                        ? 'text-text-primary dark:text-white'
                        : 'text-text-secondary/40'
                  }`}
                  >
                    {dayItem.day}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-0.5">
                    {dayEvents.slice(0, 2).map(e => {
                        const isOwnClub = e.club_id === club?.id;
                        return (
                      <button 
                        key={e.id} 
                        onClick={(ev) => {
                          ev.stopPropagation(); // so it doesn't click the day
                          void openEventDetail(e.id, isOwnClub);
                        }}
                        className={`mb-0.5 w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-colors
                          ${!isOwnClub ? 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 cursor-pointer' : 
                            e.tag === 'TECH' ? 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer' : 
                            'bg-green-500/20 text-green-400 hover:bg-green-500/30 cursor-pointer'}`}
                        title={e.title + (isOwnClub ? ' (View details and edit)' : ' (View details)')}
                      >
                        {e.title}
                      </button>
                    )})}
                    {dayEvents.length > 2 ? (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openDayEventsModal(dayItem.day, dayEvents);
                        }}
                        className="px-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!loadingEvents && filteredEvents.length === 0 ? (
        <div className="px-3 pb-4 sm:px-4 md:px-6">
          <EmptyState
            icon="event_busy"
            title="No events found"
            description="Try a different search, or create a new event for this month."
          />
        </div>
      ) : null}

      {loadingEventDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-md border border-border-subtle dark:border-border-strong p-8 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
            <p className="text-sm text-text-secondary dark:text-text-dark-secondary">Loading event details...</p>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-area-y" onClick={() => setSelectedEvent(null)}>
          <div
            className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-2xl modal-panel overflow-y-auto border border-border-subtle dark:border-border-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row h-full">
              <div className="w-full md:w-2/5 min-h-44 sm:min-h-52 md:min-h-87.5 bg-[#0f1720] relative overflow-hidden">
                {selectedEvent.image_url ? (
                  <img src={selectedEvent.image_url} alt={selectedEvent.title} className="h-full w-full object-cover" />
                ) : (
                  <EventPosterFallback title={selectedEvent.title} />
                )}
              </div>

              <div className="w-full md:w-3/5 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm text-text-secondary dark:text-text-dark-secondary">
                    {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    {' '}
                    {selectedEvent.start_time ? `• ${new Date(selectedEvent.start_time).toLocaleDateString('en-US', { weekday: 'long' })}` : ''}
                  </span>
                  <button
                    aria-label="Close event details"
                    onClick={() => setSelectedEvent(null)}
                    className="touch-target flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-muted dark:hover:bg-border-strong"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <p className="text-sm font-semibold text-primary mb-1">{selectedEvent.club_name || 'Club Event'}</p>

                <h2 className="text-2xl font-bold mb-4">{selectedEvent.title}</h2>

                {selectedEvent.description && (
                  <p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-4 whitespace-pre-wrap">{selectedEvent.description}</p>
                )}

                {selectedEvent.keywords && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedEvent.keywords.split(',').map((kw, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-gray-100 dark:bg-border-strong text-text-secondary dark:text-text-dark-secondary text-xs font-medium rounded-lg border border-border-subtle dark:border-border-strong"
                      >
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {selectedEvent.is_paid && (
                  <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 dark:border-orange-500/20 dark:bg-orange-500/5">
                    <div className="flex min-h-8 items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-sm font-bold leading-none text-orange-600 dark:text-orange-400">
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                        Registration Fee
                      </span>
                      <span className="shrink-0 text-sm font-bold leading-none tabular-nums text-text-primary dark:text-white">{selectedEvent.registration_fees || 'TBA'}</span>
                    </div>
                    {selectedEvent.payment_link && (
                      <a
                        href={selectedEvent.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group mt-1.5 flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                      >
                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">open_in_new</span>
                        Payment Link
                      </a>
                    )}
                  </div>
                )}

                <div className="space-y-3 flex-1">
                  {selectedEvent.start_time && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="material-symbols-outlined text-[20px] text-text-secondary">schedule</span>
                      <div>
                        <p className="font-medium">
                          {new Date(selectedEvent.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {' - '}
                          {selectedEvent.end_time ? new Date(selectedEvent.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                        </p>
                        <p className="text-xs text-text-secondary dark:text-text-dark-secondary">
                          {selectedEvent.end_time && selectedEvent.start_time
                            ? `${Math.round((new Date(selectedEvent.end_time) - new Date(selectedEvent.start_time)) / 3600000)} hours`
                            : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="material-symbols-outlined text-[20px] text-text-secondary">location_on</span>
                      <p className="font-medium">{selectedEvent.location}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-[20px] text-text-secondary">group</span>
                    <p className="font-medium">{selectedEvent.rsvp_count || 0} registered</p>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-border-subtle dark:border-border-strong">
                  {selectedEvent.__isOwnClub ? (
                    <Button
                      type="button"
                      onClick={() => {
                        onOpenEditModal(selectedEvent);
                        setSelectedEvent(null);
                      }}
                      className="w-full text-sm font-bold"
                    >
                      Edit Event
                    </Button>
                  ) : (
                    <p className="text-xs text-text-secondary dark:text-text-dark-secondary">
                      View-only event details for other clubs. Use your event management tab to edit your own events.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {dayEventsModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm safe-area-y" onClick={() => setDayEventsModal({ open: false, day: null, events: [] })}>
          <div
            className="w-full max-w-md rounded-2xl border border-border-subtle bg-white p-4 shadow-2xl dark:border-border-strong dark:bg-[#1a2632]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Events on {new Date(year, month, dayEventsModal.day).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</h3>
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
                    const isOwnClub = event.club_id === club?.id;
                    setDayEventsModal({ open: false, day: null, events: [] });
                    void openEventDetail(event.id, isOwnClub);
                  }}
                  className="w-full rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-surface-muted/80 dark:border-border-strong"
                >
                  <p className="text-sm font-semibold">{event.title}</p>
                  <p className="mt-0.5 text-xs text-text-secondary dark:text-text-dark-secondary">
                    {event.start_time ? new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'Time TBA'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ClubsCalendarTab;
