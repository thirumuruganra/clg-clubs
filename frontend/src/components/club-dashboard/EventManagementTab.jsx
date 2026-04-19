import React, { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { StatusBadge } from '../ui/status-badge';
import { Toast } from '../ui/toast';

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
          <p className="mt-1 text-text-secondary dark:text-text-dark-secondary">Create, edit, and track participation for club activities.</p>
        </div>
        <Button onClick={() => setActiveTab('create-event')} className="w-full sm:w-auto">
          <span className="material-symbols-outlined text-[18px]">add</span> Create Event
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
        {[
          { label: 'Upcoming Events', value: totalEvents, icon: 'event_available' },
          { label: 'Total Registrations', value: totalRSVPs, icon: 'group' },
          { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: 'analytics' },
        ].map((stat) => (
          <Card key={stat.label} className="p-4 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg bg-primary/10 p-2">
                <span className="material-symbols-outlined text-[24px] text-primary">{stat.icon}</span>
              </div>
            </div>
            <p className="mb-1 text-sm text-text-secondary dark:text-text-dark-secondary">{stat.label}</p>
            <p className="text-2xl font-bold sm:text-3xl">{stat.value}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          { value: 'all', label: 'All' },
          { value: 'TECH', label: 'Tech' },
          { value: 'NON_TECH', label: 'Non-Tech' },
        ].map((filter) => (
          <Button
            key={filter.value}
            onClick={() => setTagFilter(filter.value)}
            variant={tagFilter === filter.value ? 'primary' : 'secondary'}
            size="sm"
            className="h-8 rounded-full px-3 text-xs"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {tableError ? <Toast tone="error" title="Unable to load events" description={tableError} className="mb-3" /> : null}

      <div className="table-scroll overflow-hidden rounded-xl border border-border-subtle bg-white dark:border-border-strong dark:bg-[#1a2632]">
        <table className="w-full min-w-180">
          <thead>
            <tr className="border-b border-border-subtle dark:border-border-strong">
              {['Event Name', 'Category', 'Date', 'Registered', 'Actions'].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-secondary dark:text-text-dark-secondary">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8">
                  <EmptyState
                    icon="event_busy"
                    title="No events match filters"
                    description="Adjust category filters or create a new event."
                    actionLabel="Create Event"
                    onAction={() => setActiveTab('create-event')}
                  />
                </td>
              </tr>
            )}
            {filteredEvents.map((event) => (
              <tr key={event.id} className="border-b border-border-subtle transition-colors hover:bg-surface-muted dark:border-border-strong dark:hover:bg-border-strong/50">
                <td className="group cursor-pointer px-4 py-3" onClick={() => openRsvpModal(event)}>
                  <div className="flex items-center gap-3">
                    <div className="h-12.5 w-10 shrink-0 overflow-hidden rounded-lg bg-[#0f1720]">
                      {event.image_url ? <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div>
                      <p className="text-sm font-bold transition-colors group-hover:text-primary">{event.title}</p>
                      <p className="text-xs text-text-secondary dark:text-text-dark-secondary">{event.location || 'No location'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={event.tag === 'TECH' ? 'info' : 'neutral'}>
                    {event.tag || 'General'}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3 text-sm">{event.start_time ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{event.rsvp_count || 0}</span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border-subtle dark:bg-border-strong">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (event.rsvp_count || 0) / 2)}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      aria-label={`Attendance QR for ${event.title}`}
                      onClick={() => openQrModal(event)}
                      className={`h-8 w-8 rounded-full transition-colors ${event.attendance_qr_open ? 'bg-primary/20 hover:bg-primary/30' : 'hover:bg-surface-muted dark:hover:bg-border-strong'}`}
                    >
                      <span className={`material-symbols-outlined text-[18px] ${event.attendance_qr_open ? 'text-primary' : 'text-text-secondary'}`}>qr_code_2</span>
                    </button>
                    <button aria-label={`Edit ${event.title}`} onClick={() => openEditModal(event)} className="h-8 w-8 rounded-full transition-colors hover:bg-surface-muted dark:hover:bg-border-strong">
                      <span className="material-symbols-outlined text-[18px] text-text-secondary">edit</span>
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
