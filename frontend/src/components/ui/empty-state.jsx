import React from 'react';
import { Button } from './button';

export function EmptyState({ icon = 'inbox', title, description, actionLabel, onAction }) {
  return (
    <div className="bento-card flex flex-col items-center gap-3 py-8 text-center">
      <span className="material-symbols-outlined text-[30px] text-text-secondary" aria-hidden="true">{icon}</span>
      <h3 className="text-lg font-semibold text-text-primary text-balance">{title}</h3>
      <p className="max-w-md text-sm text-text-secondary text-pretty">{description}</p>
      {actionLabel && onAction ? (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
