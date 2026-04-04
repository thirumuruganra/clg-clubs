const fs = require('fs');
let file = fs.readFileSync('../frontend/src/pages/AdminDashboard.jsx', 'utf8');

const dashboardCode = file.substring(
  file.indexOf("{/* Header */}"), 
  file.indexOf("{/* Edit Event Modal */}")
);

const newContentArea = `
          {activeTab === 'dashboard' && (
            <>
${dashboardCode.split('\n').map(line => '              ' + line).join('\n')}
            </>
          )}

          {activeTab === 'events' && (
            <div className="flex flex-col h-full bg-white dark:bg-[#111a22] rounded-xl border border-[#e5e7eb] dark:border-[#233648] overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#e5e7eb] dark:border-[#233648]">
                <h2 className="text-xl md:text-2xl font-bold flex items-center gap-4">
                  <span className="material-symbols-outlined text-primary text-[28px]">calendar_month</span>
                  {monthName}
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[24px]">chevron_left</span></button>
                  <button onClick={nextMonth} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#f0f2f4] dark:hover:bg-[#233648] transition-colors"><span className="material-symbols-outlined text-[24px]">chevron_right</span></button>
                </div>
              </div>
              <div className="grid grid-cols-7 border-b border-[#e5e7eb] dark:border-[#233648] text-center bg-[#f9fafb] dark:bg-[#0c1218]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="py-3 text-xs font-bold text-[#637588] dark:text-[#92adc9] uppercase tracking-wider">{d}</div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                {calendarDays.map((d, i) => {
                  const dayEvents = getDayEvents(d.day, d.current);
                  return (
                    <div key={i} onClick={() => { if(d.current) openCreateModalForDate(year, month, d.day); }} className={\`border-r border-b border-[#e5e7eb] dark:border-[#233648] min-h-[120px] p-2 transition-colors \${!d.current ? 'bg-[#f9fafb] dark:bg-[#0c1218]' : 'bg-white dark:bg-[#1a2632] hover:bg-[#f0f2f4]/50 dark:hover:bg-[#233648]/30 cursor-pointer'}\`}>
                      <div className={\`text-sm mb-1.5 \${isToday(d.day) && d.current ? 'bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center font-bold shadow-md shadow-primary/20' : d.current ? 'text-[#111418] dark:text-white font-medium' : 'text-[#637588]/40'}\`}>
                        {d.day}
                      </div>
                      <div className="flex flex-col gap-1">
                        {dayEvents.map(ev => (
                          <div key={ev.id} onClick={(e) => { e.stopPropagation(); setEditEvent(ev); }} className={\`px-2 py-1 rounded text-[11px] font-bold truncate transition-colors \${ev.club_id === club?.id ? 'bg-primary text-white hover:bg-primary/90' : 'bg-[#e5e7eb] dark:bg-[#233648] text-[#111418] dark:text-white hover:brightness-95'}\`}>
                            {ev.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
`;

file = file.replace(dashboardCode, newContentArea);

// Change the header to say Dashboard instead of Event Management
file = file.replace(
  '<h1 className="text-3xl font-bold">Event Management</h1>',
  '<h1 className="text-3xl font-bold">Dashboard</h1>'
);

fs.writeFileSync('../frontend/src/pages/AdminDashboard.jsx', file);
