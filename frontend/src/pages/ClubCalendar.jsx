import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth-context';
import { warmPosterCacheForEvents, warmPosterImageCache } from '../lib/utils';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { IconButton } from '../components/ui/icon-button';
import { Skeleton } from '../components/ui/skeleton';

const API = '';

const eventMatchesSearch = (event, rawQuery) => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  return [event.title, event.description, event.tag]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(query));
};

const ClubCalendar = ({ club, searchQuery, onOpenEditModal, onOpenCreateModal }) => {
  const { user } = useAuth();
  const [allEvents, setAllEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEventDetail, setLoadingEventDetail] = useState(false);
  const [dayEventsModal, setDayEventsModal] = useState({ open: false, day: null, events: [] });

  useEffect(() => {
    if (user && club) {
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-panel">
      <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border-subtle dark:border-border-strong bg-white dark:bg-surface-panel">
        <div className="flex items-center gap-2 md:gap-3">
          <IconButton ariaLabel="Previous month" variant="soft" size="sm" onClick={prevMonth}>
            <span className="material-symbols-outlined text-[24px]">chevron_left</span>
          </IconButton>
          <h1 className="text-xl md:text-2xl font-bold leading-none">{monthName}</h1>
          <IconButton ariaLabel="Next month" variant="soft" size="sm" onClick={nextMonth}>
            <span className="material-symbols-outlined text-[24px]">chevron_right</span>
          </IconButton>
        </div>
      </div>

      {loadingEvents ? (
        <div className="grid flex-1 place-content-center gap-3 px-6">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-28 w-72 max-w-full" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto px-3 sm:px-4 md:px-6 pt-4 pb-6 bg-surface-muted dark:bg-background-dark">
          <div className="grid grid-cols-7 mb-2 border-b border-transparent">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <div key={i} className="text-center font-medium text-xs text-text-secondary dark:text-text-dark-secondary py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 border-t border-l border-border-subtle dark:border-border-strong bg-surface-muted dark:bg-surface-panel">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b border-border-subtle dark:border-border-strong bg-surface-muted dark:bg-background-dark p-1.5" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isToday = dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayEvents = eventsByDate[dayNum] || [];
              
              return (
                <div 
                  key={dayNum} 
                  onClick={() => handleDayClick(dayNum)}
                  className={`border-r border-b border-border-subtle dark:border-border-strong min-h-20 sm:min-h-24 md:min-h-25 p-1 flex flex-col cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 
                  bg-white dark:bg-surface-panel group`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white font-bold' : 'text-text-primary dark:text-white'}`}>
                      {dayNum}
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-transparent group-hover:text-text-secondary transition-colors">add</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar">
                    {dayEvents.slice(0, 2).map(e => {
                        const isOwnClub = e.club_id === club?.id;
                        return (
                      <button 
                        key={e.id} 
                        onClick={(ev) => {
                          ev.stopPropagation(); // so it doesn't click the day
                          void openEventDetail(e.id, isOwnClub);
                        }}
                        className={`w-full text-left truncate px-1.5 py-0.5 rounded text-[10px] font-medium mb-0.5 transition-colors
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
                          openDayEventsModal(dayNum, dayEvents);
                        }}
                        className="w-full truncate px-1 text-left text-[10px] font-medium text-primary underline-offset-2 hover:underline"
                      >
                        +{dayEvents.length - 2} more
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
                ) : null}
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
                  <div className="mb-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">payments</span>
                        Registration Fee
                      </span>
                      <span className="text-sm font-bold text-text-primary dark:text-white">{selectedEvent.registration_fees || 'TBA'}</span>
                    </div>
                    {selectedEvent.payment_link && (
                      <a
                        href={selectedEvent.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline group"
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

export default ClubCalendar;
