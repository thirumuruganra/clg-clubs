import React from 'react';
import { cn } from '../../lib/utils';

export function Card({ className, elevated = false, interactive = false, children, ...props }) {
  return (
    <section
      className={cn(
        'bento-card',
        elevated && 'bento-card-elevated',
        interactive && 'bento-card-interactive',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function CardHeader({ className, children }) {
  return <header className={cn('mb-3 flex items-start justify-between gap-3', className)}>{children}</header>;
}

export function CardTitle({ className, children }) {
  return <h2 className={cn('text-lg font-semibold text-text-primary text-balance', className)}>{children}</h2>;
}

export function CardContent({ className, children }) {
  return <div className={cn('text-sm text-text-secondary text-pretty', className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <footer className={cn('mt-4 flex items-center gap-2', className)}>{children}</footer>;
}
