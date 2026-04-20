import React from 'react';
import { cn } from '../../lib/utils';

export function Label({ className, htmlFor, required = false, children }) {
  return (
    <label htmlFor={htmlFor} className={cn('text-sm font-medium text-text-primary', className)}>
      {children}
      {required ? <span className="ml-1 text-danger" aria-hidden="true">*</span> : null}
    </label>
  );
}
