import React, { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { StatusBadge } from '../ui/status-badge';
import { Toast } from '../ui/toast';

const EventDateBadgeAvatar = ({ startTime }) => {
  if (!startTime) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border-strong bg-[#0b1320]">
        <span className="flex h-4 items-center justify-center border-b border-border-strong bg-[#122032] text-[9px] font-bold uppercase tracking-[0.12em] text-text-dark-secondary">TBD</span>
        <span className="flex flex-1 items-center justify-center text-sm font-black text-white">--</span>
      </div>
    );
  }

  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border-strong bg-[#0b1320]">
        <span className="flex h-4 items-center justify-center border-b border-border-strong bg-[#122032] text-[9px] font-bold uppercase tracking-[0.12em] text-text-dark-secondary">TBD</span>
        <span className="flex flex-1 items-center justify-center text-sm font-black text-white">--</span>
      </div>
    );
  }

  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.toLocaleDateString('en-US', { day: '2-digit' });

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-primary/30 bg-[#081321] shadow-[0_6px_16px_rgba(5,12,22,0.45)]">
      <span className="flex h-4 items-center justify-center border-b border-primary/35 bg-primary/20 text-[9px] font-bold uppercase tracking-[0.14em] text-primary">{month}</span>
      <span className="flex flex-1 items-center justify-center text-base font-black leading-none text-white">{day}</span>
    </div>
  );
};

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
  openOdSheet,
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
      <div className="dashboard-hero enter-rise mb-8 p-5 sm:p-7">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="kicker-label border-white/28 bg-white/10 text-white">Operations Deck</span>
            <h1 className="mt-4 font-display text-2xl font-bold text-white sm:text-4xl">Event Management</h1>
            <p className="mt-2 text-white/82">Create, edit, and track participation for every club activity from one command surface.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/24 px-3 py-2 text-sm text-white/84 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[18px]">insights</span>
            <span>{totalEvents} active events</span>
          </div>
        </div>
        <Button onClick={() => setActiveTab('create-event')} className="relative z-10 mt-5 w-full sm:mt-6 sm:w-auto">
          <span className="material-symbols-outlined text-[18px]">add</span> Create Event
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
        {[
          { label: 'Upcoming Events', value: totalEvents, icon: 'event_available' },
          { label: 'Total Registrations', value: totalRSVPs, icon: 'group' },
          { label: 'Attendance Rate', value: `${attendanceRate}%`, icon: 'analytics' },
        ].map((stat, index) => (
          <Card key={stat.label} className={`feature-card p-4 sm:p-6 ${index === 0 ? 'enter-rise enter-delay-1' : index === 1 ? 'enter-rise enter-delay-2' : 'enter-rise enter-delay-3'}`}>
            <div className="mb-4 flex items-start justify-between">
              <div className="rounded-lg border border-primary/25 bg-primary/12 p-2">
                <span className="material-symbols-outlined text-[24px] text-primary">{stat.icon}</span>
              </div>
            </div>
            <p className="mb-1 text-sm text-text-secondary dark:text-text-dark-secondary">{stat.label}</p>
            <p className="font-display text-3xl font-bold sm:text-4xl">{stat.value}</p>
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
            className="h-8 rounded-full border border-transparent px-3 text-xs font-semibold"
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {tableError ? <Toast tone="error" title="Unable to load events" description={tableError} className="mb-3" /> : null}

      <div className="table-scroll overflow-hidden rounded-2xl border border-border-subtle bg-surface-panel shadow-soft-sm dark:border-border-strong dark:bg-surface-elevated">
        <table className="w-full min-w-180">
          <thead className="bg-surface-muted dark:bg-border-strong/55">
            <tr className="border-b border-border-subtle dark:border-border-strong">
              {['Event Name', 'Category', 'Date', 'Registered', 'Actions'].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-text-secondary dark:text-text-dark-secondary">{header}</th>
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
              <tr key={event.id} className="border-b border-border-subtle transition-colors hover:bg-surface-muted dark:border-border-strong dark:hover:bg-border-strong/40">
                <td className="group cursor-pointer px-4 py-3" onClick={() => openRsvpModal(event)}>
                  <div className="flex items-center gap-3">
                    <div className="h-12.5 w-10 shrink-0 overflow-hidden rounded-lg bg-[#0f1720]">
                      {event.image_url ? <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" /> : <EventDateBadgeAvatar startTime={event.start_time} />}
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
                    <button
                      aria-label={`Open OD sheet for ${event.title}`}
                      onClick={() => openOdSheet(event)}
                      className="h-8 w-8 rounded-full transition-colors hover:bg-surface-muted dark:hover:bg-border-strong"
                    >
                      <span className="material-symbols-outlined text-[18px] text-text-secondary">table_view</span>
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
