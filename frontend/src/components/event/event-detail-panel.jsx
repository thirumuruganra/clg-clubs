import React from 'react';
import { EventPosterFallback } from '../ui/event-poster-fallback';
import { IconButton } from '../ui/icon-button';
import { EventPaymentInfo } from './event-payment-info';

// Shared body of an event-detail modal: poster, date/close header, club name,
// title, payment info, schedule/location, description, keyword chips. Each
// caller supplies its own `actions` row (RSVP vs. edit/share) since those
// genuinely differ, and renders this inside its own modal shell/overlay.
export function EventDetailPanel({
  event,
  onClose,
  actions,
  belowActions,
  showRsvpCount = false,
  showRecentActivity = false,
}) {
  return (
    <div className="flex flex-col md:aspect-2/1 md:flex-row">
      <div className="relative aspect-4/5 w-full overflow-hidden bg-[#0f1720] md:h-full md:w-2/5 md:shrink-0">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} loading="lazy" decoding="async" className="h-full w-full object-contain" />
        ) : (
          <EventPosterFallback title={event.title} />
        )}
      </div>

      <div className="flex w-full min-h-0 flex-col p-6 md:h-full md:w-3/5 md:overflow-y-auto">
        <div className="mb-1 flex items-start justify-between">
          <span className="text-sm text-text-secondary">
            {event.start_time ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
            {' • '}
            {event.start_time ? new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long' }) : ''}
          </span>
          <IconButton ariaLabel="Close event details" variant="soft" size="sm" onClick={onClose}>
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
          </IconButton>
        </div>

        <p className="mb-1 text-sm font-semibold text-primary">{event.club_name || 'Club Event'}</p>
        <h2 className="mb-4 text-2xl font-bold text-text-primary">{event.title}</h2>

        {actions}
        {belowActions}

        <EventPaymentInfo event={event} />

        <div className="mb-6 flex-1 space-y-3">
          {event.start_time ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-[20px] text-text-secondary" aria-hidden="true">schedule</span>
              <div>
                <p className="font-medium text-text-primary dark:text-white">
                  {new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  {' - '}
                  {event.end_time ? new Date(event.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
                </p>
                <p className="text-xs text-text-secondary">
                  {event.end_time && event.start_time
                    ? `${Math.round((new Date(event.end_time) - new Date(event.start_time)) / 3600000)} hours`
                    : ''}
                </p>
              </div>
            </div>
          ) : null}

          {event.location ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-[20px] text-text-secondary" aria-hidden="true">location_on</span>
              <p className="font-medium text-text-primary dark:text-white">{event.location}</p>
            </div>
          ) : null}

          {showRsvpCount ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-[20px] text-text-secondary" aria-hidden="true">group</span>
              <p className="font-medium text-text-primary dark:text-white">{event.rsvp_count || 0} registered</p>
            </div>
          ) : null}

          {showRecentActivity && event.recent_activity > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="font-medium italic text-green-400">{event.recent_activity}+ registered in last hour</span>
            </div>
          ) : null}
        </div>

        {event.description ? (
          <p className="mb-4 whitespace-pre-wrap text-sm text-text-secondary">{event.description}</p>
        ) : null}

        {event.keywords ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {event.keywords.split(',').map((keyword, index) => (
              <span
                key={`${keyword}-${index}`}
                className="rounded-lg border border-border-subtle bg-gray-100 px-2.5 py-1 text-xs font-medium text-text-secondary dark:border-[#34485c] dark:bg-border-strong"
              >
                {keyword.trim()}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
