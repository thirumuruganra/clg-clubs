import React from 'react';
import { cn } from '../../lib/utils';

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-surface-muted', className)} />;
}
