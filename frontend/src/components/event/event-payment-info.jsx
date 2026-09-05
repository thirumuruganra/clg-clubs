import React from 'react';

// Registration-fee + payment-link + payment-QR block shown on paid events.
// Shared by every place an event's full detail is shown.
export function EventPaymentInfo({ event }) {
  if (!event?.is_paid) return null;

  return (
    <div className="mb-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-2.5 dark:border-orange-500/20 dark:bg-orange-500/5">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm font-bold leading-none text-orange-600 dark:text-orange-400">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">payments</span>
          Registration Fee
        </span>
        <span className="shrink-0 text-sm font-bold leading-none tabular-nums text-text-primary dark:text-white">{event.registration_fees || 'TBA'}</span>
      </div>
      {event.payment_link ? (
        <a href={event.payment_link} target="_blank" rel="noopener noreferrer" className="group mt-1.5 flex items-center gap-1.5 text-sm font-bold text-primary hover:underline">
          <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5" aria-hidden="true">open_in_new</span>
          Pay via link
        </a>
      ) : null}
      {event.payment_qr_url ? (
        <div className="mt-3 rounded-xl border border-orange-200/80 bg-white/85 p-3 dark:border-orange-500/20 dark:bg-[#0f1720]/55">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">Payment QR</span>
            <a href={event.payment_qr_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
              Open image
            </a>
          </div>
          <img src={event.payment_qr_url} alt={`${event.title} payment QR`} className="mt-2 w-full max-w-44 rounded-lg bg-white object-contain p-2" />
        </div>
      ) : null}
    </div>
  );
}
