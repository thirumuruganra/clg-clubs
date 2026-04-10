import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth-context';

const API = '';

const eventMatchesSearch = (event, rawQuery) => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  return [event.title, event.description, event.tag]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(query));
};

const AdminCalendar = ({ club, searchQuery, onOpenEditModal, onOpenCreateModal }) => {
  const { user } = useAuth();
  const [allEvents, setAllEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loadingEventDetail, setLoadingEventDetail] = useState(false);

  useEffect(() => {
    if (user && club) {
      fetchAllEvents();
    }
  }, [user, club]);

  const fetchAllEvents = async () => {
    try {
      const res = await fetch(`${API}/api/events/all`);
      if (res.ok) setAllEvents(await res.json());
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111a22]">
      <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22]">
        <div className="flex items-center gap-2 md:gap-3">
          <button aria-label="Previous month" onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
            <span className="material-symbols-outlined text-[24px]">chevron_left</span>
          </button>
          <h1 className="text-xl md:text-2xl font-bold leading-none">{monthName}</h1>
          <button aria-label="Next month" onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
            <span className="material-symbols-outlined text-[24px]">chevron_right</span>
          </button>
        </div>
      </div>
      
      {loadingEvents ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-primary text-[40px]">progress_activity</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-y-auto px-4 md:px-6 pt-4 pb-6 bg-[#f0f2f4] dark:bg-[#0c1218]">
          <div className="grid grid-cols-7 mb-2 border-b border-transparent">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <div key={i} className="text-center font-medium text-xs text-[#637588] dark:text-[#92adc9] py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 border-t border-l border-[#e5e7eb] dark:border-[#233648] bg-[#f9fafb] dark:bg-[#111a22]">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="border-r border-b border-[#e5e7eb] dark:border-[#233648] bg-[#f9fafb] dark:bg-[#0c1218] p-1.5" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isToday = dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const dayEvents = eventsByDate[dayNum] || [];
              
              return (
                <div 
                  key={dayNum} 
                  onClick={() => handleDayClick(dayNum)}
                  className={`border-r border-b border-[#e5e7eb] dark:border-[#233648] min-h-25 p-1.5 flex flex-col cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5 
                  bg-white dark:bg-[#111a22] group`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white font-bold' : 'text-[#111418] dark:text-white'}`}>
                      {dayNum}
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-transparent group-hover:text-[#637588] transition-colors">add</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar">
                    {dayEvents.map(e => {
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loadingEventDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-md border border-[#e5e7eb] dark:border-[#233648] p-8 flex flex-col items-center gap-4">
            <span className="material-symbols-outlined animate-spin text-primary text-[36px]">progress_activity</span>
            <p className="text-sm text-[#637588] dark:text-[#92adc9]">Loading event details...</p>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#e5e7eb] dark:border-[#233648]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row h-full">
              <div
                className="w-full md:w-2/5 min-h-50 md:min-h-87.5 bg-cover bg-center bg-gray-700 relative"
                style={selectedEvent.image_url ? { backgroundImage: `url("${selectedEvent.image_url}")` } : {}}
              >
                <div className="absolute top-3 left-3">
                  <span className="bg-primary/90 text-white text-xs font-medium px-2 py-1 rounded-md">{selectedEvent.club_name || 'Club Event'}</span>
                </div>
              </div>

              <div className="w-full md:w-3/5 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm text-[#637588] dark:text-[#92adc9]">
                    {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    {' '}
                    {selectedEvent.start_time ? `• ${new Date(selectedEvent.start_time).toLocaleDateString('en-US', { weekday: 'long' })}` : ''}
                  </span>
                  <button
                    aria-label="Close event details"
                    onClick={() => setSelectedEvent(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <h2 className="text-2xl font-bold mb-4">{selectedEvent.title}</h2>

                {selectedEvent.description && (
                  <p className="text-sm text-[#637588] dark:text-[#92adc9] mb-4 whitespace-pre-wrap">{selectedEvent.description}</p>
                )}

                {selectedEvent.keywords && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedEvent.keywords.split(',').map((kw, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-gray-100 dark:bg-[#233648] text-[#637588] dark:text-[#92adc9] text-xs font-medium rounded-lg border border-[#e5e7eb] dark:border-[#34485c]"
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
                      <span className="text-sm font-bold text-[#111418] dark:text-white">{selectedEvent.registration_fees || 'TBA'}</span>
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
                      <span className="material-symbols-outlined text-[20px] text-[#637588]">schedule</span>
                      <div>
                        <p className="font-medium">
                          {new Date(selectedEvent.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          {' - '}
                          {selectedEvent.end_time ? new Date(selectedEvent.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                        </p>
                        <p className="text-xs text-[#637588] dark:text-[#92adc9]">
                          {selectedEvent.end_time && selectedEvent.start_time
                            ? `${Math.round((new Date(selectedEvent.end_time) - new Date(selectedEvent.start_time)) / 3600000)} hours`
                            : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="material-symbols-outlined text-[20px] text-[#637588]">location_on</span>
                      <p className="font-medium">{selectedEvent.location}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-[20px] text-[#637588]">group</span>
                    <p className="font-medium">{selectedEvent.rsvp_count || 0} registered</p>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-[#e5e7eb] dark:border-[#233648]">
                  {selectedEvent.__isOwnClub ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenEditModal(selectedEvent);
                        setSelectedEvent(null);
                      }}
                      className="w-full py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                      Edit Event
                    </button>
                  ) : (
                    <p className="text-xs text-[#637588] dark:text-[#92adc9]">
                      View-only event details for other clubs. Use your event management tab to edit your own events.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
