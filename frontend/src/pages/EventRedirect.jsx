import React, { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { Button } from '../components/ui/button';
import { EmptyState } from '../components/ui/empty-state';
import { EventPosterFallback } from '../components/ui/event-poster-fallback';
import { Skeleton } from '../components/ui/skeleton';

const API = '';

function GuestEventCard({ eventId }) {
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/events/${eventId}`);
        if (!res.ok) throw new Error('Event not found');
        const data = await res.json();
        if (!cancelled) {
          setEvent(data);
          setStatus('ready');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleLogin = () => {
    window.location.href = `/api/auth/login?next=${encodeURIComponent(`/event?id=${eventId}`)}`;
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 dark:bg-surface-panel">
      <div className="w-full max-w-3xl">
        {status === 'loading' ? (
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-2xl dark:border-border-strong dark:bg-[#1a2632] md:flex md:aspect-2/1">
            <Skeleton className="h-64 w-full rounded-none md:h-full md:w-2/5 md:shrink-0" />
            <div className="space-y-3 p-6 md:w-3/5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-11 w-full" />
            </div>
          </div>
        ) : null}

        {status === 'error' ? (
          <EmptyState
            icon="event_busy"
            title="Event not found"
            description="This event link is invalid or the event no longer exists."
          />
        ) : null}

        {status === 'ready' && event ? (
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-2xl dark:border-border-strong dark:bg-[#1a2632] md:flex-row">
            <div className="relative aspect-4/5 w-full overflow-hidden bg-[#0f1720] md:w-2/5 md:shrink-0">
              {event.image_url ? (
                <img src={event.image_url} alt={event.title} className="h-full w-full object-contain" />
              ) : (
                <EventPosterFallback title={event.title} />
              )}
            </div>

            <div className="w-full p-6 md:w-3/5">
              <span className="text-sm text-text-secondary">
                {event.start_time ? new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                {' • '}
                {event.start_time ? new Date(event.start_time).toLocaleDateString('en-US', { weekday: 'long' }) : ''}
              </span>

              <p className="mb-1 mt-2 text-sm font-semibold text-primary">{event.club_name || 'Club Event'}</p>
              <h1 className="mb-4 text-2xl font-bold text-text-primary">{event.title}</h1>

              <Button type="button" onClick={handleLogin} className="mb-4 w-full">
                Register
              </Button>

              {event.is_paid ? (
                <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 dark:border-orange-500/20 dark:bg-orange-500/5">
                  <div className="flex min-h-8 items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-sm font-bold leading-none text-orange-600 dark:text-orange-400">
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">payments</span>
                      Registration Fee
                    </span>
                    <span className="shrink-0 text-sm font-bold leading-none tabular-nums text-text-primary dark:text-white">{event.registration_fees || 'TBA'}</span>
                  </div>
                </div>
              ) : null}

              <div className="mb-6 space-y-3">
                {event.start_time ? (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-[20px] text-text-secondary" aria-hidden="true">schedule</span>
                    <div>
                      <p className="font-medium text-text-primary dark:text-white">
                        {new Date(event.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        {' - '}
                        {event.end_time ? new Date(event.end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''}
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
              </div>

              {event.description ? (
                <p className="mb-4 whitespace-pre-wrap text-sm text-text-secondary">{event.description}</p>
              ) : null}

              {event.keywords ? (
                <div className="flex flex-wrap gap-2">
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
        ) : null}
      </div>
    </div>
  );
}

const EventRedirect = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('id');

  if (!eventId) return <Navigate to="/" replace />;

  if (loading) return null;

  if (user) {
    const target = user.role === 'CLUB_ADMIN' || user.managed_club_id ? '/club/calendar' : '/student/calendar';
    return <Navigate to={`${target}?event=${eventId}`} replace />;
  }

  return <GuestEventCard eventId={eventId} />;
};

export default EventRedirect;
