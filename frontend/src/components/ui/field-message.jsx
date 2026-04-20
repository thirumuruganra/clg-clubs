import React from 'react';
import { cn } from '../../lib/utils';

const tones = {
  neutral: 'text-text-secondary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
};

export function FieldMessage({ id, tone = 'neutral', children, className }) {
  if (!children) return null;

  const isError = tone === 'error';
  const politeAnnouncement = tone === 'success' || tone === 'warning';

  return (
    <p
      id={id}
      role={isError ? 'alert' : undefined}
      aria-live={isError ? 'assertive' : politeAnnouncement ? 'polite' : undefined}
      className={cn('text-xs leading-normal', tones[tone], className)}
    >
      {children}
    </p>
  );
}
