import React, { useMemo, useState } from 'react';

const EventManagementTab = ({
  setActiveTab,
  totalEvents,
  totalRSVPs,
  attendanceRate,
  tableError,
  events,
  searchQuery,
  eventMatchesSearch,
  openRsvpModal,
  openQrModal,
  openEditModal,
  setDeleteTarget,
}) => {
  const [tagFilter, setTagFilter] = useState('all');

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesQuery = eventMatchesSearch(event, searchQuery);
      const matchesTag = tagFilter === 'all' || event.tag === tagFilter;
      return matchesQuery && matchesTag;
    });
  }, [events, eventMatchesSearch, searchQuery, tagFilter]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Event Management</h1>
          <p className="mt-1 text-[#637588] dark:text-[#92adc9]">Create, edit, and track participation for club activities.</p>
        </div>
        <button onClick={() => setActiveTab('create-event')} className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary/90 sm:w-auto">
          <span className="material-symbols-outlined text-[18px]">add</span> Create Event
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
        {[
          { label: 'Upcoming Events', value: totalEvents, icon: 'event_available' },
          { label: 'Total Registrations', value: totalRSVPs, icon: 'group' },
          { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: 'analytics' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#e5e7eb] bg-white p-4 dark:border-[#233648] dark:bg-[#1a2632] sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-primary/10 p-2">
                <span className="material-symbols-outlined text-[24px] text-primary">{stat.icon}</span>
              </div>
            </div>
            <p className="mb-1 text-sm text-[#637588] dark:text-[#92adc9]">{stat.label}</p>
            <p className="text-2xl font-bold sm:text-3xl">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'TECH', label: 'Tech' },
          { value: 'NON_TECH', label: 'Non-Tech' },
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setTagFilter(filter.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              tagFilter === filter.value
                ? 'border-primary bg-primary text-white'
                : 'border-[#e5e7eb] bg-white text-[#637588] hover:border-primary/40 hover:text-primary dark:border-[#233648] dark:bg-[#1a2632] dark:text-[#92adc9]'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {tableError && <p className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{tableError}</p>}

      <div className="table-scroll overflow-hidden rounded-xl border border-[#e5e7eb] bg-white dark:border-[#233648] dark:bg-[#1a2632]">
        <table className="w-full min-w-180">
          <thead>
            <tr className="border-b border-[#e5e7eb] dark:border-[#233648]">
              {['Event Name', 'Category', 'Date', 'Registered', 'Actions'].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[#637588] dark:text-[#92adc9]">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm italic text-[#637588] dark:text-[#92adc9]">
                  No events match current filters.
                </td>
              </tr>
            )}
            {filteredEvents.map((event) => (
              <tr key={event.id} className="border-b border-[#e5e7eb] transition-colors hover:bg-[#f9fafb] dark:border-[#233648] dark:hover:bg-[#233648]/50">
                <td className="group cursor-pointer px-4 py-3" onClick={() => openRsvpModal(event)}>
                  <div className="flex items-center gap-3">
                    <div className="h-[3.125rem] w-10 shrink-0 overflow-hidden rounded-lg bg-[#0f1720]">
                      {event.image_url ? <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div>
                      <p className="text-sm font-bold transition-colors group-hover:text-primary">{event.title}</p>
                      <p className="text-xs text-[#637588] dark:text-[#92adc9]">{event.location || 'No location'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${event.tag === 'TECH' ? 'bg-primary/10 text-primary' : 'bg-[#f0f2f4] text-[#637588] dark:bg-[#233648] dark:text-[#92adc9]'}`}>
                    {event.tag || 'General'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">{event.start_time ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{event.rsvp_count || 0}</span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e5e7eb] dark:bg-[#233648]">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (event.rsvp_count || 0) / 2)}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      aria-label={`Attendance QR for ${event.title}`}
                      onClick={() => openQrModal(event)}
                      className={`h-8 w-8 rounded-full transition-colors ${event.attendance_qr_open ? 'bg-primary/20 hover:bg-primary/30' : 'hover:bg-[#f0f2f4] dark:hover:bg-[#233648]'}`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${event.attendance_qr_open ? 'text-primary' : 'text-[#637588]'}`}>qr_code_2</span>
                    </button>
                    <button aria-label={`Edit ${event.title}`} onClick={() => openEditModal(event)} className="h-8 w-8 rounded-full transition-colors hover:bg-[#f0f2f4] dark:hover:bg-[#233648]">
                      <span className="material-symbols-outlined text-[18px] text-[#637588]">edit</span>
                    </button>
                    <button aria-label={`Delete ${event.title}`} onClick={() => setDeleteTarget(event)} className="h-8 w-8 rounded-full transition-colors hover:bg-red-500/10">
                      <span className="material-symbols-outlined text-[18px] text-red-400">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventManagementTab;
