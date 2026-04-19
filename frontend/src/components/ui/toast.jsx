import React from 'react';
import { cn } from '../../lib/utils';

const tones = {
  neutral: 'border-border-subtle bg-surface-panel text-text-primary',
  success: 'border-success/30 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  error: 'border-danger/30 bg-danger/10 text-danger',
};

export function Toast({ tone = 'neutral', title, description, className }) {
  return (
    <div role="status" aria-live="polite" className={cn('w-full rounded-xl border p-3 shadow-soft-md', tones[tone], className)}>
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      {description ? <p className="mt-1 text-xs text-pretty">{description}</p> : null}
    </div>
  );
}
