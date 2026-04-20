import React from 'react';
import { Skeleton } from '../ui/skeleton';

const StudentDashboardEventCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-panel">
    <Skeleton className="h-36" />
    <div className="space-y-2 p-4">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  </div>
);

export default StudentDashboardEventCardSkeleton;
