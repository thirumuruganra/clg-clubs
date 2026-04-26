import React from 'react';
import { EmptyState } from '../ui/empty-state';
import { Skeleton } from '../ui/skeleton';

const StudentDashboardActivityTracker = ({ loadingActivities, activities, onBrowseEvents }) => (
  <section className="mb-8 mt-10 enter-rise enter-delay-3">
    <div className="px-4 pb-4">
      <h2 className="section-title text-subheading">Student Activity Tracker</h2>
      <p className="mt-1 text-sm text-text-secondary dark:text-text-dark-secondary">Events you have attended.</p>
    </div>
    <div className="px-4">
      {loadingActivities ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon="timeline"
          title="No attended events yet"
          description="Participate in events to build activity history and points."
          actionLabel="Browse Events"
          onAction={onBrowseEvents}
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {activities.map((activity, index) => {
              const startDate = new Date(activity.start_time);
              const endDate = new Date(activity.end_time);
              const dateText = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const timeText = `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
              return (
                <article key={`${activity.event_name}-${index}`} className="rounded-xl border border-border-subtle bg-surface-panel p-4 shadow-soft-sm dark:border-border-strong dark:bg-surface-elevated">
                  <h3 className="text-sm font-bold text-text-primary dark:text-white">{activity.event_name}</h3>
                  <p className="mt-1 text-xs text-text-secondary dark:text-text-dark-secondary">{activity.club_name}</p>
                  <p className="mt-2 text-xs text-text-secondary dark:text-text-dark-secondary">{dateText}</p>
                  <p className="text-xs text-text-secondary dark:text-text-dark-secondary">{timeText}</p>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-border-subtle bg-surface-panel shadow-soft-sm dark:border-border-strong dark:bg-surface-elevated md:block">
            <table className="w-full min-w-160 text-left text-sm text-text-primary dark:text-white">
              <thead className="bg-surface-muted text-xs uppercase text-text-secondary dark:bg-border-strong dark:text-text-dark-secondary">
                <tr>
                  <th className="whitespace-nowrap px-3 py-3 md:px-6">Event Name</th>
                  <th className="whitespace-nowrap px-3 py-3 md:px-6">Club Name</th>
                  <th className="whitespace-nowrap px-3 py-3 md:px-6">Date</th>
                  <th className="whitespace-nowrap px-3 py-3 md:px-6">Start Time</th>
                  <th className="whitespace-nowrap px-3 py-3 md:px-6">End Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle border-t border-border-subtle dark:divide-border-strong dark:border-border-strong">
                {activities.map((activity, index) => {
                  const startDate = new Date(activity.start_time);
                  const endDate = new Date(activity.end_time);
                  const dateText = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  const startText = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  const endText = endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  return (
                    <tr key={`${activity.event_name}-${index}`} className="transition-colors hover:bg-surface-muted dark:hover:bg-surface-panel">
                      <td className="px-3 py-4 font-medium md:px-6">{activity.event_name}</td>
                      <td className="px-3 py-4 md:px-6">{activity.club_name}</td>
                      <td className="px-3 py-4 md:px-6">{dateText}</td>
                      <td className="px-3 py-4 md:px-6">{startText}</td>
                      <td className="px-3 py-4 md:px-6">{endText}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  </section>
);

export default StudentDashboardActivityTracker;
