import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

const DISMISS_MS = 3000;

export function ActionToast({ message, tone = 'success', className }) {
  const [prevMessage, setPrevMessage] = useState(message || null);
  const [visible, setVisible] = useState(false);

  if ((message || null) !== prevMessage) {
    setPrevMessage(message || null);
    setVisible(Boolean(message));
  }

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => setVisible(false), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, message]);

  if (!visible) return null;

  return (
    <div className={cn('fixed inset-x-0 bottom-4 z-1200 flex justify-center px-4 sm:bottom-6', className)}>
      <div className="enter-rise inline-flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full bg-white px-3.5 py-2 shadow-soft-lg">
        <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', tone === 'error' ? 'bg-red-500' : 'bg-emerald-500')}>
          <span className="material-symbols-outlined text-[13px] font-bold text-white">
            {tone === 'error' ? 'close' : 'check'}
          </span>
        </span>
        <p className="text-sm font-semibold text-slate-900">{message}</p>
      </div>
    </div>
  );
}
