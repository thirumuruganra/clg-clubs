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
                          if (isOwnClub) {
                             onOpenEditModal(e);
                          }
                        }}
                        className={`w-full text-left truncate px-1.5 py-0.5 rounded text-[10px] font-medium mb-0.5 transition-colors
                          ${!isOwnClub ? 'bg-gray-500/10 text-gray-500 cursor-default' : 
                            e.tag === 'TECH' ? 'bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer' : 
                            'bg-green-500/20 text-green-400 hover:bg-green-500/30 cursor-pointer'}`}
                        title={e.title + (!isOwnClub ? " (Other Club)" : "")}
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
    </div>
  );
};

export default AdminCalendar;
