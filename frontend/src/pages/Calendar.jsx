import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { getClubIconUrl, getClubInitial, warmPosterCacheForEvents, warmPosterImageCache } from '../lib/utils';
import StudentSidebar from '../components/StudentSidebar';

const API = '';

const eventMatchesSearch = (event, rawQuery) => {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;

  return [event.title, event.description, event.keywords]
    .filter(Boolean)
    .some((field) => field.toLowerCase().includes(query));
};

const Calendar = () => {
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

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/events/all`);
      if (res.ok) {
        const allEvents = await res.json();
        warmPosterCacheForEvents(allEvents);
        setEvents(allEvents);
      }
    } catch (err) { console.error(err); }
  }, []);

  const fetchClubs = useCallback(async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`${API}/api/clubs/?user_id=${user.id}`);
      if (res.ok) setClubs(await res.json());
    } catch (err) { console.error(err); }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) { navigate('/login'); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) { void fetchEvents(); void fetchClubs(); }
  }, [user, loading, navigate, fetchEvents, fetchClubs]);

  const handleRSVP = async (eventId, isRegistered) => {
    try {
      const method = isRegistered ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/api/rsvp/events/${eventId}/rsvp`, { method });
      if (res.ok) {
        fetchEvents();
        if (selectedEvent?.id === eventId) {
          const updated = await fetch(`${API}/api/events/${eventId}?user_id=${user.id}`);
          if (updated.ok) setSelectedEvent(await updated.json());
        }
      }
    } catch (err) { console.error(err); }
  };

  const openEventDetail = async (eventId) => {
    try {
      const res = await fetch(`${API}/api/events/${eventId}?user_id=${user?.id || ''}`);
      if (res.ok) {
        const eventDetail = await res.json();
        warmPosterImageCache(eventDetail?.image_url);
        setSelectedEvent(eventDetail);
      }
    } catch (err) { console.error(err); }
  };

  // Calendar helpers
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const filteredEvents = events.filter(e => {
    if (categoryFilter === 'tech' && e.tag !== 'TECH') return false;
    if (categoryFilter === 'nontech' && e.tag !== 'NON_TECH') return false;
    if (selectedClubId !== null && Number(e.club_id) !== selectedClubId) return false;
    if (!eventMatchesSearch(e, searchQuery)) return false;
    return true;
  });

  const categoryLegend = [
    { label: 'All Events', value: 'all', color: 'bg-gradient-to-r from-sky-400 via-primary to-green-500' },
    { label: 'Tech Clubs', value: 'tech', color: 'bg-primary' },
    { label: 'Non-Tech Clubs', value: 'nontech', color: 'bg-green-500' }
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

  const getEventsForDay = (day) => {
    return filteredEvents.filter(e => {
      if (!e.start_time) return false;
      const d = new Date(e.start_time);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const myScheduleCount = events.filter(e => e.is_rsvped).length;

  // Build calendar grid
  const calendarDays = [];
  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) calendarDays.push({ day: prevMonthDays - i, current: false });
  // Current month
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push({ day: d, current: true });
  // Fill remaining
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) calendarDays.push({ day: d, current: false });

  const isToday = (day) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  if (loading) return <div className="min-h-dvh flex items-center justify-center bg-background-dark text-white"><div className="animate-pulse">Loading...</div></div>;

  return (
    <div className="flex h-dvh w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white overflow-hidden relative">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      <StudentSidebar mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
        <div className="h-px bg-[#e5e7eb] dark:bg-[#233648] my-3" aria-hidden="true"></div>

        {/* Mini Calendar */}
        <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold">{monthName}</span>
          <div className="flex gap-1">
            <button aria-label="Previous month" onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[20px]">chevron_left</span></button>
            <button aria-label="Next month" onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[20px]">chevron_right</span></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-0 text-center text-[11px] sm:text-xs">
          {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="py-1 text-[#637588] dark:text-[#92adc9] font-medium">{d}</div>)}
          {calendarDays.map((d, i) => {
            const dayEvents = d.current ? getEventsForDay(d.day) : [];
            const hasEvents = dayEvents.length > 0;
            const dotClass = getMiniCalendarDotClass(dayEvents);
            return (
              <div key={i} className={`py-1.5 rounded-full text-xs cursor-pointer transition-colors relative
                ${!d.current ? 'text-[#637588]/40' : ''}
                ${d.current && isToday(d.day) ? 'bg-primary text-white font-bold' : ''}
                ${d.current && !isToday(d.day) ? 'hover:bg-[#233648]' : ''}
              `}>
                {d.day}
                {hasEvents && <div className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${dotClass}`}></div>}
              </div>
            );
          })}
        </div>
        </div>

        {/* My Schedule */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9] mb-3">My Schedule</h3>
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-[#92adc9]">
            <span className="material-symbols-outlined text-[20px]">event_available</span>
            {myScheduleCount} events this week
          </div>
        </div>

        <h3 className="text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9] mb-3">Filters</h3>

        {/* Club Categories */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9] mb-3">Club Categories</h3>
          {categoryLegend.map(cat => (
            <button key={cat.value} onClick={() => setCategoryFilter(cat.value)} className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${categoryFilter === cat.value ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:bg-[#233648]/50'}`}>
              <div className={`w-4 h-4 rounded-full ${cat.color} ${categoryFilter === cat.value ? 'ring-2 ring-white/50' : 'opacity-50'}`}></div>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Clubs */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9] mb-3">Clubs</h3>
          <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar pr-1">
            <button
              onClick={() => setSelectedClubId(null)}
              className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${selectedClubId === null ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:bg-[#233648]/50'}`}
            >
              <div className="size-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[10px] leading-none">groups</span>
              </div>
              <span className="flex-1 truncate">All Clubs</span>
            </button>

            {clubs.length === 0 && (
              <p className="text-xs text-[#637588] dark:text-[#92adc9] italic px-3 py-2">No clubs found</p>
            )}

            {clubs.map((club) => {
              const clubIconUrl = getClubIconUrl(club);

              return (
              <button
                key={club.id}
                onClick={() => setSelectedClubId(club.id)}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${selectedClubId === club.id ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:bg-[#233648]/50'}`}
              >
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {clubIconUrl ? <img src={clubIconUrl} alt={club.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <span className="text-primary text-xs font-bold">{getClubInitial(club)}</span>}
                </div>
                <span className="flex-1 truncate">{club.name}</span>
              </button>
              );
            })}
          </div>
        </div>
      </StudentSidebar>

      {/* Main Calendar Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22]">
          <div className="flex items-center gap-2 md:gap-3">
            <button aria-label="Open sidebar" className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <button aria-label="Previous month" onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
              <span className="material-symbols-outlined text-[24px]">chevron_left</span>
            </button>
            <h1 className="text-xl md:text-2xl font-bold leading-none">{monthName}</h1>
            <button aria-label="Next month" onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors">
              <span className="material-symbols-outlined text-[24px]">chevron_right</span>
            </button>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <label className="hidden sm:flex items-center rounded-xl h-9 bg-[#f0f2f4] dark:bg-[#233648] max-w-xs w-full">
              <div className="flex items-center justify-center pl-3"><span className="material-symbols-outlined text-[20px] text-[#637588] dark:text-[#92adc9]">search</span></div>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none text-sm px-2 focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] w-full" placeholder="Search..." />
            </label>
            <button aria-label="Notifications" className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-[#f0f2f4] dark:bg-[#233648] hover:bg-[#e5e7eb] dark:hover:bg-[#324b61] transition-colors"><span className="material-symbols-outlined text-[20px] leading-none">notifications</span></button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center text-xs font-medium text-[#637588] dark:text-[#92adc9] py-2">{d}</div>)}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7 border-t border-l border-[#e5e7eb] dark:border-[#233648] flex-1">
            {calendarDays.map((d, i) => {
              const dayEvents = d.current ? getEventsForDay(d.day) : [];
              return (
                <div key={i} className={`border-r border-b border-[#e5e7eb] dark:border-[#233648] min-h-20 sm:min-h-24 md:min-h-25 p-1 ${!d.current ? 'bg-[#f9fafb] dark:bg-[#0c1218]' : 'bg-white dark:bg-[#111a22]'}`}>
                  <div className={`text-xs mb-1 ${isToday(d.day) && d.current ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold' : d.current ? 'text-[#111418] dark:text-white' : 'text-[#637588]/40'}`}>
                    {d.day}
                  </div>
                  {dayEvents.slice(0, 2).map(ev => (
                    <button key={ev.id} onClick={() => openEventDetail(ev.id)} className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium mb-0.5 truncate transition-colors ${getEventPillClass(ev.tag)}`}>
                      {ev.title}
                    </button>
                  ))}
                  {dayEvents.length > 2 && <div className="text-[10px] text-[#637588] px-1">+{dayEvents.length - 2} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-area-y" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-2xl modal-panel overflow-y-auto border border-[#e5e7eb] dark:border-[#233648]" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row h-full">
              {/* Event Image */}
              <div className="w-full md:w-2/5 min-h-44 sm:min-h-52 md:min-h-87.5 bg-gray-700 relative flex items-center justify-center overflow-hidden">
                {selectedEvent.image_url ? (
                  <img src={selectedEvent.image_url} alt={selectedEvent.title} className="h-full w-full object-contain" />
                ) : null}
                <div className="absolute top-3 left-3"><span className="bg-primary/90 text-white text-xs font-medium px-2 py-1 rounded-md">{selectedEvent.club_name}</span></div>
              </div>
              {/* Event Info */}
              <div className="w-full md:w-3/5 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm text-[#637588] dark:text-[#92adc9]">
                    {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} • {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleDateString('en-US', { weekday: 'long' }) : ''}
                  </span>
                  <button aria-label="Close event details" onClick={() => setSelectedEvent(null)} className="touch-target w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
                </div>
                <h2 className="text-2xl font-bold mb-4">{selectedEvent.title}</h2>

                {selectedEvent.description && <p className="text-sm text-[#637588] dark:text-[#92adc9] mb-4 whitespace-pre-wrap">{selectedEvent.description}</p>}
                
                {selectedEvent.keywords && (
                  <div className="flex flex-wrap gap-2 mb-4">
                      {selectedEvent.keywords.split(",").map((kw, i) => (
                          <span key={i} className="px-2.5 py-1 bg-gray-100 dark:bg-[#233648] text-[#637588] dark:text-[#92adc9] text-xs font-medium rounded-lg border border-[#e5e7eb] dark:border-[#34485c]">{kw.trim()}</span>
                      ))}
                  </div>
                )}
                
                {selectedEvent.is_paid && (
                    <div className="mb-4 p-3 rounded-xl bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/20">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-orange-600 dark:text-orange-400 flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">payments</span> Registration Fee</span>
                            <span className="text-sm font-bold text-[#111418] dark:text-white">{selectedEvent.registration_fees || "TBA"}</span>
                        </div>
                        {selectedEvent.payment_link && (
                            <a href={selectedEvent.payment_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm font-bold text-primary hover:underline group">
                                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">open_in_new</span>
                                Pay via link
                            </a>
                        )}
                    </div>
                )}

                <div className="space-y-3 mb-6 flex-1">
                  {selectedEvent.start_time && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="material-symbols-outlined text-[20px] text-[#637588]">schedule</span>
                      <div>
                        <p className="font-medium">{new Date(selectedEvent.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {selectedEvent.end_time ? new Date(selectedEvent.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}</p>
                        <p className="text-xs text-[#637588] dark:text-[#92adc9]">{selectedEvent.end_time && selectedEvent.start_time ? Math.round((new Date(selectedEvent.end_time) - new Date(selectedEvent.start_time)) / 3600000) + ' hours' : ''}</p>
                      </div>
                    </div>
                  )}
                  {selectedEvent.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <span className="material-symbols-outlined text-[20px] text-[#637588]">location_on</span>
                      <p className="font-medium">{selectedEvent.location}</p>
                    </div>
                  )}
                  {selectedEvent.recent_activity > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-green-400 font-medium italic">{selectedEvent.recent_activity}+ registered in last hour</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <button onClick={() => handleRSVP(selectedEvent.id, selectedEvent.is_rsvped)}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${selectedEvent.is_rsvped ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30 active:scale-[0.98]'}`}>
                    {selectedEvent.is_rsvped ? 'Unregister' : 'Register'}
                  </button>
                  <button onClick={addToGoogleCalendar} className="w-full py-3 rounded-xl font-bold text-sm border border-[#e5e7eb] dark:border-[#233648] hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                    Add to Google Calendar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
