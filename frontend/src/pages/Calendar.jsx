import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import wavcIcon from '../assets/WAVC-edit.png';

const API = '';

const Calendar = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    if (!loading && !user) { navigate('/login'); return; }
    if (user) fetchEvents();
  }, [user, loading]);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API}/api/events/all`);
      if (res.ok) setEvents(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoadingEvents(false); }
  };

  const handleRSVP = async (eventId) => {
    try {
      const res = await fetch(`${API}/api/rsvp/events/${eventId}/rsvp?user_id=${user.id}`, { method: 'POST' });
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
      if (res.ok) setSelectedEvent(await res.json());
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
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background-dark text-white"><div className="animate-pulse">Loading...</div></div>;

  return (
    <div className="flex h-screen w-full bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white overflow-hidden relative">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>
      )}

      {/* Left Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 w-72 flex-shrink-0 border-r border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22] flex flex-col p-6 overflow-y-auto transition-transform duration-300 ease-in-out`}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="size-8"><img src={wavcIcon} alt="WAVC" className="w-full h-full object-contain" /></div>
          <span className="text-lg font-bold">WAVC</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 mb-8">
          {[{ label: 'Home', icon: 'home', path: '/dashboard' }, { label: 'Events', icon: 'event', path: '/calendar', active: true }, { label: 'Clubs', icon: 'groups', path: '/dashboard' }, { label: 'My Profile', icon: 'person', path: '/profile' }].map(item => (
            <button key={item.label} onClick={() => navigate(item.path)} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${item.active ? 'bg-primary/10 text-primary' : 'text-[#637588] dark:text-[#92adc9] hover:bg-[#f0f2f4] dark:hover:bg-[#233648]'}`}>
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Mini Calendar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-bold">{monthName}</span>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0 text-center text-xs">
            {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="py-1 text-[#637588] dark:text-[#92adc9] font-medium">{d}</div>)}
            {calendarDays.map((d, i) => {
              const hasEvents = d.current && getEventsForDay(d.day).length > 0;
              return (
                <div key={i} className={`py-1.5 rounded-full text-xs cursor-pointer transition-colors relative
                  ${!d.current ? 'text-[#637588]/40' : ''}
                  ${d.current && isToday(d.day) ? 'bg-primary text-white font-bold' : ''}
                  ${d.current && !isToday(d.day) ? 'hover:bg-[#233648]' : ''}
                `}>
                  {d.day}
                  {hasEvents && <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"></div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Club Categories */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9] mb-3">Club Categories</h3>
          {[{ label: 'All Events', value: 'all', color: 'bg-primary' }, { label: 'Tech Clubs', value: 'tech', color: 'bg-pink-500' }, { label: 'Non-Tech Clubs', value: 'nontech', color: 'bg-green-500' }].map(cat => (
            <button key={cat.value} onClick={() => setCategoryFilter(cat.value)} className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${categoryFilter === cat.value ? 'bg-[#233648] text-white' : 'text-[#92adc9] hover:bg-[#233648]/50'}`}>
              <div className={`w-4 h-4 rounded-full ${cat.color} ${categoryFilter === cat.value ? 'ring-2 ring-white/50' : 'opacity-50'}`}></div>
              {cat.label}
            </button>
          ))}
        </div>

        {/* My Schedule */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9] mb-3">My Schedule</h3>
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-[#92adc9]">
            <span className="material-symbols-outlined text-[20px]">event_available</span>
            {myScheduleCount} events this week
          </div>
        </div>

        {/* Request Event */}
        <button className="mt-auto flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#233648] hover:bg-[#34485c] text-white text-sm font-medium transition-colors">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Request Event
        </button>
      </aside>

      {/* Main Calendar Area */}
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22]">
          <div className="flex items-center gap-2 md:gap-4">
            <button className="md:hidden p-1 rounded hover:bg-[#233648] transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <h1 className="text-xl md:text-2xl font-bold truncate max-w-[120px] md:max-w-none">{monthName}</h1>
            <div className="flex gap-1 bg-[#233648] rounded-lg p-0.5">
              {['Day', 'Week', 'Month'].map(v => <button key={v} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${v === 'Month' ? 'bg-primary text-white' : 'text-[#92adc9] hover:text-white'}`}>{v}</button>)}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end">
            <label className="flex items-stretch rounded-xl h-9 bg-[#f0f2f4] dark:bg-[#233648] max-w-[150px] md:max-w-xs w-full">
              <div className="flex items-center justify-center pl-3"><span className="material-symbols-outlined text-[18px] md:text-[20px] text-[#637588] dark:text-[#92adc9]">search</span></div>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none text-sm px-2 focus:outline-none text-[#111418] dark:text-white placeholder:text-[#637588] w-full" placeholder="Search..." />
            </label>
            <button className="p-2 rounded-full hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[20px]">notifications</span></button>
            <button onClick={() => navigate('/profile')} className="focus:outline-none">
              {user?.picture ? <div className="bg-center bg-cover rounded-full size-9 ring-2 ring-white/10" style={{ backgroundImage: `url("${user.picture}")` }}></div>
                : <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{(user?.name || 'S')[0]}</div>}
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center text-xs font-medium text-[#637588] dark:text-[#92adc9] py-2">{d}</div>)}
          </div>
          {/* Calendar cells */}
          <div className="grid grid-cols-7 border-t border-l border-[#e5e7eb] dark:border-[#233648] flex-1">
            {calendarDays.map((d, i) => {
              const dayEvents = d.current ? getEventsForDay(d.day) : [];
              return (
                <div key={i} className={`border-r border-b border-[#e5e7eb] dark:border-[#233648] min-h-[100px] p-1.5 ${!d.current ? 'bg-[#f9fafb] dark:bg-[#0c1218]' : 'bg-white dark:bg-[#111a22]'}`}>
                  <div className={`text-xs mb-1 ${isToday(d.day) && d.current ? 'bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center font-bold' : d.current ? 'text-[#111418] dark:text-white' : 'text-[#637588]/40'}`}>
                    {d.day}
                  </div>
                  {dayEvents.slice(0, 2).map(ev => (
                    <button key={ev.id} onClick={() => openEventDetail(ev.id)} className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium mb-0.5 truncate transition-colors ${ev.tag === 'TECH' ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-[#e5e7eb] dark:border-[#233648]" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col md:flex-row h-full">
              {/* Event Image */}
              <div className="w-full md:w-2/5 min-h-[200px] md:min-h-[350px] bg-cover bg-center bg-gray-700 relative" style={selectedEvent.image_url ? { backgroundImage: `url("${selectedEvent.image_url}")` } : {}}>
                <div className="absolute top-3 left-3"><span className="bg-primary/90 text-white text-xs font-medium px-2 py-1 rounded-md">{selectedEvent.club_name}</span></div>
              </div>
              {/* Event Info */}
              <div className="w-full md:w-3/5 p-6 flex flex-col">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm text-[#637588] dark:text-[#92adc9]">
                    {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} • {selectedEvent.start_time ? new Date(selectedEvent.start_time).toLocaleDateString('en-US', { weekday: 'long' }) : ''}
                  </span>
                  <button onClick={() => setSelectedEvent(null)} className="p-1 rounded-full hover:bg-[#233648]"><span className="material-symbols-outlined">close</span></button>
                </div>
                <h2 className="text-2xl font-bold mb-4">{selectedEvent.title}</h2>

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
                  <button onClick={() => handleRSVP(selectedEvent.id)} disabled={selectedEvent.is_rsvped}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${selectedEvent.is_rsvped ? 'bg-green-500/20 text-green-400 cursor-default' : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/30 active:scale-[0.98]'}`}>
                    {selectedEvent.is_rsvped ? '✓ You\'re going!' : 'I will be there'}
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
