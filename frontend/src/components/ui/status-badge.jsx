import React from 'react';
import { cn } from '../../lib/utils';

const tones = {
  neutral: 'bg-surface-muted text-text-secondary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  info: 'bg-primary/15 text-primary',
};

export function StatusBadge({ tone = 'neutral', className, children }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}
