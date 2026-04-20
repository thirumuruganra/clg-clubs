import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { EventPosterFallback } from '../ui/event-poster-fallback';
import { StatusBadge } from '../ui/status-badge';

const formatEventDate = (iso) => {
  if (!iso) return { month: '', day: '' };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { month: '', day: '' };
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
  };
};

const StudentDashboardEventCard = ({ event, pendingRsvpId, onToggleRsvp }) => {
  const { month, day } = formatEventDate(event.start_time);
  const isPending = pendingRsvpId === event.id;

  return (
    <Card interactive className="flex flex-col overflow-hidden border-border-subtle/90 bg-surface-panel/95 p-0">
      <div className="relative h-36 overflow-hidden bg-background-dark sm:h-40">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={`${event.title} poster`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <EventPosterFallback title={event.title} />
        )}
        <div className="absolute right-3 top-3 rounded-lg border border-white/15 bg-black/34 px-2 py-1 text-center backdrop-blur-sm">
          <p className="text-xs font-bold uppercase text-primary">{month}</p>
          <p className="text-lg font-bold text-white">{day}</p>
        </div>
        <div className="absolute bottom-3 left-3">
          <StatusBadge tone="info">{event.club_name || 'Club'}</StatusBadge>
        </div>
      </div>
      <CardContent className="flex flex-1 flex-col p-4">
        <CardHeader className="mb-2 block space-y-1">
          <CardTitle className="mb-0 text-base">{event.title}</CardTitle>
          <p className="line-clamp-2 text-sm text-text-secondary">{event.description}</p>
        </CardHeader>

        {event.keywords && (
          <div className="mb-2 flex flex-wrap gap-1">
            {event.keywords.split(',').slice(0, 4).map((keyword, index) => (
              <span key={`${event.id}-${index}`} className="rounded-full border border-border-subtle/80 bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                {keyword.trim()}
              </span>
            ))}
          </div>
        )}

        {event.is_paid && (
          <div className="mb-3 flex flex-col gap-1 rounded-lg border border-border-subtle bg-background-light p-2 text-xs dark:border-border-strong dark:bg-surface-panel">
            <div className="flex items-center gap-1 font-medium text-text-secondary dark:text-text-dark-secondary">
              <span className="material-symbols-outlined text-secondary">payments</span>
              <span>Registration Fee: {event.registration_fees || 'TBA'}</span>
            </div>
            {event.payment_link && (
              <a href={event.payment_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline" onClick={(eventObj) => eventObj.stopPropagation()}>
                <span className="material-symbols-outlined text-secondary">link</span>
                <span>Payment Link</span>
              </a>
            )}
          </div>
        )}

        <CardFooter className="mt-auto items-center justify-between px-0 pb-0">
          <div className="inline-flex items-center gap-1.5 text-text-secondary dark:text-text-dark-secondary">
            <span className="inline-flex size-4 items-center justify-center">
              <span className="material-symbols-outlined text-secondary leading-none">group</span>
            </span>
            <span className="text-xs font-semibold leading-none tracking-[0.01em]">{event.rsvp_count || 0} registered</span>
          </div>
          <Button
            onClick={() => onToggleRsvp(event.id, event.is_rsvped)}
            disabled={isPending}
            size="sm"
            variant={event.is_rsvped ? 'danger' : 'primary'}
          >
            {isPending ? 'Updating...' : event.is_rsvped ? 'Unregister' : 'Register'}
          </Button>
        </CardFooter>
      </CardContent>
    </Card>
  );
};

export default StudentDashboardEventCard;
