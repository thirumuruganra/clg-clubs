import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { EventPosterFallback } from '../ui/event-poster-fallback';

const formatEventDate = (iso) => {
  if (!iso) return { month: '', day: '' };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { month: '', day: '' };
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: date.getDate(),
  };
};

const StudentDashboardDiscoverItem = ({ event, onMoreInfo }) => {
  const { month, day } = formatEventDate(event.start_time);

  return (
    <Card interactive className="flex min-h-40 flex-col overflow-hidden border-border-subtle/90 bg-surface-panel/95 p-0 sm:flex-row">
      <div className="h-32 w-full overflow-hidden bg-background-dark sm:h-auto sm:w-1/3">
        {event.image_url ? (
          <img
            src={event.image_url}
            alt={`${event.title} poster`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <EventPosterFallback title={event.title} size="compact" />
        )}
      </div>
      <div className="flex w-full flex-col justify-between gap-3 p-4 sm:w-2/3">
        <div>
          <div className="flex items-start justify-between gap-2">
            <span className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">{event.club_name || 'Club'}</span>
            <span className="rounded bg-surface-muted px-2 py-0.5 text-xs font-semibold text-text-secondary dark:bg-border-strong dark:text-text-dark-secondary">{month} {day}</span>
          </div>
          <h3 className="text-lg font-bold leading-tight text-text-primary dark:text-white">{event.title}</h3>
          {event.location && (
            <div className="mt-2 flex items-center gap-1 text-text-secondary dark:text-text-dark-secondary">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              <span className="text-xs">{event.location}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end">
          <Button onClick={onMoreInfo} variant="secondary" size="sm" className="h-9">
            More Info
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default StudentDashboardDiscoverItem;
