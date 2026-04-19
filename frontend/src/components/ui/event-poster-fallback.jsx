import React from 'react';
import { cn } from '../../lib/utils';

const SIZE_CLASS = {
  default: {
    wrapper: 'px-4 py-3',
    title: 'text-base',
    showLabel: true,
  },
  compact: {
    wrapper: 'px-3 py-2',
    title: 'text-sm',
    showLabel: true,
  },
  thumb: {
    wrapper: 'px-2 py-1.5',
    title: 'text-[9px]',
    showLabel: false,
  },
};

export function EventPosterFallback({ title, size = 'default', className }) {
  const resolved = SIZE_CLASS[size] || SIZE_CLASS.default;

  return (
    <div className={cn('flex h-full w-full items-center justify-center bg-[#0f1720] p-2 text-center text-white', className)}>
      <div className={cn('w-full rounded-lg border border-white/15 bg-black/20', resolved.wrapper)}>
        <p className={cn('line-clamp-3 text-balance font-black uppercase leading-tight', resolved.title)}>{title || 'Untitled Event'}</p>
        {resolved.showLabel ? <p className="mt-1 text-[10px] font-medium text-white/75">Poster unavailable</p> : null}
      </div>
    </div>
  );
}
